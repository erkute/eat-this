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

/** Editorial recommendations only, with unchanged coordinates. No geographic
 * thinning: nearby recommendations and spots outside the centre still count. */
export function mapPreviewSpots(restaurants: MapRestaurant[], category: PreviewCategory, topSpots: string[] = []) {
  const recommended = new Set(topSpots);
  return restaurants
    .filter(
      (spot) =>
        recommended.has(spot.slug) &&
        spot.photo &&
        Number.isFinite(spot.lat) &&
        Number.isFinite(spot.lng) &&
        Math.abs(spot.lat) <= 90 &&
        Math.abs(spot.lng) <= 180 &&
        spot.categories?.some((item) => item.slug === category.slug)
    )
    .sort((a, b) => topSpots.indexOf(a.slug) - topSpots.indexOf(b.slug));
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
) {
  const candidates = spots.map((spot, rank) => ({ spot, rank, point: project(spot) }));
  const selected = candidates.find((item) => item.spot._id === selectedId) ?? candidates[0];
  if (!selected) return [];
  const placed = [selected];
  let remaining = candidates.filter((item) => item !== selected);
  while (placed.length < 12) {
    remaining = remaining.filter(({ point }) => placed.every((item) =>
      Math.abs(point.x - item.point.x) >= 56 || Math.abs(point.y - item.point.y) >= 60));
    if (!remaining.length) break;
    const score = (candidate: typeof selected) => Math.min(...placed.map((item) =>
      Math.hypot(candidate.point.x - item.point.x, candidate.point.y - item.point.y))) / (1 + candidate.rank * .035);
    const next = remaining.reduce((best, item) => score(item) > score(best) ? item : best);
    placed.push(next);
    remaining = remaining.filter((item) => item !== next);
  }
  return placed.map(({ spot }) => spot);
}
