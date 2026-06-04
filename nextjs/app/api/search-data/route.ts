import { NextResponse } from 'next/server'
import { client } from '@/lib/sanity'
import { allNewsArticlesQuery } from '@/lib/queries'
import { getAdminAuth } from '@/lib/firebase/admin'
import { resolveEntitlements, isRestaurantVisible } from '@/lib/firebase/entitlements'
import { getCachedMapData } from '@/lib/map/cached-sanity'

// Per-user response. Entitlement-gated mirror of /api/map-data — search
// visibility tracks map visibility so the overlay doesn't expose the
// catalog. News are always fully searchable (content marketing, not
// paywall material).
export const dynamic    = 'force-dynamic'
export const revalidate = 0

// Trial cap for anon / no-entitlement users. Matches TRIAL_SAMPLE_SIZE in
// /api/map-data so search and map agree on the free-tier set.
const TRIAL_SAMPLE_SIZE = 20

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  let uid: string | null = null
  let identity: Parameters<typeof resolveEntitlements>[1] = {}
  if (token) {
    try {
      const decoded = await getAdminAuth().verifyIdToken(token)
      uid = decoded.uid
      identity = {
        email:         decoded.email ?? null,
        emailVerified: decoded.email_verified === true,
        admin:         decoded.admin === true,
      }
    } catch {
      // Expired / invalid → treat as anonymous; client retries after token refresh.
    }
  }

  const ent = await resolveEntitlements(uid, identity)
  const { restaurants: all, mustEats: allMustEats } = await getCachedMapData()
  const news = await client.fetch(allNewsArticlesQuery)

  let restaurants: typeof all
  if (ent.isAdmin || ent.hasAllBerlin) {
    restaurants = all
  } else if (ent.categorySlugs.size > 0 || ent.restaurantIds.size > 0 || ent.mustEatIds.size > 0) {
    restaurants = all.filter((r) => isRestaurantVisible(r, ent))
  } else {
    // Free trial set — same deterministic top-20-by-mustEatCount slice that
    // /api/map-data exposes to anonymous visitors. Search returns the same
    // restaurants the user can actually see on the map.
    const mustEatCountByRestaurant = new Map<string, number>()
    for (const m of allMustEats) {
      const id = m.restaurant._id
      mustEatCountByRestaurant.set(id, (mustEatCountByRestaurant.get(id) ?? 0) + 1)
    }
    const eligible = all.filter((r) => (mustEatCountByRestaurant.get(r._id) ?? 0) > 0)
    eligible.sort((a, b) => {
      const ac = mustEatCountByRestaurant.get(a._id) ?? 0
      const bc = mustEatCountByRestaurant.get(b._id) ?? 0
      if (ac !== bc) return bc - ac
      return a._id.localeCompare(b._id)
    })
    restaurants = eligible.slice(0, TRIAL_SAMPLE_SIZE)
  }

  const res = NextResponse.json({ restaurants, news })
  res.headers.set('Cache-Control', 'private, no-store')
  return res
}
