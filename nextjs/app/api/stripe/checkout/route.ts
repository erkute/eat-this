import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin'
import { getStripe } from '@/lib/stripe'
import { getPack } from '@/lib/stripe-catalog'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

interface Body { packId?: string; locale?: 'de' | 'en' }

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let uid: string; let email: string | null
  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    uid   = decoded.uid
    email = decoded.email ?? null
  } catch {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as Body
  if (!body.packId) return NextResponse.json({ error: 'missing_packId' }, { status: 400 })
  const pack = getPack(body.packId)
  if (!pack) return NextResponse.json({ error: 'unknown_packId' }, { status: 400 })
  const locale: 'de' | 'en' = body.locale === 'en' ? 'en' : 'de'

  const entRef = getAdminFirestore()
    .collection('users').doc(uid)
    .collection('entitlements').doc(pack.packId)
  const entSnap = await entRef.get()
  if (entSnap.exists) return NextResponse.json({ error: 'already_owned' }, { status: 409 })

  const origin = new URL(req.url).origin
  const successPath = locale === 'en'
    ? `/en/onboarding/purchase?session_id={CHECKOUT_SESSION_ID}&pack=${pack.packId}`
    : `/onboarding/purchase?session_id={CHECKOUT_SESSION_ID}&pack=${pack.packId}`
  // Hash drops the user back on the Booster tab (default profile lands on Deck).
  const cancelPath  = locale === 'en' ? '/en/profile?booster=canceled#booster' : '/profile?booster=canceled#booster'

  let session
  try {
    session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: pack.stripePriceId, quantity: 1 }],
      payment_method_types: ['card', 'paypal'] as any,
      customer_email: email ?? undefined,
      metadata: { uid, packId: pack.packId, type: pack.type, slug: pack.slug ?? '' },
      success_url: `${origin}${successPath}`,
      cancel_url:  `${origin}${cancelPath}`,
      locale,
      automatic_tax: { enabled: false },
    })
  } catch (err) {
    Sentry.captureException(err, { extra: { uid, packId: pack.packId } })
    return NextResponse.json({ error: 'stripe_error', message: (err as Error).message }, { status: 500 })
  }

  return NextResponse.json({ url: session.url }, { status: 200 })
}
