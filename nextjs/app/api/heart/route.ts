import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin'
import { checkRateLimit } from '@/lib/buddy/rateLimit'
import { getCachedMapData } from '@/lib/map/cached-sanity'

export const dynamic    = 'force-dynamic'
export const revalidate = 0

const num = (v: string | undefined, d: number) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : d
}

interface HeartBody {
  restaurantId?: unknown
  action?: unknown
}

// Heart toggle — the single writer of both the per-user heart
// (users/{uid}/favorites/{restaurantId}) and the public aggregate
// (restaurants/{restaurantId}.heartCount). Both move in ONE transaction, gated
// on whether the user already hearts the spot, so the count tracks exactly the
// distinct (user, restaurant) hearts: one account contributes at most +1, and a
// retried or duplicate toggle can't drift the counter.
//
// This replaces the removed onHeartCreated/onHeartDeleted Cloud Functions — the
// whole functions/ layer was dropped in the clean-architecture reset, so the
// counter is now maintained server-side via the Admin SDK, exactly like
// /api/must-eat-reveal and /api/referral/confirm. firestore.rules keep
// restaurants/{id} server-only writable, so the client can't touch the count
// directly. See docs/specs/2026-06-09-hearts-design.md.
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return NextResponse.json({ error: 'auth required' }, { status: 401 })
  }

  let uid: string
  try {
    uid = (await getAdminAuth().verifyIdToken(token)).uid
  } catch {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 })
  }

  // Per-uid rate limit: a normal user hearts a handful of spots; only a script
  // loops. Generous so it never bites real use.
  const limit = await checkRateLimit(`heart:${uid}`, {
    perMinute: num(process.env.HEART_LIMIT_PER_MIN, 30),
    perDay: num(process.env.HEART_LIMIT_PER_DAY, 300),
  })
  if (!limit.allowed) {
    return NextResponse.json({ error: 'rate_limited', reason: limit.reason }, { status: 429 })
  }

  const body = (await req.json().catch(() => null)) as HeartBody | null
  const restaurantId = typeof body?.restaurantId === 'string' && body.restaurantId ? body.restaurantId : null
  const action = body?.action === 'add' || body?.action === 'remove' ? body.action : null
  if (!restaurantId || !action) {
    return NextResponse.json({ error: 'restaurantId and action required' }, { status: 400 })
  }

  const { restaurants } = await getCachedMapData()
  const restaurant = restaurants.find((r) => r._id === restaurantId)
  if (!restaurant) {
    return NextResponse.json({ error: 'unknown_restaurant' }, { status: 404 })
  }

  const db       = getAdminFirestore()
  const favRef   = db.doc(`users/${uid}/favorites/${restaurantId}`)
  const countRef = db.doc(`restaurants/${restaurantId}`)

  const hearted = await db.runTransaction(async (tx) => {
    const exists = (await tx.get(favRef)).exists
    if (action === 'add') {
      if (exists) return true // idempotent — already hearted, count untouched
      tx.set(favRef, {
        name:     restaurant.name,
        slug:     restaurant.slug,
        photo:    restaurant.photo ?? '',
        district: restaurant.bezirk?.name ?? restaurant.district ?? '',
        savedAt:  FieldValue.serverTimestamp(),
      })
      tx.set(countRef, {
        heartCount:          FieldValue.increment(1),
        heartCountUpdatedAt: FieldValue.serverTimestamp(),
      }, { merge: true })
      return true
    }
    if (!exists) return false // idempotent — nothing to remove
    tx.delete(favRef)
    tx.set(countRef, {
      heartCount:          FieldValue.increment(-1),
      heartCountUpdatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
    return false
  })

  const res = NextResponse.json({ hearted })
  res.headers.set('Cache-Control', 'private, no-store')
  return res
}
