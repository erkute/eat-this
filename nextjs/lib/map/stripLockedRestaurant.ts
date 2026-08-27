import type { MapRestaurant } from '@/lib/types';

// Locked spots ship to anon/free viewers as grey pins, as ordinary rows in the
// map list, and as LockedDetail when one is opened — never as a full detail
// sheet. So the fields that ONLY that sheet or the server-side tier composition
// read are dead weight in the anon payload, multiplied across ~270 spots.
//
// Kept (still rendered/filtered for locked): name, slug, lat, lng, bezirk/
// district, categories, cuisineType, openingHours (open-now pill + filter),
// photo (LockedDetail's hero + the list row's card), mustEatCount (pin
// styling).
// Dropped: tierAnon/tierSigned (server tier logic), und von priceRange alles
// außer `min`.
//
// priceRange stand bis zum 27.08.2026 komplett auf der Dropped-Liste, mit der
// Begründung „detail-only". Seit der Preis den Küchen-Filter abgelöst hat,
// stimmt das nicht mehr: ohne den Wert fielen die ~270 gesperrten Spots aus
// jeder Preisstufe heraus, der Picker zählte 99 statt 465, und ein Filter, der
// die halbe Karte verschweigt, ist schlimmer als keiner. Behalten wird nur
// `min` — daran schneiden die Stufen (siehe priceBuckets.ts); `max` und
// `currency` liest allein die Detailseite, die ein gesperrter Spot nie zeigt.
//
// MUST run on the FINAL locked array only — spot-of-day promotion pulls full
// objects out of `all`, so a promoted spot keeps every field.
export function stripLockedRestaurants(locked: MapRestaurant[]): MapRestaurant[] {
  return locked.map((r) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omit-by-destructure
    const { priceRange, tierAnon, tierSigned, ...keep } = r;
    return typeof priceRange?.min === 'number'
      ? { ...keep, priceRange: { min: priceRange.min } }
      : keep;
  });
}
