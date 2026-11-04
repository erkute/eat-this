/* ============================================
   EAT THIS — Translation dictionary
   EN is the source of truth. DE is a deep merge of EN with DE overrides.
   All HTML values in modals come from this constant — not from user input.
   ============================================ */

const en = {
  a11y: {
    skip: 'Skip to content',
  },
  mustEats: {
    // Alt-Text der verdeckten Karte, gleiches Wort wie auf der Pack-Seite.
    covered: 'Covered',
    howItWorks: 'How does it work?',
    onb1Kicker: 'Must Eats',
    onb1Title: 'What will you try next?',
    onb1Body: 'Our favourite dishes in Berlin, as cards for your collection. Pick what you’re going to try next.',
    onb2Kicker: 'Out in Berlin',
    onb2Title: 'Your next find.',
    onb2Body: 'Find hidden cards on the map. Head to the spot, allow location access and reveal the card with a tap. One more for your deck.',
    onb3Kicker: 'For your deck',
    onb3Title: 'More to discover.',
    onb3Body:
      'Add more Must Eats to your deck with Booster Packs, without visiting each spot first. New cards, new dishes to try.',
    onbFlipAria: 'Flip the card',
    // Last slide, logged-out variant. Selling a paid Booster Pack to someone
    // without an account skips a rung: the Starter Pack is the offer that
    // actually applies to them.
    onbStarterKicker: 'Your collection',
    onbStarterTitle: 'Your first pack.',
    onbStarterBody:
      'Of the {mustEatCount} Must Eats currently in Berlin, 10 are already revealed. Your Starter Pack reveals 20 more. Discover the rest at the spots themselves. More are added over time.',
    onbStarterCta: 'Sign in',
    onbNext: 'Next',
    onbStart: "Let's go",
    onbPacksCta: 'Packs',
    onbClose: 'Close',
    teaserTitle: 'Must Eats',
    teaserSub: 'Berlin has a lot on the menu. We tell you what to order – and you collect the recommendations as cards in your own deck.',
    teaserCta: 'All Must Eats',
    teaserMystery: 'What’s inside?',
    teaserTap: 'Tap the card.',
  },
  news: {},
  map: {
    openNow: 'Open',
    filterAll: 'All',
    myLocationAriaLabel: 'My location',
    // The locate control wears this until a position is shared. It talks the
    // way the rest of the map does ("You're here.", "Tap the card.") — a bare
    // "Locate" would be a system control, not ours. The covered card's
    // no-location state says the same thing, deliberately.
    restaurantsListAriaLabel: 'Restaurants nearby',
    open: 'Open',
    closed: 'Closed',
    reserve: 'Reserve',
    openingHours: 'Opening Hours',
    insiderTip: 'Insider Tip',
    mustEatsExplainer: 'What you should order here.',
    photos: 'Photos',
    share: 'Share',
    address: 'Address',
    category: 'Category',
    price: 'Price',
    maps: 'Maps',
    opens: 'Opens',
    closes: 'Closes',
    // Accessible names for the covered card itself — the only thing a screen
    // reader gets, so they name the state and the action rather than repeating
    // the visible copy.
    tooFarToReveal: 'Too far to reveal',
    revealHere: 'Reveal now. Tap the card.',
    unitsMin: 'min',
    unitsH: 'h',
    boosterTitle: 'Hungry for more?',
    boosterDesc: 'Unlock more Must Eats right away with a Booster Pack.',
    boosterCta: 'Unlock more',
    starterCta: 'Sign up',
    searchClose: 'Close search',
    pickerClose: 'Close filters',
    filterChipCategory: 'Category',
    filterMustEats: 'Must Eats',
    filterChipBezirk: 'District',
    filterChipPrice: 'Price',
    filterChipOpen: 'Open now',
    filterChipClear: 'Clear filter',
    pickerCategoryTitle: 'Pick a category',
    pickerBezirkTitle: 'Pick a district',
    pickerPriceTitle: 'Pick a price',
    priceUnder10: 'under €10',
    price10to20: '€10–20',
    price20to40: '€20–40',
    price40to100: '€40–100',
    priceFrom100: '€100+',
    inRestaurant: 'In the restaurant',
    toSpot: 'To the spot',
    zoomCard: 'Zoom card',
    swipeHint: 'Swipe to browse',
    pagerAria: 'Switch Must Eat',
    pagerPrev: 'Previous Must Eat',
    pagerNext: 'Next Must Eat',
    walkMinutes: 'on foot',
    starterPromoTitle: 'Starter Pack',
    starterPromoBody: 'Already {mustEatCount} Must Eats across Berlin. Your Starter Pack shows you the first ones. Discover the rest at the spots themselves.',
    /* Two states, two texts. The kicker names WHICH of them you are in, the
       heading is the same either way, and the button says what it clears —
       "Reset filters" was wrong for someone who had only typed something. */
    emptyTitle: 'This plate stays empty.',
    emptyKickerSearch: 'Your search',
    emptyKickerFilter: 'Your filters',
    emptyKickerBoth: 'Search and filters',
    emptyBodySearch: 'Nothing on the map for “{query}”. Try a spot, a dish or a neighbourhood.',
    emptyBodyFilter:
      'We didn’t find any spots for this combination of filters. Remove a filter and keep looking.',
    emptyBodyBoth: 'With these filters nothing fits “{query}”. Drop one.',
    emptyReset: 'Clear all filters',
    emptyResetSearch: 'Clear search',
    // Card metaphor, matching the reveal mechanic. The map list no longer has a
    // locked variant of its own — every match is a row, and this is the one
    // place that names the state.
    hiddenMustEatAria: 'Hidden Must Eat',
    mustEatAtAria: 'Must Eat at {name}',
    // The covered card carries two lines: state on top, action below — and no
    // number at all. First "8.2 km to go" and "get within 50 m" stood on top of
    // each other and read as arithmetic; then the distance stood alone and made
    // the spot look far and like hard work, while the rule below it ("on site")
    // never said what there was to win. The map shows how far it is; these two
    // lines explain the card and name the prize.
    proximityHere: "You're here.",
    proximityAway: 'Still face-down',
    // The location states live in their own chip under the dish line, not in
    // the dish line itself: the line belongs to the dish, the chip to the
    // browser permission. Without a fix the chip is the button that asks.
    locationAllow: 'Allow location',
    // Screen-reader name of the covered card only: visibly, a denied permission
    // is a notice in the central toast (lib/notice.ts), the same
    // one the map and the home page show.
    locationBlocked: 'Location blocked',
    proximityTapReveal: 'Tap it and see what to order here.',
    // Makes the card worth wanting instead of just explaining the rule: it names
    // the prize first and puts the condition second.
    proximityHint:
      'What to order here, you find out right at the spot. That is where you flip the card and add it to your deck.',
    revealCollected: 'New in your collection',
    revealError: "That didn't work.",
    revealRetry: 'Tap the card again.',
  },
  breadcrumb: {},
  footer: {
    signIn: 'Sign in',
    about: 'About me',
    contact: 'Contact',
    impressum: 'Impressum',
    datenschutz: 'Privacy',
    agb: 'Terms',
    cookieSettings: 'Cookie settings',
    copyright: '\u00a9 2026 Eat This. All rights reserved.',
  },
  burger: {
    about: 'About me',
    contact: 'Contact',
    impressum: 'Impressum',
    map: 'Map',
    mustEats: 'Must Eats',
    categories: 'Categories',
    districts: 'Districts',
    fragRemy: 'Ask Remy',
    magazine: 'Magazine',
    boosterPacks: 'Booster Packs',
    profile: 'Profile',
    signIn: 'Sign in',
  },
  deck: {
    anonymous: 'this deck',
    metaTitle: 'A deck on Eat This',
    metaTitleNamed: "{name}'s deck on Eat This",
    /* Der Satz, der in WhatsApp unter der Vorschaukarte steht. Er muss die
       Frage „warum schickt der mir das" beantworten, bevor jemand klickt. */
    metaDescription:
      '{done} of {total} cards flipped. Over a hundred spots in Berlin, and because discovering beats searching, every Must Eat is a card.',
    metaDescriptionNamed:
      '{name} has flipped {done} of {total} cards. Over a hundred spots in Berlin, and because discovering beats searching, every Must Eat is a card.',
    /* Der Stand als Herausforderung. */
    challenge:
      '{done, plural, =0 {{name} is just getting started.} one {{name} has 1 of {total} Must Eats.} other {{name} has # of {total} Must Eats.}}',
    challengeFull: '{name} has all {total} Must Eats.',
    challengeAnon:
      '{done, plural, =0 {This deck is just getting started.} other {# of {total} Must Eats flipped.}}',
    dare: 'Can you beat that?',
    dareFull: 'Can you match that?',
    dareStart: 'Who gets there first?',
    mapLabel: 'The map',
    mapBody: 'Hand-picked restaurants, cafés and bars across Berlin — and what to order there.',
    collectLabel: 'Must Eats',
    collectBody:
      'The dishes you should not miss. Go there, flip them and collect them in your deck.',
    toMap: 'To the map',
    signIn: 'Sign up',
  },
  profile: {
    avatarError: 'Your character could not be saved. Please try again.',
    albumCard: 'Card',
    deckHeading: 'Your deck',
    albumCount: 'of {total} Must Eats',
    tab_account: 'Account',
    fieldName: 'Name',
    fieldEmail: 'Email',
    nameSaving: 'Saving …',
    nameSaved: 'Name saved.',
    nameError: 'Your name could not be saved. Please try again.',
    collectionProgress: '{done} of {total} cards',
    spotsSearch: 'Search your spots …',
    searchEmpty: 'No matches. Try a different search.',
    spotsAll: 'All',
    spotsFilterLabel: 'Filter saved spots',
    spotsFilterEmpty: 'No spots in this selection yet.',
    starterPack: 'Starter Pack',
    avatarChoice1: 'Spot Scout',
    avatarChoice2: 'Spice Diva',
    avatarChoice3: 'Chef Slice',
    emptySpots: 'Nothing saved yet. Tap a spot on the map and hit the heart — it lands here.',
    toMap: 'To the map',
    removeSaved: 'Remove {name} from saved',
    spotNoteLabel: 'Note on {name}',
    spotNotePlaceholder: 'Add a note …',
    spotWantTo: 'Want to go',
    spotWasThere: 'Been there',
    spotWasThereAsk: 'Been there?',
    accountSince: 'Here since {date}',
    packLockedLabel: '{name}, not yet yours. Open the Booster Packs',
    spotMarkVisited: '{name}: mark as visited',
    spotUnmarkVisited: '{name}: mark as not visited yet',
    emptyMustEats:
      'Your deck is still empty. Must Eats are out in Berlin and in the Booster Packs.',
    tabsLabel: 'Profile sections',
    pageTitle: 'Your profile',
    accountYou: 'You',
    accountSettings: 'Account settings',
    tab_deck: 'Deck',
    tab_spots: 'Spots',
    tab_packs: 'Packs',
    albumOpenSpot: 'View spot',
    albumOpenMap: 'To the map',
    albumToSpot: 'To {name}',
    recentHeading: 'Just revealed',
    packsMore: 'View Booster Packs',
    packsMoreTitle: 'Booster Packs.',
    packsMoreLine: 'More Must Eats for your deck, without visiting each spot first.',
    inviteHeading: 'Show your deck',
    inviteLine: 'Send it to someone you like eating with. You both get a card for it.',
    inviteJoinedOne: '1 friend joined through your link',
    inviteJoinedMany: '{count} friends joined through your link',
    friendsHeading: 'Your crew',
    friendsLine: 'They started through your link. Tap a character to see their deck.',
    friendAnonymous: 'No name',
    inviteCta: 'Share deck',
    inviteCopied: 'Link copied',
    inviteShareTitle: 'My deck on the Eat This map',
    changeAvatar: 'Change character',
    avatarModalTitle: 'Your character',
    /* Dieselben Worte wie der Schritt „Wer bist du?" der Tour (SignInReward). */
    avatarModalKicker: 'Your profile',
    avatarModalHeadline: 'Who are you?',
    avatarModalClose: 'Close',
    avatarApply: 'Apply',
    signOut: 'Sign out',
    dataLoading: 'Loading your profile…',
    dataError: 'Your collection could not be loaded.',
    dataRetry: 'Retry',
  },
  auth: {
    errInvalidEmail: 'Please enter a valid email address.',
    errSendFailed: "We couldn't deliver the email. Please try again.",
    errGeneric: 'Something went wrong. Please try again.',
    errGooglePopup: "Google didn't work out. Use your email for now.",
    errGooglePopupBlocked: 'Your browser blocked the Google window. Allow it, or use your email.',
    googleCancelled: 'Cancelled. Try again, or use your email.',
    errService: 'Service error — please try again later.',
    errNetwork: 'Network error — please try again.',
    errRateLimited: 'Too many attempts. Check your inbox — or try again in an hour.',
  },
  cookie: {
    title: 'Cookies',
    text: 'We use Google Analytics to understand how our site is used. This sets a cookie and sends data to Google.',
    moreInfo: 'Show details',
    lessInfo: 'Hide details',
    accept: 'Accept',
    decline: 'Decline',
  },
  modals: {
    agb: {
      title: 'Terms & Conditions',
    },
    datenschutz: {
      title: 'Privacy Policy',
    },
    login: {
      emailPlaceholder: 'your@email.com',
      googleBtn: 'Sign in with Google',
      termsLink: 'Terms',
      privacyLink: 'Privacy Policy',
      sendLinkBtn: 'Sign in',
      heroHeadline: 'Sign in',
      dividerOr: 'or',
      resendBtn: 'Resend',
      backBtn: 'Back',
      packKicker: 'Start your collection',
      packTitle: 'Starter Pack',
      packLead:
        'Already {mustEatCount} Must Eats across Berlin. Your Starter Pack shows you the first ones. Discover the rest at the spots themselves.',
      cardKicker: 'Reveal your Must Eats',
      cardTitle: 'Look underneath',
      cardLead:
        'Already {mustEatCount} Must Eats across Berlin. Your Starter Pack shows you the first ones. Discover the rest at the spots themselves.',
      heartKicker: 'Save your spots',
      heartTitle: 'For later',
      heartLead:
        'Already {mustEatCount} Must Eats across Berlin. Your Starter Pack shows you the first ones. Discover the rest at the spots themselves.',
      emailLabel: 'Email',
      emptyEmail: 'Add your email first.',
      invalidEmail: 'That does not look like an email yet.',
      legalLead: 'By signing in you accept our',
      legalAnd: 'and our',
      sentH1: 'Mail’s out',
      sentToLabel: 'Sent to',
      sentSub:
        'Click the link in the mail and you’re on your map. It’s valid an hour and only for your address.',
      spamHint:
        'Nothing in your inbox? Check the spam folder — first contact sometimes lands there.',
      otherEmail: 'Different email',
    },
  },
};

