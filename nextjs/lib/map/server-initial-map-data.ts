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
import { applySpotOfDayReveal } from './spotOfDayReveal'
import { getFreeSurfaceData, applyFreeSurface } from './free-surface'
import { stripCoveredMustEats } from './stripCoveredMustEats'
import { stripLockedRestaurants } from './stripLockedRestaurant'
import { getSpotOfDayId } from '@/lib/home/spotOfDay.server'
import { hydrateAuthorizedMustEats } from '@/lib/must-eat/private-store'
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

async function composeInitialAnonMapMetadata(): Promise<InitialMapData> {
  const today = new Date().toISOString().slice(0, 10)
  const [
    { restaurants: all, mustEats: allMustEats, categories },
    freeSurface,
    spotId,
  ] = await Promise.all([
    getCachedMapData(),
    getFreeSurfaceData(),
    getSpotOfDayId(today),
  ])

  const mustEatCountByRestaurant = new Map<string, number>()
  for (const m of allMustEats) {
    const rid = m.restaurant._id
    mustEatCountByRestaurant.set(rid, (mustEatCountByRestaurant.get(rid) ?? 0) + 1)
  }

  const anonSet = composeAnonRestaurants(all, mustEatCountByRestaurant)
  const anonIds = new Set(anonSet.map((r) => r._id))
  // Face-up-Set bleibt auf dem kuratierten Anon-Tier — Free-Surface-Spots
  // liefern nur Card-Backs (siehe Spec).
  const revealedSet = composeRevealedMustEats(allMustEats, anonIds)

  const visibleRestaurants = applyFreeSurface(anonSet, all, freeSurface.restaurantIds)
  const visibleIdSet = new Set(visibleRestaurants.map((r) => r._id))
  const visibleMustEats = allMustEats.filter((m) => visibleIdSet.has(m.restaurant._id))
  const lockedRestaurants = all.filter((r) => !visibleIdSet.has(r._id))

  // Spot des Tages — a free, daily-rotating gift for everyone. Surface today's
  // spot + reveal its must-eat (ephemeral: recomputed per request from the
  // date, so tomorrow's replaces it and the previous one falls back to locked).
  const gifted = applySpotOfDayReveal(spotId, all, allMustEats, {
    restaurants:        visibleRestaurants,
    lockedRestaurants,
    mustEats:           visibleMustEats,
    revealedMustEatIds: revealedSet,
  })

  return {
    restaurants:        gifted.restaurants,
    lockedRestaurants:  stripLockedRestaurants(gifted.lockedRestaurants),
    mustEats:           gifted.mustEats,
    categories,
    totalCount:         all.length,
    revealedMustEatIds: Array.from(gifted.revealedMustEatIds),
  }
}

export async function getPublicMustEatIds(): Promise<Set<string>> {
  const data = await composeInitialAnonMapMetadata()
  return new Set(data.revealedMustEatIds)
}

export async function getInitialAnonMapData(): Promise<InitialMapData> {
  const metadata = await composeInitialAnonMapMetadata()
  const faceUpIds = new Set(metadata.revealedMustEatIds)
  const hydrated = await hydrateAuthorizedMustEats(metadata.mustEats, faceUpIds)

  return {
    ...metadata,
    // Anonymous HTML receives only the curated set plus the spot-of-day gift.
    // Covered cards are metadata-only and premium fields come exclusively
    // from the private store after this server-side authorization decision.
    mustEats: stripCoveredMustEats(hydrated, faceUpIds),
  }
}
