// GENERIERT von `npm run build:email-spots` — nicht von Hand editieren.
// Die Bilder liegen unter public/pics/email/spots/<slug>.jpg.

export interface EmailSpot {
  /** Sanity-Slug — Dateiname der Karte und Ziel des /map?r=-Links. */
  slug: string;
  /** Nur für den Alt-Text; im Bild steht der Name bereits gesetzt. */
  name: string;
  /** Der Bezirk, für den Alt-Text. */
  meta: string;
  /** Inhalts-Hash; haengt als ?v= an der Bild-URL, sonst cacht Gmail ewig. */
  version: string;
}

/** Anzeigebreite in CSS-Pixeln; die JPEGs sind 1072×804 (2x). */
export const SPOT_DISPLAY_WIDTH = 536;

export const EMAIL_SPOTS: readonly EmailSpot[] = [
  {
    slug: 'sofi',
    name: 'SOFI',
    meta: 'Mitte',
    version: 'b4627f3a',
  },
  {
    slug: 'tacos-el-rey',
    name: 'Tacos el Rey',
    meta: 'Kreuzberg',
    version: 'b003eb4b',
  },
  {
    slug: 'gemello',
    name: 'GEMELLO',
    meta: 'Prenzlauer Berg',
    version: '61dd32a8',
  },
];
