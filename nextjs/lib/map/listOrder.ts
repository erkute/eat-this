import type { MapRestaurant } from '@/lib/types';

/**
 * The list's order when there is no location to sort by.
 *
 * Without this the list simply inherited the order the map payload was
 * assembled in — curated spots, then the round-robin district fill, then
 * whatever the home page surfaces appended at the end (applyFreeSurface). That
 * last step is why tapping a dish on the home page and closing it again landed
 * you on the very last row of 340: not a ranking anyone chose, a build order
 * leaking into the UI.
 *
 * Must Eats first, because that is what the map is for — "we tell you what to
 * eat" — and only 28 of 344 spots carry one, so it is a real distinction rather
 * than a shuffle. Alphabetical underneath: nothing else in the payload ranks
 * quality (the importer fills photo, tip and description for every spot), and a
 * name at least makes the rest findable and keeps the order stable between two
 * visits. Free and paywalled spots rank by the same rule; they are one list.
 *
 * Lives in its own module because two callers need it and only one of them may
 * import a hook: `useMapFilters` sorts the live list, and the map page's
 * `generateMapJsonLd` has to reproduce the SSR'd rows for its ItemList. The
 * `lib/map` barrel re-exports client hooks, so server code must not go through
 * it — hence a deep, hook-free file.
 */
export function byMustEatsThenName(a: MapRestaurant, b: MapRestaurant): number {
  const mustEats = (b.mustEatCount ?? 0) - (a.mustEatCount ?? 0);
  if (mustEats !== 0) return mustEats;
  return a.name.localeCompare(b.name, 'de');
}
