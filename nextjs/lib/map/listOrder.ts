import type { MapRestaurant } from '@/lib/types';
import { getOpenStatus } from './openingHours';

/**
 * The list's order when there is no location to sort by, instead of the order
 * the map payload was assembled in.
 *
 * Must Eats first, because that is what the map is for, and only a small share
 * of spots carry one, so it is a real distinction. Alphabetical underneath:
 * nothing else in the payload ranks quality, and a name keeps the rest findable
 * and the order stable between visits.
 *
 * Its own module because two callers need it and only one may import a hook:
 * `useMapFilters` sorts the live list, and the map page's `generateMapJsonLd`
 * reproduces the SSR'd rows for its ItemList. The `lib/map` barrel re-exports
 * client hooks, so server code must not go through it.
 */
export function byMustEatsThenName(a: MapRestaurant, b: MapRestaurant): number {
  const mustEats = (b.mustEatCount ?? 0) - (a.mustEatCount ?? 0);
  if (mustEats !== 0) return mustEats;
  return a.name.localeCompare(b.name, 'de');
}

/**
 * Geöffnet vor geschlossen, sonst unverändert (stabil): Die Liste soll nicht
 * empfehlen, was man gerade nicht haben kann (Montag 09:00 ist fast alles zu).
 * Ein Spot ohne gepflegte Öffnungszeiten zählt zu den geschlossenen; offen ist
 * er nur, wenn wir es wissen.
 *
 * `now` ist Berliner Wanduhrzeit (berlinNow), wie getOpenStatus sie liest. Die
 * Karte übergibt den Zeitpunkt, zu dem der Server die Seite gerendert hat: So
 * sortieren Server und Browser gleich, und die Liste sortiert nicht unter dem
 * Finger um, wenn um zwölf ein Laden aufmacht.
 */
export function openFirst(list: MapRestaurant[], now: Date): MapRestaurant[] {
  const isOpen = (r: MapRestaurant) =>
    Boolean(r.openingHours?.length && getOpenStatus(r.openingHours, now).isOpen);
  return [...list.filter(isOpen), ...list.filter((r) => !isOpen(r))];
}
