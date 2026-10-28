// nextjs/lib/map/revealed-must-eats.ts
//
// Welche Must-Eat-Karten ohne Konto offen liegen.
//
// Consumers: nextjs/app/api/map-data/route.ts,
//            nextjs/lib/map/server-initial-map-data.ts,
//            nextjs/lib/map/visible-restaurants.server.ts

import type { MapMustEat } from '@/lib/types';

/** Ten public cards: two for the catalog cover, eight for its gallery (28.10.2026).
 * One public example per available pack (operator, 13.10.2026).
 * Category selections take precedence over general shop-window flags.
 * Explicit selections are always public. Fallback curation fills remaining
 * slots up to the target, with one fallback card per restaurant.
 */
export const REVEALED_TARGET = 10;

export function composeRevealedMustEats(all: MapMustEat[]): Set<string> {
  const out = new Set<string>();
  const usedRestaurants = new Set<string>();
  const take = (m: MapMustEat) => {
    if (out.size >= REVEALED_TARGET) return;
    if (usedRestaurants.has(m.restaurant._id)) return;
    usedRestaurants.add(m.restaurant._id);
    out.add(m._id);
  };
  const ordered = [...all].sort((a, b) => a._id.localeCompare(b._id));
  for (const m of ordered) {
    if (!m.previewCategory) continue;
    out.add(m._id);
    usedRestaurants.add(m.restaurant._id);
  }
  // In _id-Folge wie die anderen beiden Durchgaenge — nicht in der Folge der
  // Eingabe, die nach Kartennummer sortiert ankommt. Welche markierte Karte
  // einen freien Platz bekommt, soll nicht an der Sortierung der Map haengen.
  for (const m of ordered) if (m.revealedForAnon) take(m);
  const fallbackPool = all
    .filter((m) => !out.has(m._id))
    .sort((a, b) => a._id.localeCompare(b._id));
  for (const m of fallbackPool) take(m);
  return out;
}
