import { haversineDistance } from '@/lib/map/distance'
import type { MapRestaurant, MapMustEat } from '@/lib/types'

interface LatLng {
  lat: number
  lng: number
}

/** The n restaurants nearest to `loc`, nearest first. Does not mutate input. */
export function nearestRestaurants(
  restaurants: MapRestaurant[],
  loc: LatLng,
  n: number,
): MapRestaurant[] {
  return [...restaurants]
    .sort(
      (a, b) =>
        haversineDistance(loc.lat, loc.lng, a.lat, a.lng) -
        haversineDistance(loc.lat, loc.lng, b.lat, b.lng),
    )
    .slice(0, n)
}

/** Must-eats whose restaurant is within `radiusM` of `loc`, nearest first, capped at n. */
export function nearbyMustEats(
  mustEats: MapMustEat[],
  loc: LatLng,
  radiusM: number,
  n: number,
): MapMustEat[] {
  return mustEats
    .map((m) => ({
      m,
      d: haversineDistance(loc.lat, loc.lng, m.restaurant.lat, m.restaurant.lng),
    }))
    .filter((x) => x.d <= radiusM)
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.m)
}
