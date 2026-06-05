// nextjs/lib/map/free-surface.ts
//
// "Free surface": jeder Spot, den die Home/News-Oberfläche anteasert, ist auf
// der Map ohne Login sichtbar (User-Entscheidung 2026-06-05, siehe
// docs/superpowers/specs/2026-06-05-free-surface-home-map-design.md).
// Single Source of Truth für BEIDE Konsumenten:
//   - /api/map-data + getInitialAnonMapData (Sichtbarkeits-Union)
//   - getHomeData („Neu auf der Map"-Karten, brand-deduped)
// → Home und Free-Map können per Konstruktion nicht driften.

import { normalizeName } from '@/lib/normalizeName'
import type { MapRestaurant } from '@/lib/types'

export interface FreeSurfaceCard {
  _id: string
  name: string
  slug: string
  image: string | null
  district: string | null
  categoryDe: string | null
  categoryEn: string | null
}

export interface FreeSurfaceData {
  /** Union aller Restaurant-IDs aus den drei Quellen. */
  restaurantIds: Set<string>
  /** Brand-dedupte „Neu auf der Map"-Karten (max NEW_ON_MAP_COUNT). */
  newOnMap: FreeSurfaceCard[]
}

export const NEW_ON_MAP_COUNT = 6

/** Brand-Schlüssel: erste zwei normalisierte Namens-Tokens („Hokey Pokey
 *  Mitte" → "hokey pokey"); Ein-Token-Namen nutzen den vollen Namen. */
export function brandKey(name: string): string {
  const tokens = normalizeName(name).toLowerCase().split(/\s+/).filter(Boolean)
  return tokens.slice(0, 2).join(' ')
}

/** Erste Karte pro Brand gewinnt (Input ist newest-first → neueste gewinnt). */
export function dedupeByBrand<T extends { name: string }>(cards: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const c of cards) {
    const key = brandKey(c.name)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
  }
  return out
}

export interface NewsSpotRow {
  de: string[] | null
  en: string[] | null
}

/** Pure Komposition — ohne Sanity testbar. */
export function composeFreeSurface(
  newOnMapPool: FreeSurfaceCard[],
  bezirkSpotIds: string[],
  newsRows: NewsSpotRow[],
): FreeSurfaceData {
  // Bewusst: free ist nur, was Home tatsächlich ZEIGT — also die gecappten
  // 6 Karten, nicht der ganze Pool. Pool-Spots jenseits des Caps bleiben
  // locked, bis sie (durch neuere Spots) in die Sektion rotieren.
  const newOnMap = dedupeByBrand(newOnMapPool).slice(0, NEW_ON_MAP_COUNT)
  const restaurantIds = new Set<string>()
  for (const c of newOnMap) restaurantIds.add(c._id)
  for (const id of bezirkSpotIds) if (id) restaurantIds.add(id)
  for (const row of newsRows) {
    for (const id of row.de ?? []) if (id) restaurantIds.add(id)
    for (const id of row.en ?? []) if (id) restaurantIds.add(id)
  }
  return { restaurantIds, newOnMap }
}

/** Sichtbarkeits-Union für die Map: visible ∪ free-surfaced. Referenz-stabil,
 *  wenn nichts dazukommt. */
export function applyFreeSurface(
  visible: MapRestaurant[],
  all: MapRestaurant[],
  freeIds: Set<string>,
): MapRestaurant[] {
  const have = new Set(visible.map((r) => r._id))
  const surfaced = all.filter((r) => freeIds.has(r._id) && !have.has(r._id))
  return surfaced.length ? [...visible, ...surfaced] : visible
}
