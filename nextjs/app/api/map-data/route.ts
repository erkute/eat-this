import { NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase/admin'
import {
  resolveEntitlements,
  isRestaurantVisible,
  isMustEatVisible,
} from '@/lib/firebase/entitlements'
import { getCachedMapData } from '@/lib/map/cached-sanity'

// Per-user response. Disable any framework-level caching; we share the
// expensive Sanity fetch via the module-level cache in cached-sanity.ts.
export const dynamic   = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  let uid:   string | null = null
  let email: string | null = null
  if (token) {
    try {
      const decoded = await getAdminAuth().verifyIdToken(token)
      uid   = decoded.uid
      email = decoded.email ?? null
    } catch {
      // Expired or invalid token → treat as anonymous. Client retries
      // after the Firebase SDK refreshes the token.
    }
  }

  const ent = await resolveEntitlements(uid, email)
  const { restaurants: all, mustEats: allMustEats, categories } = await getCachedMapData()

  const restaurants = (ent.isAdmin || ent.hasAllBerlin)
    ? all
    : all.filter((r) => isRestaurantVisible(r, ent))
  const mustEats = (ent.isAdmin || ent.hasAllBerlin)
    ? allMustEats
    : allMustEats.filter((m) => isMustEatVisible(m, ent))

  const res = NextResponse.json({ restaurants, mustEats, categories })
  res.headers.set('Cache-Control', 'private, no-store')
  return res
}
