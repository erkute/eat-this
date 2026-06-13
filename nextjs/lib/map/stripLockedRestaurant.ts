import type { MapRestaurant } from '@/lib/types'

// Locked spots ship to anon/free viewers as blurred teaser cards + grey pins
// and never open a detail sheet (a locked card routes to the booster flow).
// So the fields that ONLY the detail sheet or server-side tier composition
// read are dead weight in the anon payload — multiplied across ~270 spots the
// visitor can't actually see.
//
// Kept (still rendered/filtered for locked): name, slug, lat, lng, bezirk/
// district, categories, cuisineType, openingHours (open-now pill + filter),
// photo (blurred preview), mustEatCount (pin styling).
// Dropped: priceRange (detail-only), tierAnon/tierSigned (server tier logic).
//
// MUST run on the FINAL locked array only — spot-of-day promotion pulls full
// objects out of `all`, so a promoted spot keeps every field.
export function stripLockedRestaurants(locked: MapRestaurant[]): MapRestaurant[] {
  return locked.map((r) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omit-by-destructure
    const { priceRange, tierAnon, tierSigned, ...keep } = r
    return keep
  })
}
