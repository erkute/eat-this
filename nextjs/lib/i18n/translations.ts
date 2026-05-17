/* ============================================
   EAT THIS — Translation dictionary
   EN is the source of truth. DE is a deep merge of EN with DE overrides.
   All HTML values in modals come from this constant — not from user input.
   ============================================ */

const en = {
  a11y: {
    skip: "Skip to content",
  },
  nav: {
    searchAriaLabel: "Search",
    menuAriaLabel: "Menu",
    closeAriaLabel: "Close",
  },
  musts: {
    sectionLabel: "Berlin",
    subtitle: "The dishes you can\u2019t leave Berlin without trying.",
  },
  news: {
    sectionLabel: "Berlin",
    sectionTitle: "Food News",
    errorLoad: "Could not load articles. Please try again later.",
    back: "Back",
    more: "More from Eat This",
  },
  map: {
    searchPlaceholder: "Restaurant, district, pizza\u2026",
    openNow: "Open",
    filterAll: "All",
    myLocationAriaLabel: "My location",
    restaurantsListAriaLabel: "Restaurants nearby",
    mustEatsListAriaLabel: "Must Eats",
    open: "Open",
    closed: "Closed",
    reserve: "Reserve",
    restaurantOne: "spot",
    restaurantMany: "spots",
    openingHours: "Opening Hours",
    insiderTip: "Insider Tip",
    mustEatsCount: "Must Eats",
    googleMaps: "Google Maps",
    website: "Website",
    share: "Share",
    save: "Save",
    address: "Address",
    opens: "Opens",
    closes: "Closes",
    loadingTitle: "Shuffling your cards",
    loadingSub: "Berlin loading",
    tooFarToReveal: "Too far to reveal",
    revealHere: "You\u2019re here! Tap to reveal this Must Eat.",
    awayToUnlock: "away \u2014 come within 200 m to unlock.",
    enableLocation: "Enable location to unlock Must Eats on-site.",
    viewRestaurant: "View restaurant",
    mustEatLabel: "Must Eat",
    unitsMin: "min",
    unitsH: "h",
    backToRestaurant: "Back to restaurant",
    sectionUnlocked: "Unlocked",
    sectionLocked: "Not yet discovered",
    lockedBadge: "Locked",
    boosterTitle: "Hungry for more?",
    boosterDesc: "One category from €2.99. Or all of Berlin for €20.",
    boosterCta: "Grab a pack",
    phone: "Phone",
    searchClose: "Close search",
    searchOpenAria: "Search",
    filterChipCategory: "Category",
    filterChipBezirk: "District",
    filterChipCuisine: "Cuisine",
    filterChipOpen: "Open now",
    pickerCategoryTitle: "Pick a category",
    pickerBezirkTitle: "Pick a district",
    pickerCuisineTitle: "Pick a cuisine",
    anonUnlockTitle: "This spot is still locked.",
    anonUnlockBody: "Sign in to unlock this spot.",
    anonUnlockCta: "Sign in",
    anonUnlockCancel: "Cancel",
    emptyTitle: "Quiet here.",
    emptyBody: "Adjust a filter or pan the map to find a spot.",
  },
  breadcrumb: {
    aria: "Breadcrumb",
    home: "Home",
    districts: "Districts",
    categories: "Categories",
  },
  footer: {
    start: "Start",
    news: "News",
    musts: "Eat This",
    map: "Map",
    signIn: "Sign in",
    about: "About",
    contact: "Contact",
    press: "Press",
    impressum: "Impressum",
    datenschutz: "Privacy",
    agb: "Terms",
    copyright: "\u00a9 2026 Eat This. All rights reserved.",
  },
  burger: {
    about: "About",
    contact: "Contact",
    press: "Press",
    impressum: "Impressum",
    restaurants: "Restaurants",
  },
  theme: {
    darkMode: "Dark Mode",
  },
  search: {
    placeholder: "What are you craving?",
    hint: "Start typing to search...",
    noResults: "No results for",
    noResultsSub: "Try a different search term",
    mustEats: "Must Eats",
    news: "News",
    restaurants: "Restaurants",
  },
  cookie: {
    text: "We use cookies to give you the best experience.",
    moreInfo: "Learn more",
    accept: "Accept",
    decline: "Decline",
  },
  modals: {
    agb: {
      title: "Terms & Conditions",
    },
    datenschutz: {
      title: "Privacy Policy",
    },
    login: {
      emailPlaceholder: "Email",
      googleBtn: "Continue with Google",
      termsLink: "Terms",
      privacyLink: "Privacy Policy",
      sendLinkBtn: "Sign in",
      linkSentHint: "Check your inbox.",
      sentTitle: "Magic Link's on its way.",
      heroHeadline: "Hundreds of Must Eats\nto discover",
      tagline: "We tell you what to eat",
      resendBtn: "Resend",
      backBtn: "Back",
    },
  },
};

export type TranslationsShape = typeof en;
export type Lang = "en" | "de";

// ─── Deep merge ────────────────────────────────────────────────────────────
// Used to build DE by overlaying overrides on top of EN fallbacks.

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown> ? DeepPartial<T[K]> : T[K];
};

function deepMerge(base: unknown, overrides: unknown): unknown {
  if (
    base !== null &&
    typeof base === "object" &&
    !Array.isArray(base) &&
    overrides !== null &&
    typeof overrides === "object" &&
    !Array.isArray(overrides)
  ) {
    const result = { ...(base as Record<string, unknown>) };
    for (const [k, v] of Object.entries(overrides as Record<string, unknown>)) {
      if (v !== undefined) result[k] = deepMerge(result[k], v);
    }
    return result;
  }
  return overrides !== undefined ? overrides : base;
}

