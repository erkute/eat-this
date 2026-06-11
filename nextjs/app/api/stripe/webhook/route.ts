import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { assembleAndWriteEntitlement, findOrCreateUserByEmail } from '@/lib/stripe-fulfill'
import { sendMagicLinkEmail } from '@/lib/auth/sendMagicLink'
import { getAppUrl } from '@/lib/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// After fulfilling a guest purchase we email the buyer a magic link so they
// can sign in and access their freshly-attached entitlement. We call the
// shared sender DIRECTLY (not the public /api/auth/send-magic-link route) so
// this trusted, Stripe-signature-verified path isn't subject to the route's
// shared-IP rate limit. Delivery errors are caught here so they don't make
// Stripe retry an otherwise fulfilled purchase.
async function triggerGuestMagicLink(email: string, locale: 'de' | 'en') {
  const origin = getAppUrl()
  const continueUrl = locale === 'en' ? `${origin}/en/profile` : `${origin}/profile`

  try {
    const result = await sendMagicLinkEmail({ email, continueUrl, appUrl: origin })
    if (!result.ok) {
      Sentry.captureMessage(`webhook magic-link send failed: ${result.error}`, 'error')
    }
  } catch (err) {
    Sentry.captureException(err, { extra: { email, source: 'webhook-magic-link' } })
  }
}

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'no_signature' }, { status: 400 })

  // RAW body — must not be parsed before signature verification.
  const body = await req.text()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    Sentry.captureMessage('STRIPE_WEBHOOK_SECRET missing', 'error')
    return NextResponse.json({ error: 'secret_missing' }, { status: 500 })
  }

  let event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret)
  } catch {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  if (
    event.type !== 'checkout.session.completed' &&
    event.type !== 'checkout.session.async_payment_succeeded'
  ) {
    return NextResponse.json({ received: true, ignored: event.type }, { status: 200 })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const meta    = (session.metadata ?? {}) as {
    uid?: string
    packId?: string
    mode?: 'auth' | 'guest'
    locale?: 'de' | 'en'
  }
  if (!meta.packId) {
    Sentry.captureMessage(`webhook missing packId: ${event.id}`, 'error')
    return NextResponse.json({ error: 'missing_packId' }, { status: 400 })
  }

  // Async methods (Klarna, SEPA) fire checkout.session.completed while the
  // money hasn't cleared yet (payment_status: 'unpaid'). Fulfilling here
  // would hand out the entitlement for a payment that can still fail —
  // wait for checkout.session.async_payment_succeeded instead (the polling
  // fallback in /api/stripe/fulfill applies the same gate).
  if (session.payment_status !== 'paid') {
    return NextResponse.json(
      { received: true, pending: session.payment_status },
      { status: 200 },
    )
  }

  // Resolve uid. Authed flow: metadata.uid is set at session creation.
  // Guest flow: pull the email Stripe collected and find-or-create the
  // Firebase Auth shell account.
  let uid = meta.uid && meta.uid.length > 0 ? meta.uid : null
  const guestEmail = session.customer_details?.email ?? null
  if (!uid) {
    if (!guestEmail) {
      Sentry.captureMessage(`guest webhook missing email: ${event.id}`, 'error')
      return NextResponse.json({ error: 'missing_email' }, { status: 400 })
    }
    try {
      uid = await findOrCreateUserByEmail(guestEmail)
    } catch (err) {
      Sentry.captureException(err, { extra: { event: event.id, email: guestEmail } })
      return NextResponse.json({ error: 'user_provision_failed' }, { status: 500 })
    }
  }

  try {
    const result = await assembleAndWriteEntitlement({
      uid,
      packId:          meta.packId,
      stripeSessionId: session.id,
    })

    // Mail the magic-link only for guest purchases — authed users already
    // have a session and will see the entitlement next page-load.
    if (meta.mode === 'guest' && guestEmail) {
      await triggerGuestMagicLink(guestEmail, meta.locale === 'en' ? 'en' : 'de')
    }

    return NextResponse.json({ received: true, result }, { status: 200 })
  } catch (err) {
    Sentry.captureException(err, { extra: { event: event.id, meta } })
    return NextResponse.json({ error: 'fulfill_failed', message: (err as Error).message }, { status: 500 })
  }
}
