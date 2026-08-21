// GENERIERT von `npm run build:email-spots` — nicht von Hand editieren.
// Die Bilder liegen unter public/pics/email/spots/<slug>.jpg.

export interface EmailSpot {
  /** Sanity-Slug — Dateiname der Karte und Ziel des /map?r=-Links. */
  slug: string;
  /** Nur für den Alt-Text; im Bild steht der Name bereits gesetzt. */
  name: string;
  /** „Bezirk · Küche" für den Alt-Text. */
  meta: string;
  /** Inhalts-Hash; haengt als ?v= an der Bild-URL, sonst cacht Gmail ewig. */
  version: string;
}

/** Anzeigebreite in CSS-Pixeln; die JPEGs sind 1072×804 (2x). */
export const SPOT_DISPLAY_WIDTH = 536;
export const SPOT_DISPLAY_HEIGHT = 402;

export const EMAIL_SPOTS: readonly EmailSpot[] = [
  {
    "slug": "sofi",
    "name": "SOFI",
    "meta": "Mitte · Bakery",
    "version": "49c80c79"
  },
  {
    "slug": "gemello",
    "name": "GEMELLO",
    "meta": "Prenzlauer Berg · Italian",
    "version": "fe38e423"
  },
  {
    "slug": "kitten-deli",
    "name": "Kitten Deli",
    "meta": "Neukölln · Bakery",
    "version": "f045da60"
  }
];
