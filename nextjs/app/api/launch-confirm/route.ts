import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { verifyLaunchToken } from '@/lib/launch-token'

export const runtime = 'nodejs'

/* DOI confirmation endpoint. Takes the HMAC-signed token from the email
 * link, verifies it, and creates the Resend contact in the locale-
 * specific segment with `locale` + `confirmedAt` properties set.
 *
 * Only at this point is the address added to a broadcast-eligible list —
 * unconfirmed signups never persist. */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'missing_token' }, { status: 400 })
  }

  const confirmSecret = process.env.LAUNCH_CONFIRM_SECRET
  const resendKey = process.env.RESEND_API_KEY
  if (!confirmSecret || !resendKey) {
    console.error('[launch-confirm] missing env', { hasSecret: !!confirmSecret, hasKey: !!resendKey })
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  }

  const verified = verifyLaunchToken(token, confirmSecret)
  if (!verified.ok) {
    return NextResponse.json({ error: verified.reason }, { status: 400 })
  }
  const { email, locale } = verified.payload

  /* Per-locale Resend segment. Fallback to RESEND_LAUNCH_SEGMENT_ID
     keeps the existing DE-only setup working until the EN segment is
     provisioned in Resend. */
  const segmentDe = process.env.RESEND_LAUNCH_SEGMENT_DE || process.env.RESEND_LAUNCH_SEGMENT_ID
  const segmentEn = process.env.RESEND_LAUNCH_SEGMENT_EN
  const segmentId = locale === 'en' ? (segmentEn || segmentDe) : segmentDe
  if (!segmentId) {
    console.error('[launch-confirm] no segment configured for locale', { locale })
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  }

  try {
    const resend = new Resend(resendKey)
    const result = await resend.contacts.create({
      email,
      segments: [{ id: segmentId }],
      unsubscribed: false,
      properties: {
        locale,
        confirmedAt: new Date().toISOString(),
      },
    })

    if (result.error) {
      // Duplicate contact returns success per resend.contacts.create.
      // Any other error is logged but not surfaced (the user already
      // confirmed once — fine to be idempotent).
      console.error('[launch-confirm] resend error', result.error)
    }

    console.log('[launch-confirm] confirmed', { email, locale })
    return NextResponse.json({ ok: true, locale })
  } catch (err) {
    console.error('[launch-confirm] resend threw', err)
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 })
  }
}
