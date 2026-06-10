import { NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase/admin'
import { getCachedMapData } from '@/lib/map/cached-sanity'
import { unlockMustEat } from '@/lib/firebase/unlockedMustEats.server'

export const dynamic    = 'force-dynamic'
export const revalidate = 0

// On-site reveal (50 m): persists the unlock and returns the full must-eat.
// The map payload ships covered cards stripped (see stripCoveredMustEats), so
// this is where a signed-in user first receives the dish content.
//
// The 50 m proximity can't be verified server-side (there is no trustworthy
// location signal), so — exactly like the direct client-side Firestore write
// this replaces — the gate is "signed-in user claims to stand at the spot".
// The win is that the content can no longer be bulk-read from the anonymous
// map payload; pulling it now requires an account and one call per card.
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

  const body = await req.json().catch(() => null)
  const mustEatId = typeof body?.mustEatId === 'string' ? body.mustEatId : null
  if (!mustEatId) {
    return NextResponse.json({ error: 'mustEatId required' }, { status: 400 })
  }

  const { mustEats } = await getCachedMapData()
  const mustEat = mustEats.find((m) => m._id === mustEatId)
  if (!mustEat) {
    return NextResponse.json({ error: 'unknown must-eat' }, { status: 404 })
  }

  await unlockMustEat(uid, mustEat)

  const res = NextResponse.json({ mustEat })
  res.headers.set('Cache-Control', 'private, no-store')
  return res
}
