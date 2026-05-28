// Server-only: build the anon-tier map data at request time so the SPA
// renders WITH spots already in the HTML, avoiding the "0 spots" flash.
//
// Used by app/[locale]/(spa)/[...slug]/page.tsx for /map.
// Signed-in users still refetch /api/map-data on mount to get their +20
// signed tier + entitlement-based unions.

import { getCachedMapData } from './cached-sanity'
import {
  composeAnonRestaurants,
  composeRevealedMustEats,
} from './tier-composition'
import type { MapRestaurant, MapMustEat } from '@/lib/types'
import type { CategoryDef } from '@/lib/categories'

export interface InitialMapData {
  restaurants:        MapRestaurant[]
  lockedRestaurants:  MapRestaurant[]
  mustEats:           MapMustEat[]
  categories:         CategoryDef[]
  totalCount:         number
  // Serialisable: array form so the RSC → client boundary doesn't break.
  // Client converts to Set on hydration.
  revealedMustEatIds: string[]
}

export async function getInitialAnonMapData(): Promise<InitialMapData> {
  const { restaurants: all, mustEats: allMustEats, categories } = await getCachedMapData()

  const mustEatCountByRestaurant = new Map<string, number>()
  for (const m of allMustEats) {
    const rid = m.restaurant._id
    mustEatCountByRestaurant.set(rid, (mustEatCountByRestaurant.get(rid) ?? 0) + 1)
  }

  const anonSet         = composeAnonRestaurants(all, mustEatCountByRestaurant)
  const anonIds         = new Set(anonSet.map((r) => r._id))
  const visibleMustEats = allMustEats.filter((m) => anonIds.has(m.restaurant._id))
  const lockedRestaurants = all.filter((r) => !anonIds.has(r._id))
  const revealedMustEatIds = Array.from(composeRevealedMustEats(allMustEats, anonIds))

  return {
    restaurants:        anonSet,
    lockedRestaurants,
    mustEats:           visibleMustEats,
    categories,
    totalCount:         all.length,
    revealedMustEatIds,
  }
}
