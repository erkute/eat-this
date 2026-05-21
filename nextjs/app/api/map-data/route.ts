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

// Trial-mode cap. Users with no paid entitlements (anonymous visitors,
// signed-up freebies, guest-flow anon-auth users) see this many sample
// spots — those they pulled in their welcome pack if it exists, else
// a deterministic top-20 by `order`. Monetisation later expands this
// per paid pack.
const TRIAL_SAMPLE_SIZE = 20

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

  let restaurants:       typeof all
  let mustEats:          typeof allMustEats
  // Restaurants visible-but-not-accessible — rendered as blurred preview
  // rows in the list with a lock affordance, so anon visitors see the
  // catalog has depth (not just a short curated 20). Empty for paid users.
  let lockedRestaurants: typeof all = []
  if (ent.isAdmin || ent.hasAllBerlin) {
    restaurants = all
    mustEats    = allMustEats
  } else if (ent.categorySlugs.size > 0 || ent.restaurantIds.size > 0 || ent.mustEatIds.size > 0) {
    restaurants = all.filter((r) => isRestaurantVisible(r, ent))
    // Must-eat visibility derives from parent restaurant visibility — that
    // way category entitlements grant must-eats automatically (a user who
    // bought 'pizza' sees pizza restaurants AND their must-eats).
    const visibleRestaurantIds = new Set(restaurants.map((r) => r._id))
    mustEats = allMustEats.filter((m) => visibleRestaurantIds.has(m.restaurant._id))
    // Partial-entitlement users still get a locked-preview of the rest of
    // the catalog so the upsell to All-Berlin stays visible in-context.
    lockedRestaurants = all.filter((r) => !visibleRestaurantIds.has(r._id))
  } else {
    // Free-and-open trial: 20 restaurants that carry at least one
    // must-eat, plus ALL their must-eats. Same set for every visitor
    // (no auth, no per-user pack). Deterministic ordering = highest
    // must-eat count first, then _id asc as a stable tiebreaker.
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
    const trialIdSet = new Set(restaurants.map((r) => r._id))
    mustEats = allMustEats.filter((m) => trialIdSet.has(m.restaurant._id))
    // The rest of the catalog → locked preview rows in the list.
    lockedRestaurants = all.filter((r) => !trialIdSet.has(r._id))
  }

  // totalCount = ALL restaurants in Sanity, unbothered by trial-cap or
  // entitlement filtering. Surfaced so the sheet-count-mini can communicate
  // catalog size („172 SPOTS in Berlin") regardless of what the viewer can
  // currently unlock.
  const res = NextResponse.json({
    restaurants,
    mustEats,
    categories,
    totalCount: all.length,
    lockedRestaurants,
  })
  res.headers.set('Cache-Control', 'private, no-store')
  return res
}
