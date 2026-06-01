import { haversineDistance } from '@/lib/map/distance'
import type { MapRestaurant } from '@/lib/types'

interface LatLng {
  lat: number
  lng: number
}

/** Canonical district label for a restaurant (bezirk reference wins over the
 *  free-text district field). Mirrors districtOf in the map filters. */
function districtOf(r: MapRestaurant): string | null {
  return r.bezirk?.name ?? r.district ?? null
}

/**
 * The Bezirk the user is standing in, inferred as the most common district
 * among the `k` nearest restaurants. Using a small neighbourhood (not just the
 * single nearest) guards against a lone spot from an adjacent district being
 * picked when the user sits near a border.
 */
export function bezirkFromLocation(
  restaurants: MapRestaurant[],
  loc: LatLng,
  k = 5,
): string | null {
  const nearest = [...restaurants]
    .sort(
      (a, b) =>
        haversineDistance(loc.lat, loc.lng, a.lat, a.lng) -
        haversineDistance(loc.lat, loc.lng, b.lat, b.lng),
    )
    .slice(0, k)

  const counts = new Map<string, number>()
  for (const r of nearest) {
    const d = districtOf(r)
    if (d) counts.set(d, (counts.get(d) ?? 0) + 1)
  }

  let best: string | null = null
  let bestCount = 0
  for (const [district, count] of counts) {
    if (count > bestCount) {
      best = district
      bestCount = count
    }
  }
  return best
}

/** The `n` newest restaurants in `bezirk`, newest first (by _createdAt). */
export function freshInBezirk(
  restaurants: MapRestaurant[],
  bezirk: string,
  n = 2,
): MapRestaurant[] {
  return restaurants
    .filter((r) => districtOf(r) === bezirk)
    .sort((a, b) => (a._createdAt < b._createdAt ? 1 : a._createdAt > b._createdAt ? -1 : 0))
    .slice(0, n)
}
