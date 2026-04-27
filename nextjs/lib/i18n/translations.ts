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
  hero: {
    tagline: "We tell you what to eat",
    cta: "Create account",
  },
  newsletter: {
    eyebrow: "Stay in the loop",
    title: "New Must-Eats, every week.",
    sub: "Get the latest Berlin spots delivered to your inbox \u2014 plus a free bonus card pack.",
    placeholder: "your@email.com",
    cta: "Subscribe",
    error: "Please enter a valid email address.",
    success: "You\u2019re in! Check your inbox.",
  },
  start: {
    section1Label: "Eat This",
    section1Title: "Probably the BEST food guide you know.",
    section1Body: "The most curated selection of Must-Eats in Berlin. Discover the city via our interactive map and start building your deck.",
    section2Label: "The Concept",
    section2Title: "Just order this.",
    section2Body1: "We hunt down the outstanding dishes. Every Must-Eat Card in your collection represents a recommendation we stand behind\u2014from single iconic plates to entire \u201cMenu Approved\u201d spots.",
    section2Body2: "Register to unlock your first Booster Pack including 10 free Must-Eat Cards. Collect them all, explore the map, and master the Berlin food scene.",
    section2Body3: "",
    section3Label: "Account",
    section3Title: "Be the first to know.",
    section3Body: "Create an account and get 10 free Must-Eat Cards to start your collection.",
    section3Cta: "Create account",
    section4Label: "Our Standards",
    philo1Title: "Pure Curation.",
    philo1Text: "One rule: only the best food. We visit, we taste, we select.",
    philo2Title: "The Deck.",
    philo2Text: "Hundreds of Must-Eats to discover. Build your personal archive of the city\u2019s finest restaurants and caf\u00e9s.",
    philo3Title: "Explore the Map.",
    philo3Text: "Discover the city dish by dish.",
    section5Label: "How we choose",
    section5Title: "Only the best makes the deck.",
    section5Body1: "We visit every place ourselves and talk to the chefs to find the dishes that stand out.",
    section5Body2: "",
    section6Label: "What\u2019s next",
    section6Title: "Berlin is just the first deck.",
    section6Body1: "We are expanding city by city. More decks, more Must-Eats, and exclusive Merch coming soon.",
    section6Cities: "Istanbul, Amsterdam, Paris \u2014 we\u2019re on it.",
    section6Body2: "Same approach, different cities.",
  },
  about: {
    title: "Just order this.",
    // Safe: hardcoded HTML from this constant — not user input
    body: "<h3>The Concept</h3><p>Eat This is a curated food guide for Berlin. We don\u2019t just list places; we find the outstanding dishes you actually need to try.</p><h3>Must-Eat Cards</h3><p>Every recommendation is a card. Collect them, build your deck, and track your culinary journey through the city. New users receive a 10-card Booster Pack upon registration.</p><h3>Pure Curation</h3><p>We visit every spot, talk to the chefs, and only select what truly stands out. No paid content, no noise\u2014just the best food.</p><h3>What\u2019s Next</h3><p>Berlin is our starting point. Istanbul, Amsterdam, and Paris are coming soon. Same rules, different cities.</p>",
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
    filterDinner: "Dinner",
    filterLunch: "Lunch",
    filterCoffee: "Coffee",
    filterBreakfast: "Breakfast",
    filterSweets: "Sweets",
    filterPizza: "Pizza",
    myLocationAriaLabel: "My location",
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
    mustEatsTab: "Must-Eats",
    restaurantOne: "restaurant",
    restaurantMany: "restaurants",
    nearYou: "near you",
    nothingInArea: "No restaurants found near you.",
    openingHours: "Opening Hours",
    insiderTip: "Insider Tip",
    mustEatsCount: "Must-Eats",
    googleMaps: "Google Maps",
    website: "Website",
    share: "Share",
    opens: "Opens",
    closes: "Closes",
    closedToday: "Closed today",
    loadingTitle: "Shuffling your cards",
    loadingSub: "Berlin loading \u00b7 Press Start",
    tooFarToReveal: "Too far to reveal",
    revealHere: "You\u2019re here! Tap to reveal this Must-Eat.",
    awayToUnlock: "away \u2014 come within 200 m to unlock.",
    enableLocation: "Enable location to unlock Must-Eats on-site.",
    mustEatsUnlocked: "Must-Eats unlocked",
    noMustEatsMatch: "No Must-Eats match your filters.",
    hiddenMustEat: "Hidden Must-Eat",
    viewRestaurant: "View restaurant",
    mustEatLabel: "Must-Eat",
    unitsMin: "min",
    unitsH: "h",
  },
  footer: {
    start: "Start",
    news: "News",
    musts: "Eat This",
    map: "Map",
    signIn: "Login / Register",
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
    about: {
      title: "Just order this.",
      // Safe: hardcoded HTML from this constant — not user input
      body: "<h3>Corrections Policy</h3><p>If we publish something wrong, we want to know. Email <a href=\"mailto:hello@eatthisdot.com\">hello@eatthisdot.com</a> with the article and the correction. We aim to fix factual errors within 24 hours and add a visible note at the bottom of the article explaining what was changed and when. Small typos we silently fix; anything that changes the meaning of a piece gets a visible correction.</p><h3>Fact Checking and Sources</h3><p>Everything we write about a restaurant is based on at least one personal visit. Opening hours, addresses and prices are verified with the restaurant before publication and periodically re-checked. When we quote someone, we quote them on the record.</p><h3>Funding and Transparency</h3><p>EAT THIS is currently self-funded and free for readers. If and when we introduce paid partnerships, subscriptions, or sponsored content, they will always be labelled clearly and kept separate from our editorial recommendations. We are not owned by, invested in, or paid by any restaurant, restaurant group or food brand. Full company and contact details are in our Impressum.</p><h3>Editorial Contact</h3><p>Editorial questions, tips, corrections: <a href=\"mailto:hello@eatthisdot.com\">hello@eatthisdot.com</a></p><h3>The Concept</h3><p>Eat This is a curated food guide for Berlin. We don\u2019t just list places; we find the outstanding dishes you actually need to try.</p><h3>Must-Eat Cards</h3><p>Every recommendation is a card. Collect them, build your deck, and track your culinary journey through the city. New users receive a 10-card Booster Pack upon registration.</p><h3>Pure Curation</h3><p>We visit every spot, talk to the chefs, and only select what truly stands out. No paid content, no noise\u2014just the best food.</p><h3>What\u2019s Next</h3><p>Berlin is our starting point. Istanbul, Amsterdam, and Paris are coming soon. Same rules, different cities.</p>",
    },
    contact: {
      title: "Get in touch",
      // Safe: hardcoded HTML from this constant — not user input
      body: "<h3>Restaurant tip?</h3><p>Know a place we absolutely need to try? We\u2019re always looking for new Must Eats. Send us your recommendation and we\u2019ll check it out.</p><h3>Something wrong?</h3><p>A restaurant closed? A dish changed? Help us keep our recommendations accurate. Drop us a line and we\u2019ll update it.</p><h3>Just want to say hi?</h3><p>We\u2019re real people and we read every message. Whether it\u2019s feedback, a question, or just a hello \u2014 we\u2019re here.</p><p><a href=\"mailto:hello@eatthisdot.com\">hello@eatthisdot.com</a></p><p>We usually respond within 24 hours.</p>",
    },
    press: {
      title: "Press & Media",
      // Safe: hardcoded HTML from this constant — not user input
      body: "<h3>About EAT THIS</h3><p>EAT THIS is a curated food guide for Berlin. Instead of overwhelming you with options, we pick the one dish you absolutely have to try at each restaurant. Founded in 2025, we\u2019ve become the go-to source for honest, no-nonsense food recommendations in Berlin.</p><h3>Logo & Assets</h3><p>Our logo and brand assets are available for press use. Please use them as-is and follow our brand guidelines. Contact us for high-resolution files.</p><h3>Press inquiries</h3><p><a href=\"mailto:hello@eatthisdot.com\">hello@eatthisdot.com</a></p>",
    },
    impressum: {
      title: "Impressum",
      // Safe: hardcoded HTML from this constant — not user input
      body: "<h3>Angaben gem\u00e4\u00df \u00a7 5 TMG</h3><p>EAT THIS<br>Berlin, Deutschland<br><a href=\"mailto:hello@eatthisdot.com\">hello@eatthisdot.com</a></p><h3>Verantwortlich f\u00fcr den Inhalt</h3><p>EAT THIS Redaktion, Berlin</p><h3>Haftungsausschluss</h3><p>Die Inhalte dieser Website wurden mit gr\u00f6\u00dfter Sorgfalt erstellt. F\u00fcr die Richtigkeit, Vollst\u00e4ndigkeit und Aktualit\u00e4t der Inhalte k\u00f6nnen wir jedoch keine Gew\u00e4hr \u00fcbernehmen.</p><h3>Urheberrecht</h3><p>Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht.</p>",
    },
    agb: {
      title: "Terms & Conditions",
      // Safe: hardcoded HTML from this constant — not user input
      body: "<h3>Scope</h3><p>These terms apply to the use of the EAT THIS platform, including all content, features and services.</p><h3>Use</h3><p>EAT THIS is an editorial food guide for Berlin. The content is for informational purposes only and does not constitute a commercial recommendation.</p><h3>Liability</h3><p>We make no guarantee as to the timeliness, completeness or accuracy of the information provided.</p><h3>Contact</h3><p>Questions: <a href=\"mailto:hello@eatthisdot.com\">hello@eatthisdot.com</a></p>",
    },
    datenschutz: {
      title: "Privacy Policy",
      // Safe: hardcoded HTML from this constant — not user input
      body: "<h3>Controller</h3><p>EAT THIS, Berlin. Contact: <a href=\"mailto:hello@eatthisdot.com\">hello@eatthisdot.com</a></p><h3>Data Collection</h3><p>When you register, we store your name and email address to manage your account.</p><h3>Cookies</h3><p>We use technically necessary cookies as well as third-party cookies (map, fonts). Details can be found in our Cookie Policy.</p><h3>Your Rights</h3><p>You have the right to access, correct and delete your data at any time. Requests to: <a href=\"mailto:hello@eatthisdot.com\">hello@eatthisdot.com</a></p>",
    },
    cookies: {
      title: "Cookie Policy",
      // Safe: hardcoded HTML from this constant — not user input
      body: "<h3>What are cookies?</h3><p>Cookies are small text files stored on your device when you visit a website. They help save your preferences and improve your browsing experience.</p><h3>How we use cookies</h3><p>EAT THIS uses minimal cookies, mainly from third parties:</p><ul><li><strong>Google Fonts</strong> \u2014 fonts for better typography</li><li><strong>Leaflet / CartoDB</strong> \u2014 tiles for our Food Map</li><li><strong>Instagram / Meta</strong> \u2014 embedded posts</li></ul><h3>Managing cookies</h3><p>You can block or delete cookies at any time in your browser settings. Some features of the site may be limited as a result.</p><h3>Contact</h3><p>Questions? <a href=\"mailto:hello@eatthisdot.com\">hello@eatthisdot.com</a></p>",
    },
    login: {
      titleRegister: "Create account",
      subtitleRegister: "Get your first Starter Pack \u2014 10 Must-Eat Cards, free.",
      titleLogin: "Welcome back",
      subtitleLogin: "Sign in to your account.",
      namePlaceholder: "Name",
      emailPlaceholder: "Email",
      passwordPlaceholder: "Password",
      forgotPassword: "Forgot password?",
      submitRegister: "Create account",
      submitLogin: "Sign in",
      googleBtn: "Continue with Google",
      termsText: "By signing up, you agree to our",
      termsLink: "Terms",
      termsAnd: "and",
      privacyLink: "Privacy Policy",
      dividerOr: "or",
      toggleToLogin: "Already have an account? Log in",
      toggleToRegister: "New here? Sign up",
      landingSignup: "Sign up",
      landingLogin: "Log in",
      backBtn: "Back",
      logoutBtn: "Sign out",
      forgotSuccess: "If an account exists, we\u2019ve sent you a link. Please check your inbox.",
      errors: {
        emailRequired: "Please enter your email address.",
        passwordRequired: "Please enter your password.",
        nameRequired: "Please enter your name.",
        emailRequiredFirst: "Please enter your email address first.",
        emailInUse: "This email is already registered.",
        invalidEmail: "Invalid email address.",
        weakPassword: "Password too weak (min. 6 characters).",
        wrongPassword: "Incorrect password.",
        userNotFound: "No account with this email address.",
        invalidCredential: "Email or password incorrect.",
        tooManyRequests: "Too many attempts \u2014 please wait a moment.",
        tooManyRequestsLong: "Too many attempts \u2014 please try again in an hour.",
        networkFailed: "Network error \u2014 please try again.",
        sendFailed: "Error sending \u2014 please try again.",
        generic: "An error occurred. Please try again.",
      },
      notifications: {
        welcome: "Welcome to EAT THIS, {name}!",
        signedIn: "Hey {name}, good to see you!",
        signedOut: "You have been signed out.",
      },
    },
  },
  profile: {
    signInTitle: "Sign in to EAT THIS",
    signInSub: "Save restaurants, collect your Must Eat deck and manage your account.",
    tab: {
      deck: "My Deck",
      saved: "Saved",
      settings: "Settings",
    },
    saved: {
      empty: "You have no saved restaurants yet.",
      title: "Saved Places",
    },
    deck: {
      boosterSection: "Booster Packs",
      unlockBtn: "Unlock",
      comingSoon: "Coming Soon",
    },
    booster: {
      title: "Booster Packs - Coming Soon",
      sub: "Expand your deck with exclusive dishes",
    },
    settings: {
      displayName: "Display name",
      displayNamePlaceholder: "Your name",
      saveBtn: "Save",
      email: "Email",
      security: "Security",
      resetPassword: "Reset password",
      signOut: "Sign out",
      deleteAccount: "Delete account",
      savedFeedback: "Saved \u2713",
      saveError: "Error saving.",
      emailSent: "Email sent \u2713",
      tryAgain: "Error. Please try again.",
      deleteConfirm: "Are you sure? Your account will be permanently deleted.",
      deleteError: "Error. Please log in again and try again.",
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
  hero: {
    tagline: "Wir sagen dir, was du essen sollst",
    cta: "Konto erstellen",
  },
  newsletter: {
    eyebrow: "Immer up to date",
    title: "Neue Must-Eats, jede Woche.",
    sub: "Die besten neuen Spots aus Berlin \u2014 direkt in dein Postfach.",
    placeholder: "deine@email.com",
    cta: "Anmelden",
    error: "Bitte gib eine g\u00fcltige E-Mail-Adresse ein.",
    success: "Du bist dabei! Schau in dein Postfach.",
  },
  start: {
    section1Title: "Wahrscheinlich der beste Food-Guide, den du kennst.",
    section1Body: "Die kuratierteste Auswahl an Must-Eats in Berlin. Entdecke die Stadt auf unserer interaktiven Karte und starte dein Deck.",
    section2Label: "Das Konzept",
    section2Title: "Bestell genau das.",
    section2Body1: "Wir sp\u00fcren herausragende Gerichte auf. Jede Must-Eat-Karte in deiner Sammlung steht f\u00fcr eine Empfehlung, hinter der wir stehen \u2013 von einzelnen ikonischen Tellern bis hin zu ganzen \u201eMenu Approved\u201c-Spots.",
    section2Body2: "Registriere dich, um dein erstes Booster Pack mit 10 kostenlosen Must-Eat-Karten freizuschalten. Sammle sie alle, erkunde die Karte und meistere die Berliner Food-Szene.",
    section3Label: "Account",
    section3Title: "Sei der Erste.",
    section3Body: "Erstelle einen Account und erhalte 10 kostenlose Must-Eat-Karten f\u00fcr deine Sammlung.",
    section3Cta: "Konto erstellen",
    section4Label: "Unsere Standards",
    philo1Title: "Reine Kuration.",
    philo1Text: "Eine Regel: nur das beste Essen. Wir besuchen, wir kosten, wir w\u00e4hlen aus.",
    philo2Title: "Das Deck.",
    philo2Text: "Hunderte von Must-Eats zu entdecken. Baue dein pers\u00f6nliches Archiv der feinsten Restaurants und Caf\u00e9s der Stadt.",
    philo3Title: "Erkunde die Karte.",
    philo3Text: "Entdecke die Stadt Gericht f\u00fcr Gericht.",
    section5Label: "Wie wir ausw\u00e4hlen",
    section5Title: "Nur das Beste kommt ins Deck.",
    section5Body1: "Wir besuchen jeden Ort selbst und sprechen mit den K\u00f6chen, um die Gerichte zu finden, die wirklich herausragen.",
    section6Label: "Was kommt",
    section6Title: "Berlin ist erst der Anfang.",
    section6Body1: "Wir expandieren Stadt f\u00fcr Stadt. Mehr Decks, mehr Must-Eats und exklusives Merch kommen bald.",
    section6Cities: "Istanbul, Amsterdam, Paris \u2013 wir sind dran.",
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
    filterDinner: "Abendessen",
    filterLunch: "Mittag",
    filterCoffee: "Kaffee",
    filterBreakfast: "Fr\u00fchst\u00fcck",
    filterSweets: "S\u00fc\u00dfes",
    filterPizza: "Pizza",
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
    mustEatsTab: "Must-Eats",
    restaurantOne: "Restaurant",
    restaurantMany: "Restaurants",
    nearYou: "in deiner N\u00e4he",
    nothingInArea: "Keine Restaurants in deiner N\u00e4he gefunden.",
    openingHours: "\u00d6ffnungszeiten",
    insiderTip: "Insider-Tipp",
    mustEatsCount: "Must-Eats",
    googleMaps: "Google Maps",
    website: "Webseite",
    share: "Teilen",
    opens: "\u00d6ffnet",
    closes: "Schlie\u00dft",
    closedToday: "Heute geschlossen",
    loadingTitle: "Die Karten werden gemischt",
    loadingSub: "Berlin l\u00e4dt \u00b7 Press Start",
    tooFarToReveal: "Zu weit weg",
    revealHere: "Du bist da! Tippe, um aufzudecken.",
    awayToUnlock: "entfernt \u2014 komm auf 200 m heran zum Aufdecken.",
    enableLocation: "Aktiviere den Standort, um Must-Eats vor Ort freizuschalten.",
    mustEatsUnlocked: "Must-Eats aufgedeckt",
    noMustEatsMatch: "Keine Must-Eats passen zu deinen Filtern.",
    hiddenMustEat: "Versteckter Must-Eat",
    viewRestaurant: "Restaurant ansehen",
    mustEatLabel: "Must-Eat",
    unitsMin: "Min",
    unitsH: "Std",
  },
  footer: {
    signIn: "Anmelden / Registrieren",
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
      titleRegister: "Konto erstellen",
      subtitleRegister: "Hol dir dein erstes Starter Pack \u2013 10 Must-Eat Cards, kostenlos.",
      titleLogin: "Willkommen zur\u00fcck",
      subtitleLogin: "Melde dich bei deinem Konto an.",
      namePlaceholder: "Name",
      emailPlaceholder: "E-Mail",
      passwordPlaceholder: "Passwort",
      forgotPassword: "Passwort vergessen?",
      submitRegister: "Konto erstellen",
      submitLogin: "Anmelden",
      googleBtn: "Mit Google anmelden",
      termsText: "Mit der Registrierung stimmst du unseren",
      termsLink: "AGB",
      termsAnd: "und der",
      privacyLink: "Datenschutzerkl\u00e4rung",
      toggleToLogin: "Schon dabei? Einloggen",
      toggleToRegister: "Noch kein Konto? Registrieren",
      landingSignup: "Registrieren",
      landingLogin: "Einloggen",
      backBtn: "Zur\u00fcck",
      logoutBtn: "Abmelden",
      errors: {
        emailRequired: "Bitte gib deine E-Mail-Adresse ein.",
        passwordRequired: "Bitte gib dein Passwort ein.",
        nameRequired: "Bitte gib deinen Namen ein.",
        emailRequiredFirst: "Bitte gib zuerst deine E-Mail-Adresse ein.",
        emailInUse: "Diese E-Mail-Adresse ist bereits registriert.",
        invalidEmail: "Ung\u00fcltige E-Mail-Adresse.",
        weakPassword: "Passwort zu schwach (mind. 6 Zeichen).",
        wrongPassword: "Falsches Passwort.",
        userNotFound: "Kein Konto mit dieser E-Mail-Adresse.",
        invalidCredential: "E-Mail oder Passwort falsch.",
        tooManyRequests: "Zu viele Versuche \u2013 bitte warte einen Moment.",
        tooManyRequestsLong: "Zu viele Versuche \u2013 bitte in einer Stunde erneut versuchen.",
        networkFailed: "Netzwerkfehler \u2013 bitte erneut versuchen.",
        sendFailed: "Fehler beim Senden \u2013 bitte erneut versuchen.",
        generic: "Ein Fehler ist aufgetreten. Bitte erneut versuchen.",
      },
      notifications: {
        welcome: "Willkommen bei EAT THIS, {name}!",
        signedIn: "Hey {name}, sch\u00f6n dich zu sehen!",
        signedOut: "Du wurdest abgemeldet.",
      },
    },
  },
  profile: {
    signInTitle: "Bei EAT THIS anmelden",
    signInSub: "Speichere Restaurants, sammel dein Must Eat Deck und verwalte deinen Account.",
    tab: {
      deck: "Mein Deck",
      saved: "Gespeichert",
      settings: "Einstellungen",
    },
    saved: {
      empty: "Du hast noch keine Restaurants gespeichert.",
      title: "Gespeicherte Orte",
    },
    deck: {
      unlockBtn: "Freischalten",
      comingSoon: "Demn\u00e4chst",
    },
    booster: {
      title: "Booster Packs - Demn\u00e4chst",
      sub: "Erweitere dein Deck mit exklusiven Gerichten",
    },
    settings: {
      displayName: "Anzeigename",
      displayNamePlaceholder: "Dein Name",
      saveBtn: "Speichern",
      email: "E-Mail",
      security: "Sicherheit",
      resetPassword: "Passwort zur\u00fccksetzen",
      signOut: "Abmelden",
      deleteAccount: "Account l\u00f6schen",
      savedFeedback: "Gespeichert \u2713",
      saveError: "Fehler beim Speichern.",
      emailSent: "E-Mail gesendet \u2713",
      tryAgain: "Fehler. Bitte erneut versuchen.",
      deleteConfirm: "Bist du sicher? Dein Account wird dauerhaft gel\u00f6scht.",
      deleteError: "Fehler. Bitte neu einloggen und erneut versuchen.",
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

export const MODAL_BODIES: Record<"agb" | "datenschutz" | "cookies", ModalBodySection[]> = {
  agb: [
    { h: "Scope", p: "These terms apply to the use of the EAT THIS platform, including all content, features and services." },
    { h: "Use", p: "EAT THIS is an editorial food guide for Berlin. The content is for informational purposes only and does not constitute a commercial recommendation." },
    { h: "Liability", p: "We make no guarantee as to the timeliness, completeness or accuracy of the information provided." },
    { h: "Contact", p: "Questions: {mail}" },
  ],
  datenschutz: [
    { h: "Controller", p: "EAT THIS, Berlin. Contact: {mail}" },
    { h: "Data Collection", p: "When you register, we store your name and email address to manage your account." },
    { h: "Cookies", p: "We use technically necessary cookies as well as third-party cookies (map, fonts). Details can be found in our Cookie Policy." },
    { h: "Your Rights", p: "You have the right to access, correct and delete your data at any time. Requests to: {mail}" },
  ],
  cookies: [
    { h: "What are cookies?", p: "Cookies are small text files stored on your device when you visit a website. They help save your preferences and improve your browsing experience." },
    {
      h: "How we use cookies",
      p: "EAT THIS uses minimal cookies, mainly from third parties:",
      list: [
        { strong: "Google Fonts", text: " \u2014 fonts for better typography" },
        { strong: "Leaflet / CartoDB", text: " \u2014 tiles for our Food Map" },
        { strong: "Instagram / Meta", text: " \u2014 embedded posts" },
      ],
    },
    { h: "Managing cookies", p: "You can block or delete cookies at any time in your browser settings. Some features of the site may be limited as a result." },
    { h: "Contact", p: "Questions? {mail}" },
  ],
};
