import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import LaunchConfirmEmail from '@/emails/LaunchConfirmEmail'
import { createLaunchToken } from '@/lib/launch-token'
import { verifyRecaptcha } from '@/lib/recaptcha'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_LOCALES = new Set(['de', 'en'])

/* Time-gate: real users need at least this much time to mount the form,
   type an email, and submit. Bots POST instantly. */
const MIN_INTERACTION_MS = 1500

/* In-memory per-IP rate-limit. Won't survive across Cloud Run instances,
   but it kills sustained abuse from a single host between cold starts.
   Real protection comes from reCAPTCHA + honeypot. */
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1h
const RATE_LIMIT_MAX = 6
const ipHits = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const hits = (ipHits.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS)
  if (hits.length >= RATE_LIMIT_MAX) {
    ipHits.set(ip, hits)
    return true
  }
  hits.push(now)
  ipHits.set(ip, hits)
  // Periodic cleanup so the Map doesn't grow forever.
  if (ipHits.size > 10000) {
    for (const [k, v] of ipHits.entries()) {
      if (v.length === 0 || now - v[v.length - 1] > RATE_LIMIT_WINDOW_MS) ipHits.delete(k)
    }
  }
  return false
}

function resolveAppUrl(req: Request): string {
  const fwdHost = req.headers.get('x-forwarded-host')
  const fwdProto = req.headers.get('x-forwarded-proto') ?? 'https'
  const host = fwdHost ?? new URL(req.url).host
  return `${fwdProto}://${host}`
}

export async function POST(request: Request) {
  let body: { email?: string; locale?: string; hp?: string; mt?: number; rt?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  // ─── Honeypot — invisible field, only bots fill it ───────────────────
  if (typeof body.hp === 'string' && body.hp.trim().length > 0) {
    // Pretend success so bots don't learn the field is a trap.
    return NextResponse.json({ ok: true })
  }

  // ─── Time-gate — form must have been mounted ≥ MIN_INTERACTION_MS ────
  if (typeof body.mt !== 'number' || body.mt < MIN_INTERACTION_MS) {
    return NextResponse.json({ ok: true })
  }

  // ─── Per-IP rate limit ────────────────────────────────────────────────
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  // ─── Email + locale validation ────────────────────────────────────────
  const email = body.email?.trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }
  const locale: 'de' | 'en' =
    typeof body.locale === 'string' && VALID_LOCALES.has(body.locale)
      ? (body.locale as 'de' | 'en')
      : 'de'

  // ─── reCAPTCHA Enterprise (graceful skip if env not configured) ──────
  const recaptcha = await verifyRecaptcha({
    token: body.rt ?? '',
    expectedAction: 'launch_signup',
  })
  if (recaptcha.enabled && !recaptcha.ok) {
    console.warn('[launch-signup] recaptcha rejected', { reason: recaptcha.reason, score: 'score' in recaptcha ? recaptcha.score : undefined, ip })
    // Pretend success — don't tell bots they were caught.
    return NextResponse.json({ ok: true })
  }

  // ─── Env checks ───────────────────────────────────────────────────────
  const resendKey = process.env.RESEND_API_KEY
  const confirmSecret = process.env.LAUNCH_CONFIRM_SECRET

  if (!resendKey) {
    console.error('[launch-signup] missing RESEND_API_KEY')
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  }

  const resend = new Resend(resendKey)

  // ─── Branch A: LAUNCH_CONFIRM_SECRET present → Double-Opt-In flow ────
  if (confirmSecret) {
    const token = createLaunchToken({ email, locale, ts: Date.now() }, confirmSecret)
    const appUrl = resolveAppUrl(request)
    const confirmLink = `${appUrl}/${locale === 'en' ? 'en/' : ''}launch-confirm?token=${encodeURIComponent(token)}`

    try {
      const html = await render(LaunchConfirmEmail({ confirmLink, appUrl, locale }))
      const subject = locale === 'de'
        ? 'Bestätige deine E-Mail für den Eat This Launch'
        : 'Confirm your email for the Eat This launch'
      const text = locale === 'de'
        ? `Bestätige deine E-Mail-Adresse:\n${confirmLink}\n\nDer Link ist 7 Tage gültig.\n\nNicht angefordert? Ignoriere diese Mail.`
        : `Confirm your email address:\n${confirmLink}\n\nThe link is valid for 7 days.\n\nDidn’t sign up? Just ignore this email.`

      const result = await resend.emails.send({
        from: 'EAT THIS <noreply@eatthisdot.com>',
        to: email,
        subject,
        html,
        text,
        replyTo: 'hello@eatthisdot.com',
      })

      if (result.error) {
        console.error('[launch-signup:doi] resend error', result.error)
        return NextResponse.json({ error: 'send_failed' }, { status: 500 })
      }
      console.log('[launch-signup:doi] confirm-mail sent', { email, locale })
      return NextResponse.json({ ok: true })
    } catch (err) {
      console.error('[launch-signup:doi] threw', err)
      return NextResponse.json({ error: 'send_failed' }, { status: 500 })
    }
  }

  // ─── Branch B: LAUNCH_CONFIRM_SECRET absent → legacy direct-add ──────
  // Used during launch-phase rollout before the DOI secret is provisioned.
  // Bot-protection above still applies, but no confirmation step.
  const segmentDe = process.env.RESEND_LAUNCH_SEGMENT_DE || process.env.RESEND_LAUNCH_SEGMENT_ID
  const segmentEn = process.env.RESEND_LAUNCH_SEGMENT_EN
  const segmentId = locale === 'en' ? (segmentEn || segmentDe) : segmentDe
  if (!segmentId) {
    console.error('[launch-signup:direct] no segment configured for locale', { locale })
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  }

  try {
    const result = await resend.contacts.create({
      email,
      segments: [{ id: segmentId }],
      unsubscribed: false,
      properties: { locale, signupAt: new Date().toISOString() },
    })
    if (result.error) {
      console.error('[launch-signup:direct] resend error', result.error)
      return NextResponse.json({ error: 'storage_failed' }, { status: 500 })
    }
    console.log('[launch-signup:direct] subscribed', { email, locale })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[launch-signup:direct] threw', err)
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 })
  }
}
