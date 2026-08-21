// GENERIERT von `npm run build:email-art` — nicht von Hand editieren.
// Die Maße stammen aus den fertig zugeschnittenen PNGs, damit die Templates
// nie eine Breite hardcoden, die bei neuem Text auseinanderläuft.

/** False, solange die echte Markenschrift fehlt und Schoolbell einspringt. */
export const BRAND_FACE_AVAILABLE = false;

export interface ArtAsset {
  /** Datei unter /pics/email/, ohne Endung. */
  id: string;
  /** Anzeigebreite in CSS-Pixeln (das PNG selbst ist 2x). */
  width: number;
  height: number;
  /** Volle Wortlaut-Fassung für Clients mit blockierten Bildern. */
  alt: string;
}

export const ART = {
  "headlineSignup": {
    "id": "headline-signup",
    "width": 470,
    "height": 157,
    "alt": "WE TELL YOU WHAT TO EAT"
  },
  "headlineLogin": {
    "id": "headline-login",
    "width": 470,
    "height": 154,
    "alt": "WILLKOMMEN ZURÜCK"
  },
  "titleStarterPack": {
    "id": "title-starter-pack",
    "width": 210,
    "height": 34,
    "alt": "STARTER PACK"
  },
  "sloganInverse": {
    "id": "slogan-inverse",
    "width": 172,
    "height": 10,
    "alt": "WE TELL YOU WHAT TO EAT"
  },
  "titleSpots": {
    "id": "title-spots",
    "width": 290,
    "height": 25,
    "alt": "SCHON MAL REINSCHAUEN"
  }
} as const satisfies Record<string, ArtAsset>;
