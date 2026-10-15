import type { MapMustEat } from '@/lib/types';
import type { InitialMapData } from './server-initial-map-data';
import { compareCardNumber } from './cardOrder';

// The homepage shows five already-public cards.
const HOME_FACE_UP_COUNT = 5;

export type InitialMustEatsData = Pick<InitialMapData, 'mustEats' | 'revealedMustEatIds'>;

/**
 * The home client islands share useMapData, but only need the visible
 * restaurants and a handful of Must Eats for their initial render. Dropping the
 * map-only collections keeps them out of the HTML/RSC payload. The supplied
 * homepage categories retain their editorial Top-Spots for the map preview.
 */
export function selectHomeInitialMapData(data: InitialMapData): InitialMapData {
  const revealedIds = new Set(data.revealedMustEatIds);
  const seenRestaurants = new Set<string>();
  const faceUp: MapMustEat[] = [];

  // One card per restaurant: every tile carries its restaurant's name, so a
  // second card from the same place reads as a duplicate entry rather than as
  // a second recommendation.
  for (const mustEat of data.mustEats) {
    if (!revealedIds.has(mustEat._id)) continue;
    if (faceUp.length >= HOME_FACE_UP_COUNT) break;
    if (seenRestaurants.has(mustEat.restaurant._id)) continue;
    seenRestaurants.add(mustEat.restaurant._id);
    faceUp.push(mustEat);
  }

  return {
    ...data,
    mustEats: [...faceUp, ...data.mustEats.filter((card) => !revealedIds.has(card._id)).slice(0, 1)],
  };
}

/**
 * The public Must-Eats catalog: EVERY must-eat in the deck, in a fixed order,
 * with only the anon face-up set carrying its dish content.
 *
 * This used to merge two lists, because the map shipped a must-eat only when
 * its spot sat inside the free tier — the page whose whole job is the complete
 * deck saw an arbitrary subset of it. Since the map is free the payload
 * already carries every card, so all that is left here is the ordering.
 *
 * Order is the deck order, and within both bands that is the card number —
 * the figure printed bottom-right on every card, which is what a reader sorts
 * a deck by. Face-up first: those are the product shots, so they belong
 * together — interleaved with the backs they read as a broken checkerboard.
 * The covered band used to run alphabetically by spot, which put a new card
 * somewhere in the middle of the wall instead of at the end where its number
 * says it belongs. The alphabetical spot list under that band is sorted
 * where it is rendered (MustEatsGallery), not by this order.
 */
export function selectMustEatsCatalog(data: InitialMapData): InitialMustEatsData {
  const faceUp = new Set(data.revealedMustEatIds);

  return {
    mustEats: [
      ...data.mustEats.filter((m) => faceUp.has(m._id)).sort(compareCardNumber),
      ...data.mustEats
        .filter((m) => !faceUp.has(m._id))
        .sort(compareCardNumber)
        .map(trimCoveredSpot),
    ],
    revealedMustEatIds: data.revealedMustEatIds,
  };
}

/**
 * Eine verdeckte Karte nennt ihren Spot, mehr nicht.
 *
 * Vom 06.09. bis 15.10.2026 trug sie hier gar keinen Namen (Betreiber: „das
 * ist doch Teil der Überraschung"). Seit dem Neubau der Seite steht unter
 * jeder verdeckten Karte „Verdeckt" und der Spot (Betreiber, 15.10.2026) —
 * welcher Spot eine Karte hält, zeigt die Map ohnehin. Mitgegeben werden
 * deshalb nur Name und Bezirk (der Bezirk, damit er aus dem Namen fällt);
 * Slug, Koordinaten, Adresse und Foto bleiben auf dem Server.
 */
function trimCoveredSpot(mustEat: MapMustEat): MapMustEat {
  const { _id, name, district } = mustEat.restaurant;
  return {
    ...mustEat,
    restaurant: { _id, name, slug: '', lat: 0, lng: 0, ...(district ? { district } : {}) },
  };
}