// ─── German overrides ──────────────────────────────────────────────────────
// Only keys that differ from EN need to be listed here.

const deOverrides: DeepPartial<TranslationsShape> = {
  a11y: {
    skip: "Zum Inhalt springen",
  },
  musts: {
    subtitle: "Die Gerichte, die du in Berlin nicht verpassen darfst.",
  },
  news: {
    errorLoad: "Artikel konnten nicht geladen werden. Bitte versuche es sp\u00e4ter erneut.",
    back: "Zur\u00fcck",
    more: "Mehr von Eat This",
  },
  map: {
    filterAll: "Alle",
    myLocationAriaLabel: "Mein Standort",
    restaurantsListAriaLabel: "Restaurants in der N\u00e4he",
    mustEatsListAriaLabel: "Must Eats",
    searchPlaceholder: "Restaurant, Bezirk, Pizza\u2026",
    openNow: "Offen",
    open: "Ge\u00f6ffnet",
    closed: "Geschlossen",
    reserve: "Reservieren",
    restaurantOne: "Ort",
    restaurantMany: "Orte",
    openingHours: "\u00d6ffnungszeiten",
    insiderTip: "Insider-Tipp",
    mustEatsCount: "Must Eats",
    googleMaps: "Google Maps",
    website: "Webseite",
    share: "Teilen",
    save: "Speichern",
    address: "Adresse",
    opens: "\u00d6ffnet",
    closes: "Schlie\u00dft",
    loadingTitle: "Die Karten werden gemischt",
    loadingSub: "Berlin l\u00e4dt",
    tooFarToReveal: "Zu weit weg",
    revealHere: "Du bist da! Tippe, um aufzudecken.",
    awayToUnlock: "entfernt \u2014 komm auf 200 m heran zum Aufdecken.",
    enableLocation: "Aktiviere den Standort, um Must Eats vor Ort freizuschalten.",
    viewRestaurant: "Restaurant ansehen",
    mustEatLabel: "Must Eat",
    unitsMin: "Min",
    unitsH: "Std",
    backToRestaurant: "Zurück zum Restaurant",
    sectionUnlocked: "Freigeschaltet",
    sectionLocked: "Noch nicht entdeckt",
    lockedBadge: "Verschlossen",
    boosterTitle: "Hunger auf mehr?",
    boosterDesc: "Eine Kategorie ab 2,99 €. Oder ganz Berlin für 20 €.",
    boosterCta: "Pack holen",
    phone: "Telefon",
    searchClose: "Suche schließen",
    searchOpenAria: "Suchen",
    filterChipCategory: "Kategorie",
    filterChipBezirk: "Bezirk",
    filterChipCuisine: "Küche",
    filterChipOpen: "Jetzt geöffnet",
    pickerCategoryTitle: "Kategorie wählen",
    pickerBezirkTitle: "Bezirk wählen",
    pickerCuisineTitle: "Küche wählen",
    anonUnlockTitle: "Dieser Spot ist noch zu.",
    anonUnlockBody: "Melde dich an, um diesen Spot freizuschalten.",
    anonUnlockCta: "Anmelden",
    anonUnlockCancel: "Abbrechen",
    emptyTitle: "Hier ist's grad still.",
    emptyBody: "Filter anpassen oder Karte verschieben.",
  },
  breadcrumb: {
    home: "Start",
    districts: "Bezirke",
    categories: "Kategorien",
  },
  footer: {
    signIn: "Anmelden",
    about: "\u00dcber uns",
    contact: "Kontakt",
    press: "Presse",
    datenschutz: "Datenschutz",
    agb: "AGB",
    copyright: "\u00a9 2026 Eat This. Alle Rechte vorbehalten.",
  },
  burger: {
    about: "\u00dcber uns",
    contact: "Kontakt",
    press: "Presse",
    impressum: "Impressum",
    restaurants: "Restaurants",
  },
  theme: {
    darkMode: "Dark Mode",
  },
  cookie: {
    text: "Wir verwenden Cookies, um dir das beste Erlebnis zu bieten.",
    moreInfo: "Mehr erfahren",
    accept: "Akzeptieren",
    decline: "Ablehnen",
  },
  search: {
    placeholder: "Worauf hast du Appetit?",
    hint: "Tippen zum Suchen\u2026",
    noResults: "Keine Ergebnisse f\u00fcr",
    noResultsSub: "Versuche einen anderen Suchbegriff",
  },
  modals: {
    datenschutz: {
      title: "Datenschutz",
    },
    agb: {
      title: "AGB",
    },
    login: {
      emailPlaceholder: "E-Mail",
      googleBtn: "Mit Google anmelden",
      termsLink: "AGB",
      privacyLink: "Datenschutzerkl\u00e4rung",
      sendLinkBtn: "Anmelden",
      linkSentHint: "Schau in deine Inbox.",
      sentTitle: "Magic Link unterwegs.",
      heroHeadline: "Hunderte Must Eats\nzum Entdecken",
      resendBtn: "Nochmal senden",
      backBtn: "Zur\u00fcck",
    },
  },
};

const de = deepMerge(en, deOverrides) as TranslationsShape;

export const translations: Record<Lang, TranslationsShape> = { en, de };

/* ============================================
   Modal bodies — structured, React-rendered.
   Use {mail} as a placeholder for the contact email link.
   Content is hardcoded here (not user input), currently English-only.
   ============================================ */

export type ModalBodySection = {
  h: string;
  p: string;
  list?: Array<{ strong: string; text: string }>;
};

export const MODAL_CONTACT_EMAIL = "hello@eatthisdot.com";
