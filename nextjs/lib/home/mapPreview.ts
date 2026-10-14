import type { MapRestaurant } from '@/lib/types';

export const HOME_MAP_CATEGORIES = [
  { slug: 'pizza', de: 'Pizza', en: 'Pizza', articles: ['beste-pizzerien-berlin'] },
  { slug: 'coffee', de: 'Kaffee', en: 'Coffee', articles: ['beste-cafes-berlin', 'kolo-coffee-berlin'] },
  { slug: 'lunch', de: 'Lunch', en: 'Lunch', articles: [
    'restaurants-mitte', 'restaurants-kreuzberg', 'restaurants-neukoelln',
    'restaurants-prenzlauer-berg', 'restaurants-charlottenburg', 'essen-trinken-schoeneberg',
    'beste-burger-berlin', 'drei-doener-berlin', 'aris-berlin-burger-kreuzberg',
    'vietnamesische-restaurants-berlin',
  ] },
] as const;

export type PreviewCategory = (typeof HOME_MAP_CATEGORIES)[number];

/** Lead with editorial recommendations. Pizza also uses the other published
 * category spots, so the preview shows more of the existing Sanity selection. */
export function mapPreviewSpots(restaurants: MapRestaurant[], category: PreviewCategory, topSpots: string[] = []) {
  const recommended = new Set(topSpots);
  return restaurants
    .filter(
      (spot) =>
        (recommended.has(spot.slug) || category.slug === 'pizza') &&
        spot.photo &&
        Number.isFinite(spot.lat) &&
        Number.isFinite(spot.lng) &&
        Math.abs(spot.lat) <= 90 &&
        Math.abs(spot.lng) <= 180 &&
        spot.categories?.some((item) => item.slug === category.slug)
    )
    .sort((a, b) => {
      const rank = (slug: string) => recommended.has(slug) ? topSpots.indexOf(slug) : topSpots.length;
      return rank(a.slug) - rank(b.slug) || a.name.localeCompare(b.name);
    });
}

/** Luftlinie in km; auf Berliner Distanzen reicht die flache Näherung. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const x = (b.lng - a.lng) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180)) * 111.32;
  const y = (b.lat - a.lat) * 110.57;
  return Math.hypot(x, y);
}

/** Ein Kiez statt ganz Berlin (Betreiber, 14.10.2026: „man müsste sehen,
 *  dass man in Berlin ist, Straßen und so"). Über alle Spots einer Kategorie
 *  gerahmt, stand Pizza auf Stadtzoom am Stadtrand. Zuerst die Ecke um die
 *  erste Empfehlung, damit sie vorn bleibt; liegt dort zu wenig, die
 *  dichteste Ecke. Der Radius wächst, bis `min` Spots darin liegen. Die
 *  Reihenfolge der Empfehlungen bleibt. */
export function nearbyCluster<T extends { lat: number; lng: number }>(
  spots: T[],
  { radiusKm = 1.4, min = 4, maxRadiusKm = 3.2 } = {},
): T[] {
  if (spots.length <= min) return spots;
  const around = (center: T, radius: number) => spots.filter((spot) => distanceKm(center, spot) <= radius);
  for (let radius = radiusKm; radius <= maxRadiusKm + 1e-9; radius += 0.6) {
    const lead = around(spots[0], radius);
    if (lead.length >= min) return lead;
  }
  for (let radius = radiusKm; radius <= maxRadiusKm + 1e-9; radius += 0.6) {
    let best: T[] = [];
    for (const center of spots) {
      const members = around(center, radius);
      if (members.length > best.length) best = members;
    }
    if (best.length >= min) return best;
  }
  return spots;
}

export function mapPreviewHref(category: string, restaurantSlug?: string) {
  const params = new URLSearchParams({ cat: category });
  if (restaurantSlug) params.set('r', restaurantSlug);
  return `/map?${params}`;
}

/** Screen-space spacing keeps real coordinates intact even on narrow phones.
 * Start with the editorial lead, then favour geographic coverage with a small
 * preference for earlier recommendations. Reserve room for the active pin and
 * its Must-Eat badge, so selecting a spot cannot create a collision. */
export function spreadPreviewPins(
  spots: MapRestaurant[],
  project: (spot: MapRestaurant) => { x: number; y: number },
  selectedId: string | null,
  spacing = { x: 56, y: 60 },
) {
  const candidates = spots.map((spot, rank) => ({ spot, rank, point: project(spot) }));
  const selected = candidates.find((item) => item.spot._id === selectedId) ?? candidates[0];
  if (!selected) return [];
  const placed = [selected];
  let remaining = candidates.filter((item) => item !== selected);
  while (placed.length < 12) {
    remaining = remaining.filter(({ point }) => placed.every((item) =>
      Math.abs(point.x - item.point.x) >= spacing.x || Math.abs(point.y - item.point.y) >= spacing.y));
    if (!remaining.length) break;
    const score = (candidate: typeof selected) => Math.min(...placed.map((item) =>
      Math.hypot(candidate.point.x - item.point.x, candidate.point.y - item.point.y))) / (1 + candidate.rank * .035);
    const next = remaining.reduce((best, item) => score(item) > score(best) ? item : best);
    placed.push(next);
    remaining = remaining.filter((item) => item !== next);
  }
  return placed.map(({ spot }) => spot);
}
