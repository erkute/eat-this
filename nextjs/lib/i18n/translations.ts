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
    cityLabel: "Berlin",
    sectionLabel: "Map",
    sectionTitle: "",
    searchPlaceholder: "Restaurant, district, pizza\u2026",
    openNow: "Open",
    filterAll: "All",
    myLocationAriaLabel: "My location",
    restaurantsListAriaLabel: "Restaurants nearby",
    mustEatsListAriaLabel: "Must Eats",
    errorMapLoad: "Could not load map",
    locationDenied: "Location access denied",
    locationUnavailable: "Location unavailable",
    locationTimeout: "Location timeout",
    locationError: "Could not get location",
    nearby: "Nearby",
    nearbyAll: "Also in this area",
    nearbyMore: "Swipe for more",
    open: "Open",
    closed: "Closed",
    openInMaps: "Open in Maps",
    reserve: "Reserve",
    allBezirke: "All districts",
    restaurantsTab: "Restaurants",
    mustEatsTab: "Must Eats",
    restaurantOne: "restaurant",
    restaurantMany: "restaurants",
    nearYou: "near you",
    nothingInArea: "No restaurants found near you.",
    signInLockedTitle: "Map locked.",
    signInLockedBody: "Sign in to see your spots.",
    signInLockedCta: "Sign in",
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
    mustEatsUnlocked: "Must Eats unlocked",
    noMustEatsMatch: "No Must Eats match your filters.",
    hiddenMustEat: "Hidden Must Eat",
    viewRestaurant: "View restaurant",
    mustEatLabel: "Must Eat",
    unitsMin: "min",
    unitsH: "h",
    filterReset: "Reset filter",
    layerRestaurants: "Restaurants",
    layerMustEats: "Must Eats",
    layerSwitchAria: "Switch between restaurants and must eats",
    backToRestaurant: "Back to restaurant",
    sectionUnlocked: "Unlocked",
    sectionLocked: "Not yet discovered",
    lockedBadge: "Locked",
    boosterTitle: "Hungry for more?",
    boosterDesc: "One category from €2.99. Or all of Berlin for €20.",
    boosterCta: "Grab a pack",
    sortLabel: "Sort by",
    sortDistance: "Distance",
    sortPrice: "Price",
    sortNewest: "Newest",
    sortDirAriaAsc: "Ascending — tap to reverse",
    sortDirAriaDesc: "Descending — tap to reverse",
    phone: "Phone",
    openOnlyLabel: "Open only",
    bezirkLabel: "District",
    searchClose: "Close search",
    searchOpenAria: "Search",
    filterSortAria: "Filter and sort",
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
    nearby: "In deiner N\u00e4he",
    nearbyAll: "Weitere im Bereich",
    nearbyMore: "Mehr entdecken",
    locationDenied: "Standortzugriff verweigert",
    locationUnavailable: "Standort nicht verf\u00fcgbar",
    locationTimeout: "Standort-Zeitlimit",
    locationError: "Standort konnte nicht ermittelt werden",
    searchPlaceholder: "Restaurant, Bezirk, Pizza\u2026",
    openNow: "Offen",
    open: "Ge\u00f6ffnet",
    closed: "Geschlossen",
    openInMaps: "In Maps \u00f6ffnen",
    reserve: "Reservieren",
    allBezirke: "Alle Bezirke",
    restaurantsTab: "Restaurants",
    mustEatsTab: "Must Eats",
    restaurantOne: "Restaurant",
    restaurantMany: "Restaurants",
    nearYou: "in deiner N\u00e4he",
    nothingInArea: "Keine Restaurants in deiner N\u00e4he gefunden.",
    signInLockedTitle: "Map gesperrt.",
    signInLockedBody: "Melde dich an, um deine Spots zu sehen.",
    signInLockedCta: "Anmelden",
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
    mustEatsUnlocked: "Must Eats aufgedeckt",
    noMustEatsMatch: "Keine Must Eats passen zu deinen Filtern.",
    hiddenMustEat: "Versteckter Must Eat",
    viewRestaurant: "Restaurant ansehen",
    mustEatLabel: "Must Eat",
    unitsMin: "Min",
    unitsH: "Std",
    filterReset: "Filter zurücksetzen",
    layerRestaurants: "Restaurants",
    layerMustEats: "Must Eats",
    layerSwitchAria: "Zwischen Restaurants und Must Eats wechseln",
    backToRestaurant: "Zurück zum Restaurant",
    sectionUnlocked: "Freigeschaltet",
    sectionLocked: "Noch nicht entdeckt",
    lockedBadge: "Verschlossen",
    boosterTitle: "Hunger auf mehr?",
    boosterDesc: "Eine Kategorie ab 2,99 €. Oder ganz Berlin für 20 €.",
    boosterCta: "Pack holen",
    sortLabel: "Sortieren",
    sortDistance: "Distanz",
    sortPrice: "Preis",
    sortNewest: "Neueste",
    sortDirAriaAsc: "Aufsteigend — tippen zum Umkehren",
    sortDirAriaDesc: "Absteigend — tippen zum Umkehren",
    phone: "Telefon",
    openOnlyLabel: "Nur Geöffnete",
    bezirkLabel: "Bezirk",
    searchClose: "Suche schließen",
    searchOpenAria: "Suchen",
    filterSortAria: "Filter und Sortierung",
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
