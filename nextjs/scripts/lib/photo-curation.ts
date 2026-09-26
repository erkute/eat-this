/**
 * Pure helpers for importing Google Places photos: the fetch width and the
 * owner-photo test that decides which photos may become hero or gallery.
 * Kept free of network access so it is unit-testable.
 */

/**
 * Breite, mit der Fotos bei der Places Photo API abgeholt werden.
 *
 * Stand 28.08.2026 lagen dadurch 138 von 466 Hero-Fotos unter 1200px und 323
 * von 685 Galeriebildern — zu wenig fuer die 900px breite Bildspalte der
 * Detailseite, die auf einem 2x-Schirm 1800 Geraetepixel will. Die API gibt
 * bis 4800px her und rechnet pro Anfrage ab, nicht pro Pixel: breiter zu
 * ziehen kostet beim Import nichts, nur Sanity-Speicher.
 *
 * Aendert nur, was ab jetzt importiert wird — Bestandsfotos bleiben so klein,
 * wie sie geholt wurden, und brauchen einen Nachimport.
 */
export const PLACES_PHOTO_MAX_WIDTH_PX = 2400;

// Normalise for comparison: lower-case, German umlauts → ae/oe/ue/ss, strip
// remaining accents, drop everything non-alphanumeric.
const normName = (s: string) =>
  s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

// Generic words that don't identify a specific business — a business's own
// Google name often varies these (e.g. "Albatross Bäckerei" vs "Albatross
// Bakery"), so they must not be required for an owner match.
const GENERIC_NAME_WORDS = new Set([
  'restaurant',
  'cafe',
  'bar',
  'bakery',
  'baeckerei',
  'coffee',
  'kaffee',
  'kitchen',
  'deli',
  'pizza',
  'pizzeria',
  'ristorante',
  'trattoria',
  'osteria',
  'bistro',
  'bistrot',
  'eis',
  'eiscafe',
  'icecream',
  'ice',
  'cream',
  'gelato',
  'shop',
  'club',
  'haus',
  'house',
  'berlin',
  'the',
  'und',
  'and',
  'der',
  'die',
  'das',
  'le',
  'la',
  'el',
  'di',
  'by',
  'gmbh',
]);

/** The distinctive words of a restaurant name, normalised — generic words and
 *  very short tokens removed. "Albatross Bäckerei" → ["albatross"]. */
function distinctiveTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !GENERIC_NAME_WORDS.has(t));
}

/** Owner-uploaded Places photos carry the business name as their author
 *  attribution (e.g. "Foto: 136 Berlin Restaurant"); guest photos carry a
 *  person's name. We match on the restaurant's DISTINCTIVE words so a business
 *  whose Google name varies the generic part still counts — "Albatross Bakery"
 *  matches "Albatross Bäckerei" on the shared token "albatross". A spot whose
 *  name is entirely generic/short falls back to a whole-name containment check.
 *
 *  ONE strong token is enough, not all of them. The uploading Google profile
 *  frequently carries a different name than the Places entry — "Zeus Pizza &
 *  Pide" uploads as "Zeus Pizzeria – Friedrichshain", "ABC - Allans Breakfast
 *  Club" as "Allan's ABC", "Ushido - Japanese bbq" as plain "Ushido". Requiring
 *  every token rejected all three, and with them 13 genuine owner photos.
 *  The trade-off is a guest whose display name happens to contain the brand
 *  word ("Annabelle" for a spot called "Anna"); the 4-char floor keeps that
 *  rare, and a wrong hero is a Studio correction, not a broken page. */
export function isOwnerPhoto(
  displayName: string | null | undefined,
  restaurantName: string
): boolean {
  if (!displayName) return false;
  const dn = normName(displayName);
  const toks = distinctiveTokens(restaurantName);
  // A distinctive word of 4+ chars is a reliable brand signal — match on the
  // tokens so name variants (Bakery/Bäckerei, dropped suffixes) still count.
  const strong = toks.filter((t) => t.length >= 4);
  if (strong.length) {
    return strong.some((t) => dn.includes(t));
  }
  // Short / numeric / all-generic names ("963") — a substring would false-match
  // a guest who merely contains the token, so require the display to BE the name.
  const rn = normName(restaurantName);
  return rn.length >= 3 && dn === rn;
}
