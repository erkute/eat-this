/* ============================================
   EAT THIS — Translation dictionary
   EN is the source of truth. DE is a deep merge of EN with DE overrides.
   All HTML values in modals come from this constant — not from user input.
   ============================================ */

const en = {
  a11y: {
    skip: 'Skip to content',
  },
  hub: {
    hero: {},
    packs: {},
    categories: {},
    bezirke: {},
    allBerlin: {},
    newOnMap: {},
    fragRemy: {
      title: 'Ask Remy',
      sub: 'Your Berlin food insider – just ask.',
      inputPlaceholder: '…or just ask Remy',
      sendAria: 'Send',
    },
    magazine: {},
    nearby: {
      title: 'Around you',
      // Without a location grant the list is centred on Mitte — saying so as a
      // headline claims a place the visitor probably isn't. Ask instead.
      titleFallback: "What's near you?",
      locationAria: 'Use my location',
      // Two labels, not one: before a grant the button is the section's whole
      // ask and has to name the action, afterwards it is the quiet way to
      // re-read a location that already exists.
      location: 'Locate',
      // Short on purpose: the button sits under its own explaining line, and
      // a full sentence made it the widest thing in the column.
      locationRequest: 'Share',
      locating: 'Locating…',
      sub: 'A quick entry to the closest spots on the map.',
      subFallback: 'Share your location and Berlin sorts itself around you.',
    },
  },
  mustEats: {
    // "Covered" wie auf der Pack-Seite — dieselbe Sache hieß dort schon so.
    // Nur noch als Alt-Text der verdeckten Karte; die drei Filter-Chips
    // (Alle/Offen/Verdeckt) sind mit dem Zwei-Band-Layout weggefallen.
    covered: 'Covered',
    howItWorks: 'How does it work?',
    onb1Kicker: 'Must Eat?',
    onb1Title: 'You gotta try this.',
    onb1Body: 'Lots of dishes. One reason to go. We tell you which.',
    onb2Kicker: 'How it works',
    onb2Title: 'Go. Tap. Flip.',
    onb2Body: 'Face-down card? Head to the spot and flip it right there with a tap.',
    onb3Kicker: 'In a hurry?',
    onb3Title: 'Booster Packs.',
    onb3Body:
      'Every spot in Berlin is already on your map. A Booster Pack turns cards over without the walk.',
    onbFlipAria: 'Flip the card',
    // Last slide, logged-out variant. Selling a paid Booster Pack to someone
    // without an account skips a rung: the free Starter Pack is the offer that
    // actually applies to them.
    onbStarterKicker: '20 Must Eats',
    onbStarterTitle: 'Starter Pack.',
    onbStarterBody: '10 straight into your deck. 10 more are waiting out in Berlin for you.',
    onbStarterCta: 'Sign up',
    onbNext: 'Next',
    onbStart: "Let's go",
    onbPacksCta: 'Packs',
    onbClose: 'Close',
    teaserTitle: 'Must Eats',
    // The home teaser's lead. Three beats: what is on a card, how a face-down
    // one opens, and that it stays yours afterwards. The old lead stopped after
    // the reveal and never said the cards are a collection — "Sammlung" is what
    // the reveal itself and the profile's deck already call it. The grid below
    // shows how many are face-up, so the lead no longer counts them.
    teaserSub:
      'Dishes you should order. Some we show you right away, others you flip at the spot and collect in your deck.',
    teaserCta: 'All Must Eats',
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
    locateInvite: 'Where are you?',
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
    filterChipCategory: 'Category',
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
    swipeHint: '← swipe →',
    pagerAria: 'Switch Must Eat',
    pagerPrev: 'Previous Must Eat',
    pagerNext: 'Next Must Eat',
    walkMinutes: 'on foot',
    starterPromoTitle: 'Starter Pack',
    starterPromoBody: '20 Must Eats, spread all over Berlin. Waiting for you to discover them.',
    /* Two states, two texts. The kicker names WHICH of them you are in, the
       heading is the same either way, and the button says what it clears —
       "Reset filters" was wrong for someone who had only typed something. */
    emptyTitle: 'Nothing here.',
    emptyKickerSearch: 'Your search',
    emptyKickerFilter: 'Your filters',
    emptyKickerBoth: 'Your search and filters',
    emptyBodySearch: 'Nothing matches “{query}”. Try a name, a cuisine or a district.',
    emptyBodyFilter: 'Together these leave nothing. Loosen one — or start over.',
    emptyBodyBoth:
      'With these filters nothing matches “{query}”. Loosen one — or search without them.',
    emptyReset: 'Reset filters',
    emptyResetSearch: 'Clear search',
    // Card metaphor, matching the reveal mechanic. The map list no longer has a
    // locked variant of its own — every match is a row, and this is the one
    // place that names the state.
    lockedDetailKicker: 'Still face down',
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
    // the prize first ("the one dish") and puts the condition second. Echoes the
    // onboarding's "You gotta try this."
    proximityHint:
      'What to order here, you find out right at the spot. That is where you flip the card and add it to your deck.',
    revealCollected: 'New in your collection',
    revealError: "That didn't work.",
    revealRetry: 'Tap the card again.',
  },
  breadcrumb: {},
  footer: {
    signIn: 'Sign in',
    about: 'About',
    contact: 'Contact',
    impressum: 'Impressum',
    datenschutz: 'Privacy',
    agb: 'Terms',
    cookieSettings: 'Cookie settings',
    copyright: '\u00a9 2026 Eat This. All rights reserved.',
  },
  burger: {
    about: 'About',
    contact: 'Contact',
    impressum: 'Impressum',
    map: 'Map',
    mustEats: 'Must Eats',
    categories: 'Categories',
    districts: 'Districts',
    fragRemy: 'Ask Remy',
    aufDemTeller: 'On the Menu',
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
    deckHeadingNamed: "{name}'s deck",
    deckHeading: 'The deck',
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
    heroKicker: 'Your profile',
    heroTitle: 'Your Berlin HQ',
    heroLine: 'Eat · save · repeat',
    fieldAccount: 'Account',
    avatarChoice1: 'Spot Scout',
    avatarChoice2: 'Spice Diva',
    avatarChoice3: 'Chef Slice',
    savedHeading: 'Saved Spots',
    emptySpots: 'Nothing saved yet. Tap a spot on the map and hit the heart — it lands here.',
    toMap: 'To the map',
    removeSaved: 'Remove {name} from saved',
    spotNoteLabel: 'Note on {name}',
    spotNotePlaceholder: 'Add a note …',
    spotWantTo: 'Want to go',
    spotWasThere: 'Been there',
    spotMarkVisited: '{name}: mark as visited',
    spotUnmarkVisited: '{name}: mark as not visited yet',
    lockedSubhead: 'Still face-down',
    emptyMustEats:
      'Your deck is still empty. Must Eats are out in Berlin and in the Booster Packs.',
    tabsLabel: 'Profile sections',
    tab_deck: 'Deck',
    tab_spots: 'Spots',
    tab_packs: 'Packs',
    albumHeading: 'Your deck',
    albumHello: 'Hey {name}',
    albumCount: 'of {total} Must Eats',
    albumStamped: 'Been there',
    albumGroupProgress: '{group}: {done} of {total} revealed',
    albumFilterLabel: 'Filter your collection',
    albumFilterAll: 'All',
    albumFilterMissing: 'Face-down',
    albumFilterComplete: 'Nothing missing here — this part is complete.',
    albumToSpot: 'To {name}',
    albumShare: 'Send this card',
    albumShareCopied: 'Link copied',
    albumShareTitle: '{dish} at {name} \u2014 you have to try this.',
    badgesHeading: 'Badges',
    badgeFirstCard: 'First card',
    badgeCards: '{count} cards',
    badgeDistrict: '{district} complete',
    badgeAllBerlin: 'All of Berlin',
    recentHeading: 'Just revealed',
    moveLabel: 'Your next Must Eat',
    moveLocateCta: 'Share location',
    moveLocateShort: 'Location',
    moveCovered:
      '{count, plural, one {# Must Eat still face-down in {district}.} other {# Must Eats still face-down in {district}.}}',
    moveCoveredNear:
      '{count, plural, one {# Must Eat still face-down in {district} — {distance} from here.} other {# Must Eats still face-down in {district} — the nearest {distance} from here.}}',
    packsHeading: 'My Packs',
    packsMore: 'View Booster Packs',
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
    changeAvatarShort: 'Change',
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
    signingInKicker: 'Almost there',
    signingOutKicker: 'See you',
    signingOutTitle: 'Signing you out',
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
      googleSigningIn: 'Signing you in',
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
        '20 Must Eats from all over Berlin. Discover our picks and collect them in your deck.',
      cardKicker: 'Reveal your Must Eats',
      cardTitle: 'Look underneath',
      cardLead:
        'Behind every card there’s a pick. Your Starter Pack brings you 20 Must Eats from all over Berlin.',
      heartKicker: 'Save your spots',
      heartTitle: 'For later',
      heartLead:
        'All your saved spots in one place. Plus your Starter Pack with 20 Must Eats from all over Berlin.',
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
  hub: {
    hero: {},
    packs: {},
    categories: {},
    bezirke: {},
    allBerlin: {},
    newOnMap: {},
    fragRemy: {
      title: 'Frag Remy',
      sub: 'Frag ihn nach deinem nächsten Spot.',
      inputPlaceholder: '…oder frag Remy direkt',
      sendAria: 'Senden',
    },
    magazine: {},
    nearby: {
      title: 'Um dich herum',
      titleFallback: 'Was ist um dich?',
      locationAria: 'Mein Standort verwenden',
      location: 'Standort',
      // Kurz mit Absicht — siehe den englischen Zwilling.
      locationRequest: 'Freigeben',
      locating: 'Ortet …',
      sub: 'Der schnelle Einstieg zu den nächsten Spots auf der Map.',
      subFallback: 'Gib deinen Standort frei — dann sortiert sich Berlin um dich herum.',
    },
  },
  mustEats: {
    covered: 'Verdeckt',
    howItWorks: "Wie funktioniert's?",
    onb1Kicker: 'Must Eat?',
    onb1Title: 'Musst du probieren.',
    onb1Body: 'Viele Gerichte. Ein Grund hinzugehen. Wir zeigen dir, welchen.',
    onb2Kicker: "So geht's",
    onb2Title: 'Hin. Tap. Offen.',
    onb2Body: 'Verdeckte Karte? Geh zum Spot und dreh sie vor Ort mit einem Tap um.',
    onb3Kicker: 'Keine Zeit?',
    onb3Title: 'Booster Packs.',
    onb3Body:
      'Ganz Berlin liegt schon auf deiner Map. Ein Booster Pack dreht dir Karten um, ohne dass du hinmusst.',
    onbFlipAria: 'Karte umdrehen',
    onbStarterKicker: '20 Must Eats',
    onbStarterTitle: 'Starter Pack.',
    onbStarterBody: '10 direkt im Deck. 10 weitere warten draußen in Berlin auf dich.',
    onbStarterCta: 'Anmelden',
    onbNext: 'Weiter',
    onbStart: "Los geht's",
    onbPacksCta: 'Packs',
    onbClose: 'Schließen',
    teaserTitle: 'Must Eats',
    teaserSub:
      'Gerichte, die du bestellen solltest. Einige zeigen wir dir direkt, andere deckst du erst vor Ort auf und sammelst sie in deinem Deck.',
    teaserCta: 'Alle Must Eats',
  },
  news: {},
  map: {
    filterAll: 'Alle',
    myLocationAriaLabel: 'Mein Standort',
    locateInvite: 'Wo bist du?',
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
    filterChipCategory: 'Kategorie',
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
    swipeHint: '← wischen →',
    pagerAria: 'Must Eat wechseln',
    pagerPrev: 'Vorheriges Must Eat',
    pagerNext: 'Nächstes Must Eat',
    walkMinutes: 'zu Fuß',
    starterPromoTitle: 'Starter Pack',
    starterPromoBody:
      '20 Must Eats, überall in Berlin verteilt. Bereit, von dir entdeckt zu werden.',
    /* Zwei Zustände, zwei Texte. Vorher sagten Kicker und Überschrift
       zweimal dasselbe („Nichts gefunden" / „Keine Spots."), und der Knopf
       bot „Filter zurücksetzen" auch dem an, der gar keinen Filter gesetzt,
       sondern nur etwas eingetippt hatte. Der Kicker benennt jetzt, worin man
       steckt, und der Suchtext nennt die Anfrage beim Namen — sonst bleibt
       offen, ob man sich vertippt hat oder ob es das wirklich nicht gibt. */
    emptyTitle: 'Nichts dabei.',
    emptyKickerSearch: 'Deine Suche',
    emptyKickerFilter: 'Deine Filter',
    emptyKickerBoth: 'Deine Suche und Filter',
    emptyBodySearch:
      'Zu „{query}" haben wir nichts. Probier einen Namen, eine Küche oder einen Bezirk.',
    emptyBodyFilter: 'Zusammen lassen sie nichts übrig. Lockere einen — oder fang neu an.',
    emptyBodyBoth:
      'Mit diesen Filtern haben wir zu „{query}" nichts. Lockere einen — oder such ohne sie.',
    emptyReset: 'Filter zurücksetzen',
    emptyResetSearch: 'Suche löschen',
    lockedDetailKicker: 'Noch verdeckt',
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
    about: '\u00dcber uns',
    contact: 'Kontakt',
    datenschutz: 'Datenschutz',
    agb: 'AGB',
    cookieSettings: 'Cookies verwalten',
    copyright: '\u00a9 2026 Eat This. Alle Rechte vorbehalten.',
  },
  burger: {
    about: '\u00dcber uns',
    contact: 'Kontakt',
    impressum: 'Impressum',
    map: 'Map',
    categories: 'Kategorien',
    districts: 'Bezirke',
    fragRemy: 'Frag Remy',
    aufDemTeller: 'Auf dem Teller',
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
    deckHeadingNamed: '{name}s Deck',
    deckHeading: 'Das Deck',
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
    heroKicker: 'Dein Profil',
    heroTitle: 'Deine Berlin-Zentrale',
    heroLine: 'Eat · save · repeat',
    fieldAccount: 'Account',
    avatarChoice1: 'Spot Scout',
    avatarChoice2: 'Spice Diva',
    avatarChoice3: 'Chef Slice',
    savedHeading: 'Gespeicherte Spots',
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
    spotMarkVisited: '{name}: als besucht markieren',
    spotUnmarkVisited: '{name}: doch noch nicht da gewesen',
    lockedSubhead: 'Noch verdeckt',
    emptyMustEats:
      'Dein Deck ist noch leer. Must Eats findest du drau\u00dfen in Berlin und in den Booster Packs.',
    tabsLabel: 'Bereiche des Profils',
    tab_deck: 'Deck',
    tab_spots: 'Spots',
    tab_packs: 'Packs',
    albumHeading: 'Dein Deck',
    /* Der Gruss wie im Hero der Startseite (angemeldet). */
    albumHello: 'Hey {name}',
    albumCount: 'von {total} Must Eats',
    /* Der Stempel auf einer Karte, die vor Ort umgedreht wurde. Kurz, weil er
       quer über eine Karte läuft — und Vergangenheit, weil er eine Tat
       bezeugt, keinen Zustand. Gekaufte Karten tragen ihn nicht: das ist der
       ganze Unterschied. */
    albumStamped: 'War da',
    albumGroupProgress: '{group}: {done} von {total} aufgedeckt',
    albumFilterLabel: 'Sammlung filtern',
    albumFilterAll: 'Alle',
    /* „Verdeckte", nicht „Fehlende" (Nutzer, 24.09.2026) — die Karte ist
       da, nur noch nicht umgedreht. */
    albumFilterMissing: 'Verdeckte',
    albumFilterComplete: 'Hier fehlt nichts mehr — der Teil ist voll.',
    albumToSpot: 'Zu {name}',
    /* Der Weg aus einer OFFENEN Karte: weitersagen. Geteilt wird die
       Spot-Seite — sie ist oeffentlich und traegt den Must-Eat-Teaser. */
    albumShare: 'Karte weiterschicken',
    albumShareCopied: 'Link kopiert',
    albumShareTitle: '{dish} bei {name} \u2014 das musst du probieren.',
    /* Abzeichen statt Rangliste: Eat This nennt seine Spot-Zahlen bewusst
       nicht, und bei einer Sammlung ist „du bist Letzter" die falsche
       Nachricht. Ein Abzeichen misst gegen die Sammlung, nicht gegen
       andere Leute. */
    badgesHeading: 'Abzeichen',
    badgeFirstCard: 'Erste Karte',
    badgeCards: '{count} Karten',
    badgeDistrict: '{district} komplett',
    badgeAllBerlin: 'Ganz Berlin',
    recentHeading: 'Zuletzt aufgedeckt',
    moveLabel: 'N\u00e4chstes Must Eat',
    moveLocateCta: 'Standort freigeben',
    moveLocateShort: 'Standort',
    moveCovered:
      '{count, plural, one {Noch # Must Eat in {district} verdeckt.} other {Noch # Must Eats in {district} verdeckt.}}',
    moveCoveredNear:
      '{count, plural, one {Noch # Must Eat in {district} verdeckt \u2014 {distance} von hier.} other {Noch # Must Eats in {district} verdeckt \u2014 das n\u00e4chste {distance} von hier.}}',
    packsHeading: 'Meine Packs',
    packsMore: 'Booster Packs ansehen',
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
    changeAvatarShort: '\u00c4ndern',
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
    signingInKicker: 'Gleich da',
    signingOutKicker: 'Bis gleich',
    signingOutTitle: 'Du wirst abgemeldet',
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
      googleSigningIn: 'Du wirst angemeldet',
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
        '20 Must Eats aus ganz Berlin. Entdecke unsere Empfehlungen und sammle sie in deinem Deck.',
      cardKicker: 'Decke deine Must Eats auf',
      cardTitle: 'Schau drunter',
      cardLead:
        'Hinter jeder Karte steckt eine Empfehlung. Dein Starter Pack bringt dir 20 Must Eats aus ganz Berlin.',
      heartKicker: 'Speichere deine Spots',
      heartTitle: 'Für später',
      heartLead:
        'Deine gespeicherten Spots an einem Ort. Dazu dein Starter Pack mit 20 Must Eats aus ganz Berlin.',
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
