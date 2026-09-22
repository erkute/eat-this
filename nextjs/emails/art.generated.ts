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
    version: 'e9789d86',
  },
  headlineLogin: {
    id: 'headline-login',
    width: 470,
    height: 113,
    alt: 'WILLKOMMEN ZURÜCK',
    version: '85ae6e5a',
  },
  kickerSignup: {
    id: 'kicker-signup',
    width: 240,
    height: 23,
    alt: 'DEIN ZUGANG ZU EAT THIS',
    version: '6c9e661b',
  },
  kickerLogin: {
    id: 'kicker-login',
    width: 296,
    height: 27,
    alt: 'SCHÖN, DASS DU WIEDER DA BIST',
    version: '78794ace',
  },
  leadSignup: {
    id: 'lead-signup',
    width: 333,
    height: 74,
    alt: 'Wir empfehlen dir gute Spots in Berlin und unsere Must Eat Gerichte, für die sich der Besuch lohnt.',
    version: '837ad147',
  },
  leadLogin: {
    id: 'lead-login',
    width: 349,
    height: 57,
    alt: 'Ein Klick und deine Map ist offen — mit allem, was du schon freigeschaltet hast.',
    version: '9cd65b41',
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
    width: 350,
    height: 61,
    alt: '20 MUST EATS. KOSTENLOS ZUM START.',
    version: '79542be3',
  },
  bodyStarter: {
    id: 'body-starter',
    width: 346,
    height: 123,
    alt: 'Starte mit 20 Must Eat Empfehlungen in Berlin. Jede Karte verrät dir, was du an einem Spot bestellen solltest. Manche sind schon offen, andere deckst du erst vor Ort auf.',
    version: 'f2f3d478',
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
    version: '353e143b',
  },
  kickerSignupEn: {
    id: 'kicker-signup-en',
    width: 237,
    height: 23,
    alt: 'YOUR ACCESS TO EAT THIS',
    version: '76367fa3',
  },
  kickerLoginEn: {
    id: 'kicker-login-en',
    width: 227,
    height: 23,
    alt: 'GOOD TO SEE YOU AGAIN',
    version: '38d73f8a',
  },
  leadSignupEn: {
    id: 'lead-signup-en',
    width: 346,
    height: 74,
    alt: 'We recommend great spots in Berlin and our Must Eat dishes that make the visit worth it.',
    version: '3b3ba1d7',
  },
  leadLoginEn: {
    id: 'lead-login-en',
    width: 317,
    height: 57,
    alt: 'One click and your map is open, with everything you’ve already unlocked.',
    version: 'f9a91844',
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
    width: 233,
    height: 61,
    alt: '20 MUST EATS. FREE TO START.',
    version: 'ddaf8c02',
  },
  bodyStarterEn: {
    id: 'body-starter-en',
    width: 340,
    height: 99,
    alt: 'Start with 20 Must Eat picks in Berlin. Every card tells you what to order at a spot. Some are already open, others you reveal on site.',
    version: '10429f4f',
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
