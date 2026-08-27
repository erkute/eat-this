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

/** The public Must-Eats catalog never reads restaurant or category payloads. */
export function selectInitialMustEatsData(data: InitialMapData): InitialMustEatsData {
  return {
    mustEats: data.mustEats,
    revealedMustEatIds: data.revealedMustEatIds,
  };
}
