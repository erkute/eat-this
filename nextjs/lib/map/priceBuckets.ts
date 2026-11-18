import type { MapRestaurant } from '@/lib/types';

/**
 * Die fünf Preisstufen der Karte.
 *
 * Der dritte Filter ist der Preis, nicht die Küche. Der Grund ist die
 * Datenlage: `cuisineType` ist ein ungeprüftes Freitextfeld mit doppelten und
 * falschen Werten („Kaffee" neben „Café", „Italian / Pizza" neben
 * „Italienisch"), viele davon mit genau einem Treffer. `priceRange` ist dagegen
 * auf fast allen Spots gepflegt und schneidet quer zu den Kategorien.
 *
 * **Geschnitten wird am Einstiegspreis** (`min`), nie an `max`. Google gibt pro
 * Laden eine eigene Spanne, keine gemeinsamen Bänder (von 1–10 über 20–80 bis
 * 40–100), und die teuerste Gruppe ist nach oben offen (`{min: 100}` ohne
 * Maximum). „20–40 €" heißt also: Der Einstieg liegt zwischen 20 und 40 €, und
 * das stimmt dann für jeden Spot der Stufe. Der Picker heißt nur „Preis
 * wählen"; dieselbe Zeile kann deshalb als Spanne des Ladens gelesen werden.
 * Wer die Verwechslung ausschließen will, tut es über die Beschriftung, nicht
 * über den Schnitt.
 *
 * Die Grenzen liegen auf echten Werten: Einstiegspreise gibt es nur als 1, 10,
 * 20, 30, 40, 50, 60 und 100, keine Grenze schneidet also mitten durch eine
 * Gruppe. Die oberste Stufe beginnt bei 100: So stehen die offenen Spannen
 * (Rutz, Nobelhart, Coda) für sich, getrennt von den wenigen Läden mit 50/60 €
 * Einstieg. Die Grenze darunter liegt bei 40, damit die mittlere Stufe nicht
 * fast leer ist.
 *
 * Die Küche bleibt **suchbar**: `useMapFilters` durchsucht `cuisineType`. Wer
 * „vietnamesisch" tippt, findet es; es steht nur nicht als Dropdown mit
 * Dutzenden Zeilen da.
 */
export const PRICE_BUCKETS = [
  { id: 'u10', min: 0, max: 10, labelKey: 'map.priceUnder10' },
  { id: '10', min: 10, max: 20, labelKey: 'map.price10to20' },
  { id: '20', min: 20, max: 40, labelKey: 'map.price20to40' },
  { id: '40', min: 40, max: 100, labelKey: 'map.price40to100' },
  { id: '100', min: 100, max: null, labelKey: 'map.priceFrom100' },
] as const;

type PriceBucketId = (typeof PRICE_BUCKETS)[number]['id'];

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

/** Compact chip text: leaves all four filters visible on narrow phones.
 *  The picker and accessible button name retain the full translated label. */
export function priceBucketChipLabel(id: string): string {
  const bucket = BY_ID.get(id);
  if (!bucket) return id;
  if (bucket.max === null) return `${bucket.min}+ €`;
  if (bucket.min === 0) return `<${bucket.max} €`;
  return `${bucket.min}–${bucket.max} €`;
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
