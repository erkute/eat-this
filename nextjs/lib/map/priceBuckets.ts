import type { MapRestaurant } from '@/lib/types';

/**
 * Die vier Preisstufen der Karte.
 *
 * Sie haben die Küche als dritten Filter abgelöst (User, 2026-08-27). Der Grund
 * ist nicht Geschmack, sondern Datenlage: `cuisineType` ist ein ungeprüftes
 * Freitextfeld — Sironi ist dort als „Café" gepflegt und ist eine Pizzeria —
 * und die Werte doppelten sich („Kaffee" 8 neben „Café" 69, „Italian / Pizza"
 * neben „Italienisch"). 38 Werte, sechs davon mit genau einem Treffer.
 * `priceRange` ist dagegen auf 434 von 465 Spots gepflegt und schneidet quer
 * zu den Kategorien: 12 der 49 Spots ab 100 € sind kein Fine Dining.
 *
 * Geschnitten wird an `min`, nicht an `max`: die teuerste Gruppe ist nach oben
 * offen (49 Spots tragen `{min: 100}` ohne Maximum), ein Schnitt an `max`
 * hätte die alle in denselben Topf geworfen wie ein 100-€-Menü mit Deckel.
 *
 * Die Küche bleibt **suchbar** — `useMapFilters` durchsucht `cuisineType`
 * weiter. Wer „vietnamesisch" tippt, findet es; es steht nur nicht mehr als
 * Dropdown mit 38 Zeilen da.
 */
export const PRICE_BUCKETS = [
  { id: 'u10', min: 0, max: 10 },
  { id: '10', min: 10, max: 20 },
  { id: '20', min: 20, max: 50 },
  { id: '50', min: 50, max: null },
] as const;

export type PriceBucketId = (typeof PRICE_BUCKETS)[number]['id'];

const BY_ID = new Map<string, (typeof PRICE_BUCKETS)[number]>(PRICE_BUCKETS.map((b) => [b.id, b]));

export function isPriceBucketId(value: string): value is PriceBucketId {
  return BY_ID.has(value);
}

/** Die Stufe, in die ein Spot fällt — `null`, wenn kein Preis gepflegt ist.
 *  Ohne Preis fällt ein Spot in keine Stufe: er taucht nur unter „Alle" auf,
 *  statt eine Stufe zu verwässern, in die ihn niemand gesteckt hat. */
export function priceBucketOf(r: Pick<MapRestaurant, 'priceRange'>): PriceBucketId | null {
  const min = r.priceRange?.min;
  if (typeof min !== 'number') return null;
  for (const b of PRICE_BUCKETS) {
    if (min >= b.min && (b.max === null || min < b.max)) return b.id;
  }
  return null;
}

export function matchesPriceBucket(
  r: Pick<MapRestaurant, 'priceRange'>,
  bucketId: string
): boolean {
  return priceBucketOf(r) === bucketId;
}
