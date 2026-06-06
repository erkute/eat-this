// nextjs/lib/map/tier-composition.ts
//
// Pure module that composes tier sets from the Sanity-curated flags
// (`tierAnon`, `tierSigned`, `revealedForAnon`) with deterministic
// fallback fill when curation is incomplete.
//
// Consumer: nextjs/app/api/map-data/route.ts

import type { MapRestaurant, MapMustEat } from '@/lib/types'

export const TIER_TARGETS = {
  ANON:     20,
  SIGNED:   20,
  REVEALED: 10,
} as const

// Stable sort: must-eat count DESC, then _id ASC as tiebreak.
function byMustEatCountDesc(
  mustEatCount: Map<string, number>,
): (a: MapRestaurant, b: MapRestaurant) => number {
  return (a, b) => {
    const ac = mustEatCount.get(a._id) ?? 0
    const bc = mustEatCount.get(b._id) ?? 0
    if (ac !== bc) return bc - ac
    return a._id.localeCompare(b._id)
  }
}

// Anon tier: flagged set + fallback, BOTH constrained to restaurants WITH at
// least one must-eat — every free/anon spot must carry a must-eat (so it can
// show a revealed or teaser card). Target ANON.
export function composeAnonRestaurants(
  all:          MapRestaurant[],
  mustEatCount: Map<string, number>,
): MapRestaurant[] {
  const flagged = all.filter((r) => r.tierAnon && (mustEatCount.get(r._id) ?? 0) > 0)
  if (flagged.length >= TIER_TARGETS.ANON) {
    return flagged
  }
  const flaggedIds = new Set(flagged.map((r) => r._id))
  const fallbackPool = all
    .filter((r) => !flaggedIds.has(r._id) && (mustEatCount.get(r._id) ?? 0) > 0)
    .sort(byMustEatCountDesc(mustEatCount))
  const fillCount = TIER_TARGETS.ANON - flagged.length
  return [...flagged, ...fallbackPool.slice(0, fillCount)]
}

// Signed tier: flagged set (minus anon overlap) + fallback excluding anon
// AND already-flagged. NO must-eat constraint — signed-tier can include
// restaurants without must-eats.
export function composeSignedRestaurants(
  all:          MapRestaurant[],
  anonIds:      Set<string>,
  mustEatCount: Map<string, number>,
): MapRestaurant[] {
  const flagged = all.filter((r) => r.tierSigned && !anonIds.has(r._id))
  if (flagged.length >= TIER_TARGETS.SIGNED) {
    return flagged
  }
  const flaggedIds = new Set(flagged.map((r) => r._id))
  const fallbackPool = all
    .filter((r) => !anonIds.has(r._id) && !flaggedIds.has(r._id))
    .sort(byMustEatCountDesc(mustEatCount))
  const fillCount = TIER_TARGETS.SIGNED - flagged.length
  return [...flagged, ...fallbackPool.slice(0, fillCount)]
}

// Revealed must-eats (anon view): up to TARGET_REVEALED total, all of
// them on restaurants in the anon set, and at most ONE card per restaurant —
// a spot with two must-eats keeps the second face-down (something left to
// discover on site). Flagged (`revealedForAnon`) first, then fallback fill
// by stable _id ordering.
export function composeRevealedMustEats(
  all:     MapMustEat[],
  anonIds: Set<string>,
): Set<string> {
  const onAnonRestaurants = all.filter((m) => anonIds.has(m.restaurant._id))
  const out = new Set<string>()
  const usedRestaurants = new Set<string>()
  const take = (m: MapMustEat) => {
    if (out.size >= TIER_TARGETS.REVEALED) return
    if (usedRestaurants.has(m.restaurant._id)) return
    usedRestaurants.add(m.restaurant._id)
    out.add(m._id)
  }
  for (const m of onAnonRestaurants) if (m.revealedForAnon) take(m)
  const fallbackPool = onAnonRestaurants
    .filter((m) => !out.has(m._id))
    .sort((a, b) => a._id.localeCompare(b._id))
  for (const m of fallbackPool) take(m)
  return out
}
