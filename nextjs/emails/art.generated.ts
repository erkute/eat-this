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
  headlineSignup: {
    id: 'headline-signup',
    width: 470,
    height: 112,
    alt: 'WE TELL YOU WHAT TO EAT.',
    version: '219f74e3',
  },
  headlineLogin: {
    id: 'headline-login',
    width: 470,
    height: 113,
    alt: 'WILLKOMMEN ZURÜCK',
    version: 'c7e0360b',
  },
  kickerSignup: {
    id: 'kicker-signup',
    width: 230,
    height: 23,
    alt: 'DEIN ZUGANG ZU EAT THIS',
    version: '89f5c77f',
  },
  kickerLogin: {
    id: 'kicker-login',
    width: 286,
    height: 27,
    alt: 'SCHÖN, DASS DU WIEDER DA BIST',
    version: '9db58440',
  },
  leadSignup: {
    id: 'lead-signup',
    width: 343,
    height: 74,
    alt: 'Wir empfehlen dir gute Spots in Berlin – und mit unseren Must Eats die Gerichte, für die sich der Besuch lohnt.',
    version: '3fd167e2',
  },
  leadLogin: {
    id: 'lead-login',
    width: 340,
    height: 57,
    alt: 'Ein Klick und deine Map ist offen — mit allem, was du schon freigeschaltet hast.',
    version: 'eb93c1cc',
  },
  kickerStarter: {
    id: 'kicker-starter',
    width: 183,
    height: 23,
    alt: 'DEIN STARTER PACK',
    version: 'b3e7b8b5',
  },
  titleStarter: {
    id: 'title-starter',
    width: 270,
    height: 71,
    alt: '20 MUST EATS. GEHT AUF UNS.',
    version: '04c7afdc',
  },
  bodyStarter: {
    id: 'body-starter',
    width: 346,
    height: 123,
    alt: 'Starte mit 20 Must Eat Empfehlungen in Berlin. Jede Karte verrät dir, was du an einem Spot bestellen solltest. Manche sind schon offen, andere deckst du erst vor Ort auf.',
    version: 'f2f3d478',
  },
  titleSpots: {
    id: 'title-spots',
    width: 260,
    height: 19,
    alt: 'DEINE ERSTEN SPOTS',
    version: '49624970',
  },
  sloganInverse: {
    id: 'slogan-inverse',
    width: 192,
    height: 20,
    alt: 'WE TELL YOU WHAT TO EAT',
    version: '5808536e',
  },
  footerFollow: {
    id: 'footer-follow',
    width: 73,
    height: 22,
    alt: 'FOLGEN',
    version: 'cc4e79ec',
  },
  footerInstagram: {
    id: 'footer-instagram',
    width: 194,
    height: 35,
    alt: 'INSTAGRAM',
    version: '9ab626cd',
  },
  footerAbout: {
    id: 'footer-about',
    width: 87,
    height: 24,
    alt: 'ÜBER UNS',
    version: '35d4bde4',
  },
  footerContact: {
    id: 'footer-contact',
    width: 87,
    height: 22,
    alt: 'KONTAKT',
    version: 'fc0d9025',
  },
  footerImpressum: {
    id: 'footer-impressum',
    width: 101,
    height: 22,
    alt: 'IMPRESSUM',
    version: 'ec18883d',
  },
  footerDatenschutz: {
    id: 'footer-datenschutz',
    width: 120,
    height: 22,
    alt: 'DATENSCHUTZ',
    version: 'c4f9a3a2',
  },
  footerAgb: {
    id: 'footer-agb',
    width: 46,
    height: 22,
    alt: 'AGB',
    version: '8fd8d21a',
  },
  footerCopyright: {
    id: 'footer-copyright',
    width: 315,
    height: 21,
    alt: '© 2026 EAT THIS. ALLE RECHTE VORBEHALTEN.',
    version: 'e3cf4d9f',
  },
  headlineLoginEn: {
    id: 'headline-login-en',
    width: 326,
    height: 113,
    alt: 'WELCOME BACK',
    version: 'dffe6405',
  },
  kickerSignupEn: {
    id: 'kicker-signup-en',
    width: 227,
    height: 23,
    alt: 'YOUR ACCESS TO EAT THIS',
    version: 'b341fc38',
  },
  kickerLoginEn: {
    id: 'kicker-login-en',
    width: 217,
    height: 23,
    alt: 'GOOD TO SEE YOU AGAIN',
    version: '1c3b47fa',
  },
  leadSignupEn: {
    id: 'lead-signup-en',
    width: 328,
    height: 74,
    alt: 'We point you to great spots in Berlin – and with our Must Eats, to the dishes that make the visit worth it.',
    version: '2fde3c0c',
  },
  leadLoginEn: {
    id: 'lead-login-en',
    width: 307,
    height: 57,
    alt: 'One click and your map is open, with everything you’ve already unlocked.',
    version: '261224ad',
  },
  kickerStarterEn: {
    id: 'kicker-starter-en',
    width: 186,
    height: 23,
    alt: 'YOUR STARTER PACK',
    version: '7215b230',
  },
  titleStarterEn: {
    id: 'title-starter-en',
    width: 267,
    height: 69,
    alt: '20 MUST EATS. ON US.',
    version: 'd8b20cd0',
  },
  bodyStarterEn: {
    id: 'body-starter-en',
    width: 340,
    height: 99,
    alt: 'Start with 20 Must Eat picks in Berlin. Every card tells you what to order at a spot. Some are already open, others you reveal on site.',
    version: '10429f4f',
  },
  titleSpotsEn: {
    id: 'title-spots-en',
    width: 225,
    height: 19,
    alt: 'YOUR FIRST SPOTS',
    version: '31a41267',
  },
  footerFollowEn: {
    id: 'footer-follow-en',
    width: 75,
    height: 21,
    alt: 'FOLLOW',
    version: 'caad09b9',
  },
  footerAboutEn: {
    id: 'footer-about-en',
    width: 66,
    height: 22,
    alt: 'ABOUT',
    version: 'e0f1d8f8',
  },
  footerContactEn: {
    id: 'footer-contact-en',
    width: 84,
    height: 22,
    alt: 'CONTACT',
    version: 'cc4f356f',
  },
  footerDatenschutzEn: {
    id: 'footer-datenschutz-en',
    width: 78,
    height: 22,
    alt: 'PRIVACY',
    version: 'd6546aef',
  },
  footerAgbEn: {
    id: 'footer-agb-en',
    width: 66,
    height: 22,
    alt: 'TERMS',
    version: '9b07460c',
  },
  footerCopyrightEn: {
    id: 'footer-copyright-en',
    width: 278,
    height: 21,
    alt: '© 2026 EAT THIS. ALL RIGHTS RESERVED.',
    version: '39b1d975',
  },
} as const satisfies Record<string, ArtAsset>;
