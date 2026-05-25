import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_LOCALES = new Set(['de', 'en'])

export async function POST(request: Request) {
  let body: { email?: string; locale?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }

  const locale = typeof body.locale === 'string' && VALID_LOCALES.has(body.locale) ? body.locale : 'de'

  const resendKey = process.env.RESEND_API_KEY
  const segmentId = process.env.RESEND_LAUNCH_SEGMENT_ID

  if (!resendKey || !segmentId) {
    console.error('[launch-signup] missing env:', {
      hasKey: !!resendKey,
      hasSegment: !!segmentId,
    })
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  }

  try {
    const resend = new Resend(resendKey)
    const result = await resend.contacts.create({
      email,
      segments: [{ id: segmentId }],
      unsubscribed: false,
    })

    // Resend returns `{ id }` on success or `{ error }` on failure. A duplicate
    // contact is treated as success (the response is still 200) so we don't
    // need a separate already_subscribed branch.
    if (result.error) {
      console.error('[launch-signup] resend error:', result.error)
      return NextResponse.json({ error: 'storage_failed' }, { status: 500 })
    }

    console.log('[launch-signup] subscribed:', { email, locale })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[launch-signup] resend threw:', err)
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 })
  }
}
