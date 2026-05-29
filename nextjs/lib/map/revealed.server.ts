import { getCachedMapData } from './cached-sanity'
import { composeAnonRestaurants, composeRevealedMustEats } from './tier-composition'

/**
 * The single curated set of "revealed" must-eat IDs (≤ TIER_TARGETS.REVEALED),
 * computed exactly the way the map's `/api/map-data` route does. Used by the
 * profile deck (SSR) so its teasers are the SAME set the map reveals.
 *
 * `composeRevealedMustEats` only picks must-eats on anon-tier restaurants, so
 * every revealed must-eat's spot is guaranteed to be a visible spot on the map.
 */
export async function getCuratedRevealedMustEatIds(): Promise<string[]> {
  const { restaurants: all, mustEats: allMustEats } = await getCachedMapData()
  const mustEatCount = new Map<string, number>()
  for (const m of allMustEats) {
    const rid = m.restaurant._id
    mustEatCount.set(rid, (mustEatCount.get(rid) ?? 0) + 1)
  }
  const anonIds = new Set(composeAnonRestaurants(all, mustEatCount).map((r) => r._id))
  return Array.from(composeRevealedMustEats(allMustEats, anonIds))
}
