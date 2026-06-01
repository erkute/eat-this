import type { MapRestaurant } from '@/lib/types'

/** Canonical district label for a restaurant (bezirk reference wins over the
 *  free-text district field). Mirrors districtOf in the map filters. */
function districtOf(r: MapRestaurant): string | null {
  return r.bezirk?.name ?? r.district ?? null
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
