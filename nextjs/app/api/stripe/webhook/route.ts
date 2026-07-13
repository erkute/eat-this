import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import {
  assembleAndWriteEntitlement,
  findOrCreateUserByEmail,
  markGuestMagicLinkSent,
  type FulfillmentResult,
} from '@/lib/stripe-fulfill'
import {
  CheckoutSessionIntegrityError,
  paymentIntentId,
  retrieveVerifiedCheckoutSession,
} from '@/lib/stripe-session'
import { sendMagicLinkEmail } from '@/lib/auth/sendMagicLink'
import { getAppUrl } from '@/lib/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// After fulfilling a guest purchase we email the buyer a magic link so they
// can sign in and access their freshly-attached entitlement. We call the
// shared sender DIRECTLY (not the public /api/auth/send-magic-link route) so
// this trusted, Stripe-signature-verified path isn't subject to the route's
// shared-IP rate limit. Delivery failures throw so Stripe retries until the
// session-scoped email outbox marker has been persisted.
async function triggerGuestMagicLink(
  email: string,
  locale: 'de' | 'en',
  stripeSessionId: string,
) {
  const origin = getAppUrl()
  const continueUrl = locale === 'en' ? `${origin}/en/profile` : `${origin}/profile`

  const result = await sendMagicLinkEmail({
    email,
    continueUrl,
    appUrl: origin,
    idempotencyKey: `stripe-guest-magic-link/${stripeSessionId}`,
  })
  if (!result.ok) {
    throw new Error(`webhook magic-link send failed: ${result.error}`)
  }
}

async function refundDuplicateSession(
  session: Stripe.Checkout.Session,
  result: Extract<FulfillmentResult, { status: 'exists' }>,
) {
  const paymentIntent = paymentIntentId(session)
  if (!paymentIntent) {
    throw new Error(`duplicate paid session has no payment intent: ${session.id}`)
  }

  await getStripe().refunds.create(
    {
      payment_intent: paymentIntent,
      reason: 'duplicate',
      metadata: {
        reason: 'duplicate_entitlement',
        checkoutSessionId: session.id,
        existingPackId: result.existingPackId,
      },
    },
    { idempotencyKey: `duplicate-entitlement-refund:${session.id}` },
  )
  Sentry.captureMessage(`Duplicate Stripe purchase refunded: ${session.id}`, 'warning')
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

  const eventSession = event.data.object as Stripe.Checkout.Session
  let verified
  try {
    verified = await retrieveVerifiedCheckoutSession(eventSession.id)
  } catch (err) {
    if (err instanceof CheckoutSessionIntegrityError) {
      Sentry.captureMessage(
        `Rejected Stripe Checkout session ${eventSession.id}: ${err.reason}`,
        'error',
      )
      return NextResponse.json(
        { received: true, rejected: 'session_integrity' },
        { status: 200 },
      )
    }
    Sentry.captureException(err, { extra: { event: event.id, sessionId: eventSession.id } })
    return NextResponse.json({ error: 'session_retrieval_failed' }, { status: 500 })
  }
  const { session, pack, mode, locale } = verified

  // Async methods (Klarna, SEPA) fire checkout.session.completed while the
  // money hasn't cleared yet (payment_status: 'unpaid'). Fulfilling here
  // would hand out the entitlement for a payment that can still fail —
  // wait for checkout.session.async_payment_succeeded instead.
  if (session.payment_status !== 'paid') {
    return NextResponse.json(
      { received: true, pending: session.payment_status },
      { status: 200 },
    )
  }

  // Resolve uid. Authed flow: metadata.uid is set at session creation.
  // Guest flow: pull the email Stripe collected and find-or-create the
  // Firebase Auth shell account.
  let uid = verified.uid
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
      packId:          pack.packId,
      stripeSessionId: session.id,
    })

    // Same-session retries are a normal Stripe delivery pattern. A different
    // paid session for an already-covered entitlement is a real duplicate
    // charge, so refund it in full with a session-scoped idempotency key.
    if (
      result.status === 'exists' &&
      result.existingStripeSessionId !== session.id
    ) {
      await refundDuplicateSession(session, result)
      return NextResponse.json(
        { received: true, result: 'duplicate_refunded' },
        { status: 200 },
      )
    }

    // Retry a guest email until both Resend and the entitlement outbox marker
    // succeed. Resend's session-scoped idempotency key prevents duplicates;
    // the persisted marker also suppresses Stripe retries after its 24h key
    // retention window.
    const guestMailPending = result.status === 'created' || (
      result.existingStripeSessionId === session.id && !result.guestMagicLinkSent
    )
    if (guestMailPending && mode === 'guest' && guestEmail) {
      await triggerGuestMagicLink(guestEmail, locale, session.id)
      await markGuestMagicLinkSent({
        uid,
        packId: pack.packId,
        stripeSessionId: session.id,
      })
    }

    return NextResponse.json({ received: true, result: result.status }, { status: 200 })
  } catch (err) {
    Sentry.captureException(err, {
      extra: { event: event.id, packId: pack.packId, sessionId: session.id, mode },
    })
    return NextResponse.json({ error: 'fulfill_failed', message: (err as Error).message }, { status: 500 })
  }
}
