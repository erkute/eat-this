import { haversineDistance } from '@/lib/map/distance'
import type { MapRestaurant } from '@/lib/types'

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
