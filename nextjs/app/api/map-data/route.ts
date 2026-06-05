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
import { applySpotOfDayReveal } from '@/lib/map/spotOfDayReveal'
import { getSpotOfDayId } from '@/lib/home/spotOfDay.server'
import { getFreeSurfaceData, applyFreeSurface } from '@/lib/map/free-surface'

// Per-user response. Disable framework-level caching; the expensive Sanity
// fetch is shared via the module-level cache in cached-sanity.ts.
export const dynamic    = 'force-dynamic'
export const revalidate = 0

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
      // Expired/invalid token → treat as anonymous.
    }
  }

  const ent = await resolveEntitlements(uid, identity)
  const [{ restaurants: all, mustEats: allMustEats, categories }, freeSurface] = await Promise.all([
    getCachedMapData(),
    getFreeSurfaceData(),
  ])

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

  // The curated revealed set — returned for BOTH anon and signed users so the
  // map and the profile deck reveal the SAME must-eats. (Signed users used to
  // get [] here, with a client-side revealedForAnon fallback that was never
  // built — that was the map↔deck discrepancy.) The set is always on anon-tier
  // restaurants, so every revealed must-eat's spot is a visible spot.
  const revealedSet = composeRevealedMustEats(allMustEats, anonIds)

  let visibleRestaurants: typeof all
  if (!uid) {
    // Anonymous: only the anon set.
    visibleRestaurants = anonSet
  } else {
    // Signed-in: anon ∪ signed; then union in any restaurants the user is
    // individually entitled to (category packs, restaurant-id grants from
    // referral bonuses, or must-eat-id grants — Plan 4).
    const signedSet     = composeSignedRestaurants(all, anonIds, mustEatCountByRestaurant)
    const tierUnion     = [...anonSet, ...signedSet]
    const tierUnionIds  = new Set(tierUnion.map((r) => r._id))

    // Restaurants whose mustEats the user is entitled to — visible by extension.
    const restaurantIdsFromMustEats = new Set<string>()
    if (ent.mustEatIds.size > 0) {
      for (const m of allMustEats) {
        if (ent.mustEatIds.has(m._id)) restaurantIdsFromMustEats.add(m.restaurant._id)
      }
    }

    const hasIndividualEntitlements =
      ent.categorySlugs.size > 0 ||
      ent.restaurantIds.size > 0 ||
      restaurantIdsFromMustEats.size > 0

    if (hasIndividualEntitlements) {
      const matched = all.filter(
        (r) => !tierUnionIds.has(r._id) && (
          isRestaurantVisible(r, ent) || restaurantIdsFromMustEats.has(r._id)
        ),
      )
      visibleRestaurants = [...tierUnion, ...matched]
    } else {
      visibleRestaurants = tierUnion
    }
  }

  // Free surface: alles, was Home/News anteasert (Neu auf der Map, Bezirk der
  // Woche, Artikel-Spots), ist für ALLE free — Gast und signed (sonst sähe ein
  // eingeloggter User weniger als ein Gast). Wichtig: revealedSet ist oben
  // bereits aus dem puren Anon-Tier berechnet — Free-Surface-Spots liefern
  // Card-Backs, nie zusätzliche face-up-Karten.
  visibleRestaurants = applyFreeSurface(visibleRestaurants, all, freeSurface.restaurantIds)

  const visibleIdSet      = new Set(visibleRestaurants.map((r) => r._id))
  const visibleMustEats   = allMustEats.filter((m) => visibleIdSet.has(m.restaurant._id))
  const lockedRestaurants = all.filter((r) => !visibleIdSet.has(r._id))

  // Spot des Tages — free daily gift for everyone (incl. signed users who don't
  // own it): surface it + reveal its must-eat. Ephemeral, recomputed per day.
  const today  = new Date().toISOString().slice(0, 10)
  const spotId = await getSpotOfDayId(today)
  const gifted = applySpotOfDayReveal(spotId, all, allMustEats, {
    restaurants: visibleRestaurants,
    lockedRestaurants,
    mustEats: visibleMustEats,
    revealedMustEatIds: revealedSet,
  })

  const res = NextResponse.json({
    restaurants: gifted.restaurants,
    mustEats: gifted.mustEats,
    categories,
    totalCount: all.length,
    lockedRestaurants: gifted.lockedRestaurants,
    revealedMustEatIds: Array.from(gifted.revealedMustEatIds),
  })
  res.headers.set('Cache-Control', 'private, no-store')
  return res
}
