// GENERIERT von `npm run build:email-art` — nicht von Hand editieren.
// Die Maße stammen aus den fertig zugeschnittenen PNGs, damit die Templates
// nie eine Breite hardcoden, die bei neuem Text auseinanderläuft.

/** False, solange die echte Markenschrift fehlt und Schoolbell einspringt. @public */
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
  "leadSignup": {
    "id": "lead-signup",
    "width": 295,
    "height": 84,
    "alt": "Entdecke Berlins beste Restaurants, Cafés und Bars, probiere ihre Must Eats und sammle sie in deinem Deck. Alles auf einer Map.",
    "version": "35095af6"
  },
  "leadLogin": {
    "id": "lead-login",
    "width": 274,
    "height": 38,
    "alt": "Hier geht’s zurück zu deiner Map und deiner Sammlung.",
    "version": "771fc29e"
  },
  "kickerStarter": {
    "id": "kicker-starter",
    "width": 196,
    "height": 24,
    "alt": "DEIN STARTER PACK",
    "version": "61ce1d1a"
  },
  "titleStarter": {
    "id": "title-starter",
    "width": 350,
    "height": 51,
    "alt": "20 Must Eats.",
    "version": "9193f36d"
  },
  "bodyStarter": {
    "id": "body-starter",
    "width": 346,
    "height": 78,
    "alt": "10 Karten liegen sofort offen in deinem Deck. Die anderen 10 deckst du direkt am Spot auf.",
    "version": "f1152884"
  },
  "ctaAnmelden": {
    "id": "cta-anmelden",
    "width": 103,
    "height": 34,
    "alt": "Anmelden",
    "version": "3780968d"
  },
  "ctaSignUp": {
    "id": "cta-sign-up",
    "width": 81,
    "height": 34,
    "alt": "Sign up",
    "version": "871f1dbc"
  },
  "ctaSignIn": {
    "id": "cta-sign-in",
    "width": 75,
    "height": 34,
    "alt": "Sign in",
    "version": "1d507ec6"
  },
  "leadSignupEn": {
    "id": "lead-signup-en",
    "width": 298,
    "height": 85,
    "alt": "Discover Berlin’s best restaurants, cafés and bars, try their Must Eats and collect them in your deck. All on one map.",
    "version": "5732473e"
  },
  "leadLoginEn": {
    "id": "lead-login-en",
    "width": 278,
    "height": 15,
    "alt": "Back to your map and your collection.",
    "version": "71572ffd"
  },
  "kickerStarterEn": {
    "id": "kicker-starter-en",
    "width": 204,
    "height": 24,
    "alt": "YOUR STARTER PACK",
    "version": "74bff22f"
  },
  "titleStarterEn": {
    "id": "title-starter-en",
    "width": 355,
    "height": 52,
    "alt": "20 Must Eats.",
    "version": "e2453fbb"
  },
  "bodyStarterEn": {
    "id": "body-starter-en",
    "width": 332,
    "height": 53,
    "alt": "10 cards go straight into your deck face up. Reveal the other 10 at the spots.",
    "version": "f60e577e"
  },
  "masthead": {
    "id": "masthead",
    "width": 600,
    "height": 170,
    "alt": "Eat This",
    "version": "7e5ce455"
  },
  "heroMustEat": {
    "id": "hero-must-eat",
    "width": 180,
    "height": 248,
    "alt": "Hamachi Head — Must Eat Card",
    "version": "a5bb98d8"
  },
  "introSignup": {
    "id": "intro-signup",
    "width": 600,
    "height": 151,
    "alt": "DEIN ANMELDELINK WE TELL YOU WHAT TO EAT.",
    "version": "42af29bc"
  },
  "introSignupEn": {
    "id": "intro-signup-en",
    "width": 600,
    "height": 152,
    "alt": "YOUR SIGN-IN LINK WE TELL YOU WHAT TO EAT.",
    "version": "5be30d5b"
  },
  "introLogin": {
    "id": "intro-login",
    "width": 600,
    "height": 222,
    "alt": "SCHÖN, DASS DU WIEDER DA BIST Willkommen zurück.",
    "version": "f6ca0c1e"
  },
  "introLoginEn": {
    "id": "intro-login-en",
    "width": 600,
    "height": 216,
    "alt": "GOOD TO SEE YOU AGAIN Welcome back.",
    "version": "ce1cbdaa"
  },
  "footerBrand": {
    "id": "footer-brand",
    "width": 600,
    "height": 138,
    "alt": "Eat This — we tell you what to eat",
    "version": "aea4ceec"
  },
  "footerInstagram": {
    "id": "footer-instagram",
    "width": 600,
    "height": 52,
    "alt": "Instagram",
    "version": "bc64b6d2"
  },
  "footerAbout": {
    "id": "footer-about",
    "width": 300,
    "height": 34,
    "alt": "Über uns",
    "version": "8e01e192"
  },
  "footerContact": {
    "id": "footer-contact",
    "width": 300,
    "height": 34,
    "alt": "Kontakt",
    "version": "c07ba295"
  },
  "footerImpressum": {
    "id": "footer-impressum",
    "width": 200,
    "height": 34,
    "alt": "Impressum",
    "version": "cde765a1"
  },
  "footerDatenschutz": {
    "id": "footer-datenschutz",
    "width": 200,
    "height": 34,
    "alt": "Datenschutz",
    "version": "c764c9d2"
  },
  "footerAgb": {
    "id": "footer-agb",
    "width": 200,
    "height": 34,
    "alt": "AGB",
    "version": "2e40e969"
  },
  "footerCopyright": {
    "id": "footer-copyright",
    "width": 600,
    "height": 58,
    "alt": "© 2026 Eat This. Alle Rechte vorbehalten.",
    "version": "680f3527"
  },
  "footerAboutEn": {
    "id": "footer-about-en",
    "width": 300,
    "height": 34,
    "alt": "About",
    "version": "64c5ebc4"
  },
  "footerContactEn": {
    "id": "footer-contact-en",
    "width": 300,
    "height": 34,
    "alt": "Contact",
    "version": "7ab96e13"
  },
  "footerDatenschutzEn": {
    "id": "footer-datenschutz-en",
    "width": 200,
    "height": 34,
    "alt": "Privacy",
    "version": "a1228970"
  },
  "footerAgbEn": {
    "id": "footer-agb-en",
    "width": 200,
    "height": 34,
    "alt": "Terms",
    "version": "a9735996"
  },
  "footerCopyrightEn": {
    "id": "footer-copyright-en",
    "width": 600,
    "height": 58,
    "alt": "© 2026 Eat This. All rights reserved.",
    "version": "efb7393c"
  }
} as const satisfies Record<string, ArtAsset>;
