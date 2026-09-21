// GENERIERT von `npm run build:email-art` — nicht von Hand editieren.
// Die Maße stammen aus den fertig zugeschnittenen PNGs, damit die Templates
// nie eine Breite hardcoden, die bei neuem Text auseinanderläuft.

/** False, solange die echte Markenschrift fehlt und Schoolbell einspringt. */
export const BRAND_FACE_AVAILABLE = true;

export interface ArtAsset {
  /** Datei unter /pics/email/, ohne Endung. */
  id: string;
  /** Anzeigebreite in CSS-Pixeln (das PNG selbst ist 2x). */
  width: number;
  height: number;
  /** Volle Wortlaut-Fassung für Clients mit blockierten Bildern. */
  alt: string;
  /** Inhalts-Hash; haengt als ?v= an der URL, sonst cacht Gmail ewig. */
  version: string;
}

export const ART = {
  "headlineSignup": {
    "id": "headline-signup",
    "width": 470,
    "height": 114,
    "alt": "WE TELL YOU WHAT TO EAT",
    "version": "f6603545"
  },
  "headlineLogin": {
    "id": "headline-login",
    "width": 470,
    "height": 113,
    "alt": "WILLKOMMEN ZURÜCK",
    "version": "c7e0360b"
  },
  "titleStarterPack": {
    "id": "title-starter-pack",
    "width": 210,
    "height": 23,
    "alt": "STARTER PACK",
    "version": "72748eec"
  },
  "sloganInverse": {
    "id": "slogan-inverse",
    "width": 192,
    "height": 20,
    "alt": "WE TELL YOU WHAT TO EAT",
    "version": "5808536e"
  },
  "kickerSignup": {
    "id": "kicker-signup",
    "width": 220,
    "height": 23,
    "alt": "WAS DU ESSEN SOLLTEST",
    "version": "491f6c57"
  },
  "kickerLogin": {
    "id": "kicker-login",
    "width": 296,
    "height": 27,
    "alt": "SCHÖN, DASS DU WIEDER DA BIST",
    "version": "78794ace"
  },
  "titleSpots": {
    "id": "title-spots",
    "width": 290,
    "height": 17,
    "alt": "SCHON MAL REINSCHAUEN",
    "version": "abf1d1c9"
  }
} as const satisfies Record<string, ArtAsset>;
