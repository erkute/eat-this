import { NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase/admin'
import {
  resolveEntitlements,
  isRestaurantVisible,
} from '@/lib/firebase/entitlements'
import { getCachedMapData } from '@/lib/map/cached-sanity'
import {
  composeAnonRestaurants,
  composeSignedRestaurants,
  composeRevealedMustEats,
} from '@/lib/map/tier-composition'

// Per-user response. Disable framework-level caching; the expensive Sanity
// fetch is shared via the module-level cache in cached-sanity.ts.
export const dynamic    = 'force-dynamic'
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
      // Expired/invalid token → treat as anonymous.
    }
  }

  const ent = await resolveEntitlements(uid, email)
  const { restaurants: all, mustEats: allMustEats, categories } = await getCachedMapData()

  // Precompute must-eat counts (shared across tier composers + visibility predicates).
  const mustEatCountByRestaurant = new Map<string, number>()
  for (const m of allMustEats) {
    const rid = m.restaurant._id
    mustEatCountByRestaurant.set(rid, (mustEatCountByRestaurant.get(rid) ?? 0) + 1)
  }

  // Admin / all-berlin: full catalog, no filter, no reveal signal (signed
  // & paid users get individual reveals via Firestore unlockedMustEats).
  if (ent.isAdmin || ent.hasAllBerlin) {
    const res = NextResponse.json({
      restaurants: all,
      mustEats: allMustEats,
      categories,
      totalCount: all.length,
      lockedRestaurants: [],
      revealedMustEatIds: [],
    })
    res.headers.set('Cache-Control', 'private, no-store')
    return res
  }

  // Compose anon set first — it's needed for every other branch (anon view,
  // signed-in view: starts here; booster view: includes it).
  const anonSet  = composeAnonRestaurants(all, mustEatCountByRestaurant)
  const anonIds  = new Set(anonSet.map((r) => r._id))

  // revealedMustEatIds is only useful for anon visitors — signed-in clients
  // resolve "open" status from their own users/{uid}/unlockedMustEats Firestore
  // collection (geofence reveals) + the static revealedForAnon set client-side.
  const revealedMustEatIds = uid
    ? []
    : Array.from(composeRevealedMustEats(allMustEats, anonIds))

  let visibleRestaurants: typeof all
  if (!uid) {
    // Anonymous: only the anon set.
    visibleRestaurants = anonSet
  } else {
    // Signed-in: anon ∪ signed; if category entitlement, also union those.
    const signedSet     = composeSignedRestaurants(all, anonIds, mustEatCountByRestaurant)
    const tierUnion     = [...anonSet, ...signedSet]
    const tierUnionIds  = new Set(tierUnion.map((r) => r._id))

    if (ent.categorySlugs.size > 0) {
      const categoryMatched = all.filter(
        (r) => !tierUnionIds.has(r._id) && isRestaurantVisible(r, ent),
      )
      visibleRestaurants = [...tierUnion, ...categoryMatched]
    } else {
      visibleRestaurants = tierUnion
    }
  }

  const visibleIdSet      = new Set(visibleRestaurants.map((r) => r._id))
  const visibleMustEats   = allMustEats.filter((m) => visibleIdSet.has(m.restaurant._id))
  const lockedRestaurants = all.filter((r) => !visibleIdSet.has(r._id))

  const res = NextResponse.json({
    restaurants: visibleRestaurants,
    mustEats: visibleMustEats,
    categories,
    totalCount: all.length,
    lockedRestaurants,
    revealedMustEatIds,
  })
  res.headers.set('Cache-Control', 'private, no-store')
  return res
}
