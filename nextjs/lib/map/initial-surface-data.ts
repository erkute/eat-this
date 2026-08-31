import type { MapMustEat } from '@/lib/types';
import type { InitialMapData } from './server-initial-map-data';

// The teaser row is mostly face-down with a couple of face-up cards between
// them, so the payload has to carry both kinds — it used to filter the covered
// ones out entirely, which left the home page as the only Must-Eat surface in
// the product that never showed a card back. Covered cards cost almost nothing
// to ship: stripCoveredMustEats has already reduced them to id, order and the
// restaurant ref before this runs.
const HOME_FACE_UP_COUNT = 2;
const HOME_FACE_DOWN_COUNT = 4;

export type InitialMustEatsData = Pick<InitialMapData, 'mustEats' | 'revealedMustEatIds'>;

/**
 * The home client islands share useMapData, but only need the visible
 * restaurants and a handful of Must Eats for their initial render. Dropping the
 * map-only collections keeps them out of the HTML/RSC payload.
 */
export function selectHomeInitialMapData(data: InitialMapData): InitialMapData {
  const revealedIds = new Set(data.revealedMustEatIds);
  const seenRestaurants = new Set<string>();
  const faceUp: MapMustEat[] = [];
  const faceDown: MapMustEat[] = [];

  // One card per restaurant: every tile carries its restaurant's name, so a
  // second card from the same place reads as a duplicate entry rather than as
  // a second recommendation.
  for (const mustEat of data.mustEats) {
    const isFaceUp = revealedIds.has(mustEat._id);
    const bucket = isFaceUp ? faceUp : faceDown;
    const limit = isFaceUp ? HOME_FACE_UP_COUNT : HOME_FACE_DOWN_COUNT;
    if (bucket.length >= limit) continue;
    if (seenRestaurants.has(mustEat.restaurant._id)) continue;
    seenRestaurants.add(mustEat.restaurant._id);
    bucket.push(mustEat);
  }

  return {
    ...data,
    // Map-only, and only useful next to a locked spot — home renders none.
    lockedRestaurants: [],
    categories: [],
    mustEats: [...faceUp, ...faceDown],
  };
}

/**
 * The public Must-Eats catalog: EVERY must-eat in the catalog, in a fixed
 * order, with only the anon face-up set carrying its dish content.
 *
 * The map ships a must-eat only when its spot is inside the free tier, which
 * left /must-eats showing an arbitrary subset — the page whose whole job is
 * the complete deck. `catalog` is the full Sanity list; cards the anon payload
 * already carries keep their (authorized, hydrated) version, the rest join as
 * metadata-only. Nothing new is published: a covered card is id + order +
 * restaurant ref after `stripCoveredMustEats`, and the restaurant names are
 * public on the map's locked list already.
 *
 * Order is the deck order: face-up first by card number, then the covered ones
 * by restaurant name. The face-up cards are the product shots, so they belong
 * together — interleaved with the backs they read as a broken checkerboard.
 */
export function selectMustEatsCatalog(
  data: InitialMapData,
  catalog: MapMustEat[]
): InitialMustEatsData {
  const faceUp = new Set(data.revealedMustEatIds);
  const authorized = new Map(data.mustEats.map((m) => [m._id, m]));
  const complete = catalog.map((m) => authorized.get(m._id) ?? m);

  return {
    mustEats: [
      ...complete.filter((m) => faceUp.has(m._id)).sort(byCardNumber),
      ...complete
        .filter((m) => !faceUp.has(m._id))
        .sort(byRestaurantName)
        .map(trimCoveredSpot),
    ],
    revealedMustEatIds: data.revealedMustEatIds,
  };
}

/** A covered card renders its spot's NAME and nothing else, so that is all its
 *  restaurant ref keeps here. `mapMustEatsQuery` also projects `address` and
 *  `photo`, and this page reaches spots the map leaves out entirely — without
 *  the trim, widening the catalog would publish the street address of a spot
 *  that is still behind the paywall. */
function trimCoveredSpot(mustEat: MapMustEat): MapMustEat {
  const { _id, name, slug, lat, lng } = mustEat.restaurant;
  return { ...mustEat, restaurant: { _id, name, slug, lat, lng } };
}

function byCardNumber(a: MapMustEat, b: MapMustEat): number {
  const diff = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
  return diff !== 0 ? diff : a._id.localeCompare(b._id);
}

function byRestaurantName(a: MapMustEat, b: MapMustEat): number {
  const diff = a.restaurant.name.localeCompare(b.restaurant.name, 'de');
  return diff !== 0 ? diff : a._id.localeCompare(b._id);
}
