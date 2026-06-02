import type { MapRestaurant, MapMustEat } from '@/lib/types'

interface MapSlice {
  restaurants: MapRestaurant[]
  lockedRestaurants: MapRestaurant[]
  mustEats: MapMustEat[]
  revealedMustEatIds: Set<string>
}

/**
 * Make the Spot des Tages a free, visible gift for everyone — ephemerally.
 *
 * Given the composed tier slice (visible + locked spots, visible must-eats,
 * revealed set), surface the spot-of-day restaurant into the visible set if it
 * was locked, pull its must-eats into the visible list, and add them to the
 * revealed set so they render face-up. Nothing is persisted: callers recompute
 * this per request from `today`, so tomorrow's spot replaces today's and the
 * previous one silently falls back to locked.
 *
 * `allRestaurants` / `allMustEats` are the full catalog (the map's cached data)
 * used to look the spot + its must-eats up regardless of tier.
 */
export function applySpotOfDayReveal(
  spotId: string | null,
  allRestaurants: MapRestaurant[],
  allMustEats: MapMustEat[],
  slice: MapSlice,
): MapSlice {
  if (!spotId) return slice

  // The spot of the day is ALWAYS surfaced (visible + openable), even if it has
  // no must-eat — "it's shown regardless". When it does have a must-eat, that
  // must-eat is additionally revealed face-up.
  const spotMustEats = allMustEats.filter((m) => m.restaurant._id === spotId)

  let { restaurants, lockedRestaurants } = slice
  if (!restaurants.some((r) => r._id === spotId)) {
    const spot = allRestaurants.find((r) => r._id === spotId)
    if (spot) {
      restaurants = [spot, ...restaurants]
      lockedRestaurants = lockedRestaurants.filter((r) => r._id !== spotId)
    }
  }

  const haveMustEat = new Set(slice.mustEats.map((m) => m._id))
  const missing = spotMustEats.filter((m) => !haveMustEat.has(m._id))
  const mustEats = missing.length ? [...slice.mustEats, ...missing] : slice.mustEats

  const revealedMustEatIds = new Set(slice.revealedMustEatIds)
  for (const m of spotMustEats) revealedMustEatIds.add(m._id)

  return { restaurants, lockedRestaurants, mustEats, revealedMustEatIds }
}
