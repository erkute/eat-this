// GENERIERT von `npm run build:email-spots` — nicht von Hand editieren.
// Die Bilder liegen unter public/pics/email/spots/<slug>.jpg.

interface EmailSpot {
  /** Sanity-Slug — Dateiname der Karte und Ziel des /map?r=-Links. */
  slug: string;
  /** Nur für den Alt-Text; im Bild steht der Name bereits gesetzt. */
  name: string;
  /** Der Bezirk, für den Alt-Text. */
  meta: string;
  /** Inhalts-Hash; haengt als ?v= an der Bild-URL, sonst cacht Gmail ewig. */
  version: string;
}

export const EMAIL_SPOTS: readonly EmailSpot[] = [
  {
    "slug": "crapulix",
    "name": "Crapulix",
    "meta": "Steglitz",
    "version": "142a394f"
  },
  {
    "slug": "bursa-uludag-kebapcisi",
    "name": "Bursa Uludağ Kebapçısı",
    "meta": "Schöneberg",
    "version": "02ed7c7b"
  },
  {
    "slug": "bar-basta",
    "name": "Bar Basta",
    "meta": "Mitte",
    "version": "dd51422f"
  }
];
