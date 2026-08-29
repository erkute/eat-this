import type { MapRestaurant } from '@/lib/types';

/**
 * Die fünf Preisstufen der Karte.
 *
 * Sie haben die Küche als dritten Filter abgelöst (User, 2026-08-27). Der Grund
 * ist nicht Geschmack, sondern Datenlage: `cuisineType` ist ein ungeprüftes
 * Freitextfeld — Sironi ist dort als „Café" gepflegt und ist eine Pizzeria —
 * und die Werte doppelten sich („Kaffee" 8 neben „Café" 69, „Italian / Pizza"
 * neben „Italienisch"). 38 Werte, sechs davon mit genau einem Treffer.
 * `priceRange` ist dagegen auf 435 von 466 Spots gepflegt und schneidet quer
 * zu den Kategorien: 12 der 49 Spots ab 100 € sind kein Fine Dining.
 *
 * **Geschnitten wird am Einstiegspreis** (`min`), nie an `max`. Google gibt
 * pro Laden eine eigene Spanne, keine gemeinsamen Bänder — 28 verschiedene
 * Kombinationen im Katalog, von 1–10 über 20–80 bis 40–100 — und die teuerste
 * Gruppe ist nach oben offen (49 Spots tragen `{min: 100}` ohne Maximum).
 * Deshalb heißt der Picker „Einstiegspreis wählen": „20–40 €" bedeutet, der
 * Einstieg liegt zwischen 20 und 40 €, und das stimmt dann für jeden Spot der
 * Stufe. Ohne diesen Titel las sich dieselbe Zeile als Spanne des Ladens, und
 * das war für 67 von 149 Spots der alten „20–50 €" falsch — ein 40–100-€-Laden
 * stand dort neben einem mit 20–30 € (User, 2026-08-29).
 *
 * Die Grenzen liegen auf echten Werten: Einstiegspreise gibt es nur als
 * 1, 10, 20, 30, 40, 50, 60 und 100, keine Grenze schneidet also mitten durch
 * eine Gruppe. Die oberste Stufe war bis zum 29.08.2026 „ab 50 €" und hielt
 * zwei sehr verschiedene Dinge zusammen: acht Läden mit 50/60 € Einstieg und
 * die 49 offenen Spannen ab 100 € — Rutz, Nobelhart, Coda. Geteilt wurde bei
 * 100, und die Grenze darunter wanderte von 50 auf 40: bei 50 wären in der
 * mittleren Stufe nur acht Spots übrig geblieben, bei 40 sind es 30, und von
 * denen liegt keiner über 100 €.
 *
 * Belegte Stufen im Katalog (prod, 29.08.2026): 96 · 133 · 127 · 30 · 49.
 *
 * Die Küche bleibt **suchbar** — `useMapFilters` durchsucht `cuisineType`
 * weiter. Wer „vietnamesisch" tippt, findet es; es steht nur nicht mehr als
 * Dropdown mit 38 Zeilen da.
 */
export const PRICE_BUCKETS = [
  { id: 'u10', min: 0, max: 10, labelKey: 'map.priceUnder10' },
  { id: '10', min: 10, max: 20, labelKey: 'map.price10to20' },
  { id: '20', min: 20, max: 40, labelKey: 'map.price20to40' },
  { id: '40', min: 40, max: 100, labelKey: 'map.price40to100' },
  { id: '100', min: 100, max: null, labelKey: 'map.priceFrom100' },
] as const;

export type PriceBucketId = (typeof PRICE_BUCKETS)[number]['id'];

const BY_ID = new Map<string, (typeof PRICE_BUCKETS)[number]>(PRICE_BUCKETS.map((b) => [b.id, b]));

export function isPriceBucketId(value: string): value is PriceBucketId {
  return BY_ID.has(value);
}

/** Übersetzungsschlüssel einer Stufe. Steht hier statt in der Leiste, damit
 *  eine neue Stufe ihre Beschriftung nicht vergessen kann — genau das prüft
 *  priceBuckets.test.ts für beide Sprachen. */
export function priceBucketLabelKey(id: string): string {
  return BY_ID.get(id)?.labelKey ?? id;
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
