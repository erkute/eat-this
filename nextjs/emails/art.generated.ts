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
    "width": 176,
    "height": 12,
    "alt": "DEIN STARTER PACK",
    "version": "0b067e53"
  },
  "titleStarter": {
    "id": "title-starter",
    "width": 330,
    "height": 39,
    "alt": "20 Must Eats.",
    "version": "af8b4fc3"
  },
  "bodyStarter": {
    "id": "body-starter",
    "width": 280,
    "height": 38,
    "alt": "Alle 20 Karten liegen sofort offen in deinem Deck.",
    "version": "45c9ab26"
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
    "width": 184,
    "height": 12,
    "alt": "YOUR STARTER PACK",
    "version": "f4a9c91c"
  },
  "titleStarterEn": {
    "id": "title-starter-en",
    "width": 335,
    "height": 40,
    "alt": "20 Must Eats.",
    "version": "3b5f24bb"
  },
  "bodyStarterEn": {
    "id": "body-starter-en",
    "width": 300,
    "height": 41,
    "alt": "All 20 cards go straight into your deck face up.",
    "version": "3a3b3a83"
  },
  "masthead": {
    "id": "masthead",
    "width": 600,
    "height": 170,
    "alt": "Eat This",
    "version": "58bc7ef1"
  },
  "heroMustEat": {
    "id": "hero-must-eat",
    "width": 180,
    "height": 248,
    "alt": "Hamachi Head — Must Eat Card",
    "version": "6a0c1670"
  },
  "introSignup": {
    "id": "intro-signup",
    "width": 600,
    "height": 151,
    "alt": "DEIN ANMELDELINK WE TELL YOU WHAT TO EAT.",
    "version": "e383c222"
  },
  "introSignupEn": {
    "id": "intro-signup-en",
    "width": 600,
    "height": 152,
    "alt": "YOUR SIGN-IN LINK WE TELL YOU WHAT TO EAT.",
    "version": "f0068f52"
  },
  "introLogin": {
    "id": "intro-login",
    "width": 600,
    "height": 222,
    "alt": "SCHÖN, DASS DU WIEDER DA BIST Willkommen zurück.",
    "version": "45550ac8"
  },
  "introLoginEn": {
    "id": "intro-login-en",
    "width": 600,
    "height": 216,
    "alt": "GOOD TO SEE YOU AGAIN Welcome back.",
    "version": "e8b27ec1"
  },
  "footerBrand": {
    "id": "footer-brand",
    "width": 600,
    "height": 182,
    "alt": "Eat This — we tell you what to eat",
    "version": "9e564b16"
  },
  "footerInstagram": {
    "id": "footer-instagram",
    "width": 600,
    "height": 52,
    "alt": "Instagram",
    "version": "8b66d4c2"
  },
  "footerAbout": {
    "id": "footer-about",
    "width": 300,
    "height": 34,
    "alt": "Über uns",
    "version": "f1f3246e"
  },
  "footerContact": {
    "id": "footer-contact",
    "width": 300,
    "height": 34,
    "alt": "Kontakt",
    "version": "290d07ba"
  },
  "footerImpressum": {
    "id": "footer-impressum",
    "width": 200,
    "height": 34,
    "alt": "Impressum",
    "version": "33678638"
  },
  "footerDatenschutz": {
    "id": "footer-datenschutz",
    "width": 200,
    "height": 34,
    "alt": "Datenschutz",
    "version": "76898175"
  },
  "footerAgb": {
    "id": "footer-agb",
    "width": 200,
    "height": 34,
    "alt": "AGB",
    "version": "c4dde140"
  },
  "footerCopyright": {
    "id": "footer-copyright",
    "width": 600,
    "height": 58,
    "alt": "© 2026 Eat This. Alle Rechte vorbehalten.",
    "version": "f4adc559"
  },
  "footerAboutEn": {
    "id": "footer-about-en",
    "width": 300,
    "height": 34,
    "alt": "About",
    "version": "8f9c08d0"
  },
  "footerContactEn": {
    "id": "footer-contact-en",
    "width": 300,
    "height": 34,
    "alt": "Contact",
    "version": "105f338e"
  },
  "footerDatenschutzEn": {
    "id": "footer-datenschutz-en",
    "width": 200,
    "height": 34,
    "alt": "Privacy",
    "version": "0b49ecf8"
  },
  "footerAgbEn": {
    "id": "footer-agb-en",
    "width": 200,
    "height": 34,
    "alt": "Terms",
    "version": "df439e1b"
  },
  "footerCopyrightEn": {
    "id": "footer-copyright-en",
    "width": 600,
    "height": 58,
    "alt": "© 2026 Eat This. All rights reserved.",
    "version": "00b187fa"
  }
} as const satisfies Record<string, ArtAsset>;
