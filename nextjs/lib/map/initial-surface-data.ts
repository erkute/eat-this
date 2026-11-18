import type { MapMustEat } from '@/lib/types';
import type { InitialMapData } from './server-initial-map-data';
import { compareCardNumber } from './cardOrder';

// The homepage shows five already-public cards.
const HOME_FACE_UP_COUNT = 5;

export type InitialMustEatsData = Pick<InitialMapData, 'mustEats' | 'revealedMustEatIds'>;

/**
 * The home teaser shares useMapData but renders only its cards and their
 * embedded spot details. Map-only collections stay out of the HTML/RSC payload.
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
    restaurants: [],
    categories: [],
    mustEats: [...faceUp, ...data.mustEats.filter((card) => !revealedIds.has(card._id)).slice(0, 1)],
  };
}

/**
 * The public Must-Eats catalog: every must-eat in the deck, in a fixed order,
 * with only the anon face-up set carrying its dish content.
 *
 * Order is the deck order, and within both bands the card number, the figure
 * printed on every card. Face-up first: those are the product shots and belong
 * together; interleaved with the backs they read as a broken checkerboard. The
 * alphabetical spot list under the covered band is sorted where it is rendered
 * (MustEatsGallery).
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
 * Unter jeder verdeckten Karte steht „Verdeckt" und der Spot; welcher Spot eine
 * Karte hält, zeigt die Map ohnehin. Mitgegeben werden deshalb nur Name, Bezirk
 * (der Bezirk, damit er aus dem Namen fällt) und Slug: Jede Karte der Seite
 * führt auf ihren Spot in der Map (`/map?r=`). Koordinaten, Adresse und Foto
 * bleiben auf dem Server.
 */
function trimCoveredSpot(mustEat: MapMustEat): MapMustEat {
  const { _id, name, slug, district } = mustEat.restaurant;
  return {
    ...mustEat,
    restaurant: { _id, name, slug, lat: 0, lng: 0, ...(district ? { district } : {}) },
  };
}

