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
    categories: [],
    mustEats: [...faceUp, ...faceDown],
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
      ...data.mustEats.filter((m) => faceUp.has(m._id)).sort(byCardNumber),
      ...data.mustEats
        .filter((m) => !faceUp.has(m._id))
        .sort(byCardNumber)
        .map(trimCoveredSpot),
    ],
    revealedMustEatIds: data.revealedMustEatIds,
  };
}

/**
 * Eine verdeckte Karte verrät ihren Spot nicht.
 *
 * Bis zum 06.09.2026 behielt sie den Namen — die Seite druckte darunter die
 * Liste aller Lokale, die eine Karte halten. Die ist raus (Betreiber: „das ist
 * doch Teil der Überraschung"), und damit hat auch die Nutzlast dort nichts
 * mehr verloren: was im RSC-Payload steht, steht im Quelltext.
 *
 * Die Felder bleiben als leere Zeichenketten statt zu verschwinden, weil
 * `MapMustEat.restaurant` sie überall sonst braucht — auf der Map und im
 * Album, wo der Spot einer verdeckten Karte gerade die Aufgabe IST. Nur diese
 * eine Seite kennt ihn nicht.
 */
function trimCoveredSpot(mustEat: MapMustEat): MapMustEat {
  const { _id } = mustEat.restaurant;
  return { ...mustEat, restaurant: { _id, name: '', slug: '', lat: 0, lng: 0 } };
}

function byCardNumber(a: MapMustEat, b: MapMustEat): number {
  const diff = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
  return diff !== 0 ? diff : a._id.localeCompare(b._id);
}
