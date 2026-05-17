import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { assembleAndWriteEntitlement, findOrCreateUserByEmail } from '@/lib/stripe-fulfill'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// After fulfilling a guest purchase we trigger the existing magic-link
// route so the buyer can sign in and access their freshly-attached
// entitlement. Fire-and-forget — webhook must return 2xx fast.
async function triggerGuestMagicLink(req: Request, email: string, locale: 'de' | 'en') {
  const host  = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  if (!host) return
  const origin = `${proto}://${host}`
  const continueUrl = locale === 'en' ? `${origin}/en/profile` : `${origin}/profile`

  try {
    await fetch(`${origin}/api/auth/send-magic-link`, {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({ email, locale, continueUrl }),
    })
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

  if (event.type !== 'checkout.session.completed') {
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
      void triggerGuestMagicLink(req, guestEmail, meta.locale === 'en' ? 'en' : 'de')
    }

    return NextResponse.json({ received: true, result }, { status: 200 })
  } catch (err) {
    Sentry.captureException(err, { extra: { event: event.id, meta } })
    return NextResponse.json({ error: 'fulfill_failed', message: (err as Error).message }, { status: 500 })
  }
}
