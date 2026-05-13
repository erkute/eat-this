import { NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase/admin'
import {
  resolveEntitlements,
  isRestaurantVisible,
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

  let restaurants: typeof all
  let mustEats:    typeof allMustEats
  if (ent.isAdmin || ent.hasAllBerlin) {
    restaurants = all
    mustEats    = allMustEats
  } else {
    restaurants = all.filter((r) => isRestaurantVisible(r, ent))
    // Must-eat visibility derives from parent restaurant visibility — that
    // way category entitlements grant must-eats automatically (a user who
    // bought 'pizza' sees pizza restaurants AND their must-eats).
    const visibleRestaurantIds = new Set(restaurants.map((r) => r._id))
    mustEats = allMustEats.filter((m) => visibleRestaurantIds.has(m.restaurant._id))
  }

  const res = NextResponse.json({ restaurants, mustEats, categories })
  res.headers.set('Cache-Control', 'private, no-store')
  return res
}
