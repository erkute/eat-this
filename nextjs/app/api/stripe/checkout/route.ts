import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin'
import { getStripe } from '@/lib/stripe'
import { resolvePriceId } from '@/lib/stripe-price'
import { getPack } from '@/lib/stripe-catalog'
import { getAppUrl } from '@/lib/constants'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

interface Body { packId?: string; locale?: 'de' | 'en' }

// Two-mode checkout:
//   - authed:  Bearer token → uid + email known, already-owned check, success
//              page lands on /checkout/success (same as guests).
//   - guest:   no Bearer → Stripe collects email on the Hosted Checkout
//              page itself, the webhook later resolves email → uid via
//              findOrCreateUserByEmail and mails a magic-link.
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  let uid: string | null = null
  let email: string | null = null
  if (token) {
    try {
      const decoded = await getAdminAuth().verifyIdToken(token)
      uid   = decoded.uid
      email = decoded.email ?? null
    } catch {
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
    }
  }

  const body = (await req.json().catch(() => ({}))) as Body
  if (!body.packId) return NextResponse.json({ error: 'missing_packId' }, { status: 400 })
  const pack = getPack(body.packId)
  if (!pack) return NextResponse.json({ error: 'unknown_packId' }, { status: 400 })
  const locale: 'de' | 'en' = body.locale === 'en' ? 'en' : 'de'

  // Already-owned check only applies to logged-in users. Guests can't be
  // checked because their account doesn't exist yet — the webhook will
  // surface duplicates via Stripe's payment record.
  if (uid) {
    const userEnts = getAdminFirestore().collection('users').doc(uid).collection('entitlements')
    const [literalSnap, allBerlinSnap] = await Promise.all([
      userEnts.doc(pack.packId).get(),
      pack.type === 'category' ? userEnts.doc('all-berlin').get() : Promise.resolve({ exists: false }),
    ])
    if (literalSnap.exists || (allBerlinSnap as { exists: boolean }).exists) {
      return NextResponse.json({ error: 'already_owned' }, { status: 409 })
    }
  }

  const origin = getAppUrl()

  const mode = uid ? 'auth' : 'guest'
  const successPath = locale === 'en'
    ? `/en/checkout/success?session_id={CHECKOUT_SESSION_ID}&pack=${pack.packId}`
    : `/checkout/success?session_id={CHECKOUT_SESSION_ID}&pack=${pack.packId}`
  // Guests cancel back to home; auth users return to the packs overview.
  const cancelPath  = mode === 'auth'
    ? (locale === 'en' ? '/en/packs' : '/packs')
    : (locale === 'en' ? '/en' : '/')

  let session
  try {
    session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      // Live mode uses the catalog ID directly; test mode (staging/local)
      // resolves the seeded test price via lookup_key — see lib/stripe-price.ts.
      line_items: [{ price: await resolvePriceId(pack), quantity: 1 }],
      // Methods (card, PayPal, Link, Apple/Google Pay, Klarna, …) are
      // driven by the Stripe Dashboard. For guests we omit customer_email
      // so Stripe Hosted Checkout collects it on the form itself.
      customer_email: email ?? undefined,
      metadata: {
        uid: uid ?? '',
        packId: pack.packId,
        type: pack.type,
        slug: pack.slug ?? '',
        mode,
        locale,
      },
      success_url: `${origin}${successPath}`,
      cancel_url:  `${origin}${cancelPath}`,
      locale,
      automatic_tax: { enabled: false },
    })
  } catch (err) {
    Sentry.captureException(err, { extra: { uid, packId: pack.packId, mode } })
    return NextResponse.json({ error: 'stripe_error', message: (err as Error).message }, { status: 500 })
  }

  return NextResponse.json({ url: session.url }, { status: 200 })
}
