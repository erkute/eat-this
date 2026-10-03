import { haversineDistance, walkingMinutes } from '@/lib/map/distance';
import type { MapRestaurant } from '@/lib/types';

interface LatLng {
  lat: number;
  lng: number;
}

/** The n restaurants nearest to `loc`, nearest first. Does not mutate input. */
export function nearestRestaurants(
  restaurants: MapRestaurant[],
  loc: LatLng,
  n: number
): MapRestaurant[] {
  return [...restaurants]
    .sort(
      (a, b) =>
        haversineDistance(loc.lat, loc.lng, a.lat, a.lng) -
        haversineDistance(loc.lat, loc.lng, b.lat, b.lng)
    )
    .slice(0, n);
}

/**
 * A deterministic daily rotation through the whole list, used when the visitor
 * hasn't shared a location.
 *
 * The fallback used to centre on a hard-coded Mitte coordinate, which always
 * surfaced the same four spots and quietly implied a neighbourhood the visitor
 * probably isn't in. Rotating over all of Berlin is honest about not knowing
 * where they are, and gives the section something new each day.
 *
 * `today` (YYYY-MM-DD) comes from the server so SSR and the first client render
 * agree — deriving it from the client clock would mismatch across midnight.
 * Sorting by `_id` first makes the pick independent of query order.
 */
export function rotatingRestaurants(
  restaurants: MapRestaurant[],
  today: string,
  n: number
): MapRestaurant[] {
  if (restaurants.length === 0) return [];
  const ordered = [...restaurants].sort((a, b) => a._id.localeCompare(b._id));
  let hash = 0;
  for (let i = 0; i < today.length; i++) hash = (hash * 31 + today.charCodeAt(i)) | 0;
  const start = Math.abs(hash) % ordered.length;
  return Array.from(
    { length: Math.min(n, ordered.length) },
    (_, i) => ordered[(start + i) % ordered.length]
  );
}

/** What the stamp on a nearby card says: a number and its unit. */
export interface NearbyDistance {
  value: string;
  unit: 'Min' | 'km';
}

/**
 * Walking minutes up to ~1600 m, like formatWalkingTime — past that a walking
 * time reads as off-putting ("90 min on foot"), so the stamp switches to the
 * distance in kilometres. The value is kept apart from its unit because the
 * stamp rolls each character of it like a counter.
 */
export function nearbyDistance(meters: number, locale: 'de' | 'en'): NearbyDistance {
  const minutes = walkingMinutes(meters);
  if (minutes !== null) return { value: String(minutes), unit: 'Min' };
  const value = new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    maximumFractionDigits: 1,
  }).format(meters / 1000);
  return { value, unit: 'km' };
}
