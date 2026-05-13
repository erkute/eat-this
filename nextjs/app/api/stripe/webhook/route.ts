import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { getStripe } from '@/lib/stripe'
import { assembleAndWriteEntitlement } from '@/lib/stripe-fulfill'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

  const session = event.data.object as any
  const meta    = (session?.metadata ?? {}) as { uid?: string; packId?: string }
  if (!meta.uid || !meta.packId) {
    Sentry.captureMessage(`webhook missing metadata: ${event.id}`, 'error')
    return NextResponse.json({ error: 'missing_metadata' }, { status: 400 })
  }

  try {
    const result = await assembleAndWriteEntitlement({
      uid:             meta.uid,
      packId:          meta.packId,
      stripeSessionId: session.id,
    })
    return NextResponse.json({ received: true, result }, { status: 200 })
  } catch (err) {
    Sentry.captureException(err, { extra: { event: event.id, meta } })
    return NextResponse.json({ error: 'fulfill_failed', message: (err as Error).message }, { status: 500 })
  }
}