type TranslationsShape = typeof en;
export type Lang = 'en' | 'de';

// ─── Deep merge ────────────────────────────────────────────────────────────
// Used to build DE by overlaying overrides on top of EN fallbacks.

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown> ? DeepPartial<T[K]> : T[K];
};

function deepMerge(base: unknown, overrides: unknown): unknown {
  if (
    base !== null &&
    typeof base === 'object' &&
    !Array.isArray(base) &&
    overrides !== null &&
    typeof overrides === 'object' &&
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
    skip: 'Zum Inhalt springen',
  },
  mustEats: {
    covered: 'Verdeckt',
    howItWorks: "Wie funktioniert's?",
    onb1Kicker: 'Must Eats',
    onb1Title: 'Was probierst du als Nächstes?',
    onb1Body: 'Unsere Lieblingsgerichte in Berlin – als Karten für deine Sammlung. Such dir aus, was du als Nächstes probierst.',
    onb2Kicker: 'Draußen entdecken',
    onb2Title: 'Dein nächster Fund.',
    onb2Body:
      'Finde verdeckte Karten auf der Map. Geh zum Spot, gib deinen Standort frei und deck die Karte mit einem Tap auf. Eine neue Karte für dein Deck.',
    onb3Kicker: 'Für dein Deck',
    onb3Title: 'Noch mehr entdecken.',
    onb3Body:
      'Mit Booster Packs holst du dir weitere Must Eats ins Deck, auch ohne Besuch vor Ort. Neue Karten, neue Gerichte zum Probieren.',
    onbFlipAria: 'Karte umdrehen',
    onbStarterKicker: 'Deine Sammlung',
    onbStarterTitle: 'Dein erstes Pack.',
    onbStarterBody:
      'Von aktuell {mustEatCount} Must Eats in Berlin sind 10 schon aufgedeckt. Dein Starter Pack deckt 20 weitere auf. Den Rest entdeckst du vor Ort. Neue kommen nach und nach dazu.',
    onbStarterCta: 'Anmelden',
    onbNext: 'Weiter',
    onbStart: "Los geht's",
    onbPacksCta: 'Packs',
    onbClose: 'Schließen',
    teaserTitle: 'Must Eats',
    teaserSub: 'Berlin hat viel auf der Karte. Wir sagen dir, was du bestellen solltest – und du sammelst die Empfehlungen als Karten in deinem eigenen Deck.',
    teaserCta: 'Alle Must Eats',
    teaserMystery: 'Was steckt drin?',
    teaserTap: 'Tipp auf die Karte.',
  },
  news: {},
  map: {
    filterAll: 'Alle',
    myLocationAriaLabel: 'Mein Standort',
    restaurantsListAriaLabel: 'Restaurants in der N\u00e4he',
    openNow: 'Offen',
    open: 'Ge\u00f6ffnet',
    closed: 'Geschlossen',
    reserve: 'Reservieren',
    openingHours: '\u00d6ffnungszeiten',
    insiderTip: 'Insider-Tipp',
    mustEatsExplainer: 'Was du hier bestellen solltest.',
    photos: 'Fotos',
    share: 'Teilen',
    address: 'Adresse',
    category: 'Kategorie',
    price: 'Preis',
    maps: 'Maps',
    opens: '\u00d6ffnet',
    closes: 'Schlie\u00dft',
    tooFarToReveal: 'Zu weit weg',
    revealHere: 'Jetzt aufdecken. Tipp auf die Karte.',
    unitsMin: 'Min',
    unitsH: 'Std',
    boosterTitle: 'Hunger auf mehr?',
    boosterDesc: 'Weitere Must Eats direkt mit einem Booster Pack freischalten.',
    boosterCta: 'Mehr freischalten',
    /* Ein Wort. CTAs bleiben kurz (Betreiber, 07.09.2026: „CTA immer
       kuerzen") — „Jetzt anmelden" und „Starter Pack holen" sagten nichts, was
       die Tafel darueber nicht schon sagt. Dasselbe Wort traegt die verdeckte
       Karte ohne Konto als Namen (MustEatDetailMobile). */
    starterCta: 'Anmelden',
    searchClose: 'Suche schließen',
    pickerClose: 'Filter schließen',
    filterChipCategory: 'Kategorie',
    filterMustEats: 'Must Eats',
    filterChipBezirk: 'Bezirk',
    filterChipPrice: 'Preis',
    filterChipOpen: 'Geöffnet',
    filterChipClear: 'Filter zurücksetzen',
    pickerCategoryTitle: 'Kategorie wählen',
    pickerBezirkTitle: 'Bezirk wählen',
    pickerPriceTitle: 'Preis wählen',
    priceUnder10: 'unter 10 €',
    price10to20: '10–20 €',
    price20to40: '20–40 €',
    price40to100: '40–100 €',
    priceFrom100: 'ab 100 €',
    inRestaurant: 'Im Restaurant',
    toSpot: 'Zum Spot',
    zoomCard: 'Karte vergrößern',
    swipeHint: 'Wischen zum Blättern',
    pagerAria: 'Must Eat wechseln',
    pagerPrev: 'Vorheriges Must Eat',
    pagerNext: 'Nächstes Must Eat',
    walkMinutes: 'zu Fuß',
    starterPromoTitle: 'Starter Pack',
    starterPromoBody:
      'Schon {mustEatCount} Must Eats in ganz Berlin. Dein Starter Pack zeigt dir die ersten. Den Rest entdeckst du vor Ort.',
    /* Zwei Zustände, zwei Texte. Vorher sagten Kicker und Überschrift
       zweimal dasselbe („Nichts gefunden" / „Keine Spots."), und der Knopf
       bot „Filter zurücksetzen" auch dem an, der gar keinen Filter gesetzt,
       sondern nur etwas eingetippt hatte. Der Kicker benennt jetzt, worin man
       steckt, und der Suchtext nennt die Anfrage beim Namen — sonst bleibt
       offen, ob man sich vertippt hat oder ob es das wirklich nicht gibt. */
    emptyTitle: 'Hier bleibt der Teller leer.',
    emptyKickerSearch: 'Deine Suche',
    emptyKickerFilter: 'Deine Filter',
    emptyKickerBoth: 'Suche und Filter',
    emptyBodySearch:
      'Zu „{query}" steht nichts auf der Karte. Versuch einen Spot, ein Gericht oder einen Kiez.',
    emptyBodyFilter:
      'Für diese Filterkombination haben wir keine Spots gefunden. Entferne einen Filter und schau dich weiter um.',
    emptyBodyBoth: 'Zu „{query}" passt mit diesen Filtern nichts. Nimm einen raus.',
    emptyReset: 'Alle Filter raus',
    emptyResetSearch: 'Suche löschen',
    hiddenMustEatAria: 'Verdecktes Must Eat',
    mustEatAtAria: 'Must Eat bei {name}',
    // Die verdeckte Karte trägt zwei Zeilen: oben der Zustand, unten die
    // Handlung — und gar keine Zahl mehr. Erst standen „Noch 8,2 km" und
    // „komm auf 50 m heran" übereinander, was sich als Rechenaufgabe las;
    // dann blieb die Entfernung allein stehen und ließ den Spot weit und
    // mühsam wirken, während die Regel darunter („vor Ort") nicht sagte, was
    // es überhaupt zu holen gibt. Wie weit es ist, zeigt die Map; diese zwei
    // Zeilen erklären die Karte und nennen den Gewinn.
    // Dieselbe Wendung, die die Restaurantseite schon benutzt
    // (MustEatTeaserSection: „Noch nicht aufgedeckt."). „Nur vor Ort." las sich
    // als Hausordnung statt als Einladung.
    proximityHere: 'Du bist da.',
    proximityAway: 'Noch nicht aufgedeckt',
    // Die Standort-Zustände stehen nicht mehr in der Gerichtszeile, sondern als
    // eigener Chip darunter: die Zeile gehört dem Gericht, der Chip der
    // Browser-Berechtigung. Ohne Fix ist der Chip die Taste, die fragt.
    locationAllow: 'Standort freigeben',
    // Nur noch der Name der verdeckten Karte fürs Screenreader-Ohr: sichtbar
    // ist der verweigerte Standort eine Meldung der zentralen Info-Karte
    // (lib/notice.ts), wie auf Map und Startseite.
    locationBlocked: 'Standort blockiert',
    proximityTapReveal: 'Tipp drauf und sieh, was du hier bestellen musst.',
    // Muss in den reservierten Copy-Slot passen (--me-mid-slot, 105px für den
    // Textteil): eine Zeile mehr, und der verdeckte Zustand steht 14px höher
    // als die Beschreibung der Nachbarkarte.
    proximityHint:
      'Was du hier bestellen solltest, erfährst du direkt am Spot. Dort kannst du die Karte aufdecken und deinem Deck hinzufügen.',
    revealCollected: 'Neu in deiner Sammlung',
    revealError: 'Hat nicht geklappt.',
    revealRetry: 'Tipp nochmal auf die Karte.',
  },
  breadcrumb: {},
  footer: {
    signIn: 'Anmelden',
    about: '\u00dcber mich',
    contact: 'Kontakt',
    datenschutz: 'Datenschutz',
    agb: 'AGB',
    cookieSettings: 'Cookies verwalten',
    copyright: '\u00a9 2026 Eat This. Alle Rechte vorbehalten.',
  },
  burger: {
    about: '\u00dcber mich',
    contact: 'Kontakt',
    impressum: 'Impressum',
    map: 'Map',
    categories: 'Kategorien',
    districts: 'Bezirke',
    fragRemy: 'Frag Remy',
    magazine: 'Magazin',
    boosterPacks: 'Booster Packs',
    profile: 'Profil',
    signIn: 'Anmelden',
  },
  cookie: {
    title: 'Cookies',
    text: 'Wir nutzen Google Analytics, um zu verstehen, wie unsere Seite genutzt wird. Dafür wird ein Cookie gesetzt und Daten an Google übermittelt.',
    moreInfo: 'Details anzeigen',
    lessInfo: 'Details ausblenden',
    accept: 'Akzeptieren',
    decline: 'Ablehnen',
  },
  deck: {
    anonymous: 'dieses Deck',
    metaTitle: 'Ein Deck bei Eat This',
    metaTitleNamed: 'Das Deck von {name} bei Eat This',
    metaDescription:
      '{done} von {total} Karten umgedreht. \u00dcber hundert Spots in Berlin, und weil Entdecken mehr Spa\u00df macht als Suchen, ist jedes Must Eat eine Karte.',
    metaDescriptionNamed:
      '{name} hat {done} von {total} Karten umgedreht. \u00dcber hundert Spots in Berlin, und weil Entdecken mehr Spa\u00df macht als Suchen, ist jedes Must Eat eine Karte.',
    /* Der Stand als Herausforderung (Nutzer, 24.09.2026: „es muss wie eine
       Challenge klingen, so: Ersan hat 14 von … Must Eats"). */
    challenge:
      '{done, plural, =0 {{name} f\u00e4ngt gerade an.} one {{name} hat 1 von {total} Must Eats.} other {{name} hat # von {total} Must Eats.}}',
    challengeFull: '{name} hat alle {total} Must Eats.',
    challengeAnon:
      '{done, plural, =0 {Dieses Deck f\u00e4ngt gerade an.} other {# von {total} Must Eats aufgedeckt.}}',
    dare: 'Schaffst du mehr?',
    dareFull: 'Schaffst du das auch?',
    dareStart: 'Wer ist schneller?',
    mapLabel: 'Die Map',
    mapBody:
      'Handverlesene Restaurants, Caf\u00e9s und Bars in ganz Berlin \u2014 und was du dort bestellen solltest.',
    collectLabel: 'Must Eats',
    collectBody:
      'Die Gerichte, die du nicht verpassen solltest. Geh hin, deck sie auf und sammle sie in deinem Deck.',
    toMap: 'Zur Map',
    signIn: 'Anmelden',
  },
  profile: {
    avatarError: 'Dein Charakter konnte nicht gespeichert werden. Versuch es nochmal.',
    albumCard: 'Karte',
    deckHeading: 'Dein Deck',
    albumCount: 'von {total} Must Eats',
    tab_account: 'Konto',
    fieldName: 'Name',
    fieldEmail: 'E-Mail',
    nameSaving: 'Speichert …',
    nameSaved: 'Name gespeichert.',
    nameError: 'Dein Name konnte nicht gespeichert werden. Versuch es nochmal.',
    collectionProgress: '{done} von {total} Karten',
    spotsSearch: 'Spots suchen …',
    searchEmpty: 'Nichts gefunden. Versuch einen anderen Suchbegriff.',
    spotsAll: 'Alle',
    spotsFilterLabel: 'Gespeicherte Spots filtern',
    spotsFilterEmpty: 'Noch keine Spots in dieser Auswahl.',
    starterPack: 'Starter Pack',
    avatarChoice1: 'Spot Scout',
    avatarChoice2: 'Spice Diva',
    avatarChoice3: 'Chef Slice',
    emptySpots:
      'Noch nichts gespeichert. Tipp auf der Map einen Spot an und dr\u00fcck aufs Herz — er landet hier.',
    toMap: 'Zur Map',
    removeSaved: '{name} aus Gespeicherten entfernen',
    spotNoteLabel: 'Notiz zu {name}',
    spotNotePlaceholder: 'Notiz hinzuf\u00fcgen …',
    /* Zwei Zustaende, ein Schalter: „will hin" ist der Normalfall — deshalb
       ist der Spot ueberhaupt gespeichert —, „war da" der gedrueckte. */
    spotWantTo: 'Will hin',
    spotWasThere: 'War da',
    spotWasThereAsk: 'War da?',
    accountSince: 'Dabei seit {date}',
    packLockedLabel: '{name}, noch nicht deins. Zu den Booster Packs',
    spotMarkVisited: '{name}: als besucht markieren',
    spotUnmarkVisited: '{name}: doch noch nicht da gewesen',
    emptyMustEats:
      'Dein Deck ist noch leer. Must Eats findest du drau\u00dfen in Berlin und in den Booster Packs.',
    tabsLabel: 'Bereiche des Profils',
    pageTitle: 'Dein Profil',
    accountYou: 'Du',
    accountSettings: 'Kontoeinstellungen',
    tab_deck: 'Deck',
    tab_spots: 'Spots',
    tab_packs: 'Packs',
    albumOpenSpot: 'Zum Spot',
    albumOpenMap: 'Zur Map',
    albumToSpot: 'Zu {name}',
    recentHeading: 'Zuletzt aufgedeckt',
    packsMore: 'Booster Packs ansehen',
    packsMoreTitle: 'Booster Packs.',
    packsMoreLine: 'Mehr Must Eats für dein Deck, ohne erst am Spot gewesen zu sein.',
    inviteHeading: 'Zeig dein Deck',
    inviteLine:
      'Schick es jemandem, mit dem du gern essen gehst. Ihr bekommt beide eine Karte dafür.',
    inviteJoinedOne: '1 Freund ist \u00fcber deinen Link gestartet',
    inviteJoinedMany: '{count} Freunde sind \u00fcber deinen Link gestartet',
    /* Die Reihe unter dem Einladen-Kasten. Der Referral-Weg laeuft seit Tag
       eins, sichtbar war davon nur eine Zahl — wen man geworben hat, stand
       nirgends. */
    friendsHeading: 'Deine Crew',
    friendsLine:
      'Sie sind \u00fcber deinen Link gestartet. Tipp auf eine Figur und sieh dir ihr Deck an.',
    friendAnonymous: 'Namenlos',
    inviteCta: 'Deck teilen',
    inviteCopied: 'Link kopiert',
    inviteShareTitle: 'Mein Deck auf der Eat This Map',
    changeAvatar: 'Charakter \u00e4ndern',
    avatarModalTitle: 'Dein Charakter',
    /* Dieselben Worte wie der Schritt „Wer bist du?" der Tour (SignInReward). */
    avatarModalKicker: 'Dein Profil',
    avatarModalHeadline: 'Wer bist du?',
    avatarModalClose: 'Schlie\u00dfen',
    avatarApply: '\u00dcbernehmen',
    signOut: 'Abmelden',
    dataLoading: 'Dein Profil wird geladen …',
    dataError: 'Deine Sammlung konnte nicht geladen werden.',
    dataRetry: 'Nochmal',
  },
  auth: {
    errInvalidEmail: 'Bitte gib eine g\u00fcltige E-Mail-Adresse ein.',
    errSendFailed: 'Wir konnten die E-Mail nicht zustellen. Bitte versuch es nochmal.',
    errGeneric: 'Etwas ist schiefgelaufen. Bitte versuch es nochmal.',
    errGooglePopup: 'Das hat mit Google nicht geklappt. Nimm solange deine E-Mail.',
    errGooglePopupBlocked:
      'Dein Browser hat das Google-Fenster blockiert. Lass es zu oder nimm deine E-Mail.',
    googleCancelled: 'Abgebrochen. Versuch es nochmal oder nimm deine E-Mail.',
    errService: 'Service-Fehler \u2013 bitte sp\u00e4ter nochmal versuchen.',
    errNetwork: 'Netzwerkfehler \u2013 bitte erneut versuchen.',
    errRateLimited:
      'Zu viele Versuche. Schau ins Postfach \u2013 oder probier es in einer Stunde nochmal.',
  },
  modals: {
    datenschutz: {
      title: 'Datenschutz',
    },
    agb: {
      title: 'AGB',
    },
    login: {
      emailPlaceholder: 'deine@email.com',
      googleBtn: 'Mit Google anmelden',
      termsLink: 'AGB',
      privacyLink: 'Datenschutzerkl\u00e4rung',
      sendLinkBtn: 'Anmelden',
      heroHeadline: 'Anmelden',
      dividerOr: 'oder',
      resendBtn: 'Nochmal',
      backBtn: 'Zur\u00fcck',
      packKicker: 'Starte deine Sammlung',
      packTitle: 'Starter Pack',
      packLead:
        'Schon {mustEatCount} Must Eats in ganz Berlin. Dein Starter Pack zeigt dir die ersten. Den Rest entdeckst du vor Ort.',
      cardKicker: 'Decke deine Must Eats auf',
      cardTitle: 'Schau drunter',
      cardLead:
        'Schon {mustEatCount} Must Eats in ganz Berlin. Dein Starter Pack zeigt dir die ersten. Den Rest entdeckst du vor Ort.',
      heartKicker: 'Speichere deine Spots',
      heartTitle: 'Für später',
      heartLead:
        'Schon {mustEatCount} Must Eats in ganz Berlin. Dein Starter Pack zeigt dir die ersten. Den Rest entdeckst du vor Ort.',
      emailLabel: 'E-Mail',
      emptyEmail: 'Bitte gib deine E-Mail ein.',
      invalidEmail: 'Das sieht noch nicht nach einer E-Mail aus.',
      legalLead: 'Mit deiner Anmeldung akzeptierst du unsere',
      legalAnd: 'und die',
      sentH1: 'Mail ist raus',
      sentToLabel: 'Gesendet an',
      sentSub:
        'Klick den Link in der Mail und du bist auf deiner Map. Er gilt eine Stunde und nur f\u00fcr deine Adresse.',
      spamHint:
        'Nichts in der Inbox? Wirf einen Blick in den Spam-Ordner \u2014 Erstkontakt landet manchmal da.',
      otherEmail: 'Andere Adresse',
    },
  },
};

const de = deepMerge(en, deOverrides) as TranslationsShape;

export const translations: Record<Lang, TranslationsShape> = { en, de };

/** Resolve the catalog size on the server so every signup surface has it at first paint. */
export function getCatalogMessages(locale: Lang, mustEatCount: number): TranslationsShape {
  const messages = translations[locale];
  const count = new Intl.NumberFormat(locale).format(mustEatCount);
  const fillCount = (message: string) => message.replaceAll('{mustEatCount}', count);

  return {
    ...messages,
    mustEats: {
      ...messages.mustEats,
      onbStarterBody: fillCount(messages.mustEats.onbStarterBody),
    },
    map: {
      ...messages.map,
      starterPromoBody: fillCount(messages.map.starterPromoBody),
    },
    modals: {
      ...messages.modals,
      login: {
        ...messages.modals.login,
        packLead: fillCount(messages.modals.login.packLead),
        cardLead: fillCount(messages.modals.login.cardLead),
        heartLead: fillCount(messages.modals.login.heartLead),
      },
    },
  };
}


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

export const MODAL_CONTACT_EMAIL = 'hello@eatthisdot.com';
