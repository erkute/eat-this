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
    onb1Body: 'Every card is a dish we swear by — our clear pick for that exact restaurant.',
    onb2Kicker: 'How it works',
    onb2Title: 'Go. Tap. Flip.',
    onb2Body: 'Face-down card? Head to the spot and flip it right there with a tap.',
    onb3Kicker: 'More spots',
    onb3Title: 'Booster Packs.',
    onb3Body:
      'New spots come in Booster Packs — buy one to unlock fresh spots and Must Eats for your map.',
    onbFlipAria: 'Flip the card',
    // Last slide, logged-out variant. Selling a paid Booster Pack to someone
    // without an account skips a rung: the free Starter Pack is the offer that
    // actually applies to them.
    onbStarterKicker: 'Free',
    onbStarterTitle: 'Starter Pack.',
    onbStarterBody: 'Sign up and unlock more spots and their Must Eats on your map. Free.',
    onbStarterCta: 'Get the Starter Pack',
    onbNext: 'Next',
    onbStart: "Let's go",
    onbPacksCta: 'View Booster Packs',
    onbClose: 'Close',
    teaserTitle: 'Must Eats',
    // The home teaser's lead. Three beats: what is on a card, how a face-down
    // one opens, and that it stays yours afterwards. The old lead stopped after
    // the reveal and never said the cards are a collection — "Sammlung" is what
    // the reveal itself and the profile's deck already call it. The grid below
    // shows how many are face-up, so the lead no longer counts them.
    teaserSub:
      'Collectible cards for dishes you have to order. You flip the face-down ones on site — then they are yours.',
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
    dataEyebrow: 'Map',
    dataLoadingTitle: 'Loading',
    dataLoadingDetail: 'One moment — the spots are on their way.',
    dataRefreshingTitle: 'Updating',
    dataRefreshingDetail: 'Your map is fetching the latest.',
    dataErrorTitle: 'Not loaded',
    dataErrorDetail: 'Check your connection and try again.',
    dataStaleTitle: 'Update failed',
    dataStaleDetail: 'You are looking at older map data.',
    dataRetry: 'Retry',
    // Accessible names for the covered card itself — the only thing a screen
    // reader gets, so they name the state and the action rather than repeating
    // the visible copy.
    tooFarToReveal: 'Too far to reveal',
    revealHere: 'Reveal now. Tap the card.',
    unitsMin: 'min',
    unitsH: 'h',
    boosterTitle: 'Hungry for more?',
    boosterDesc: 'More good spots. More Must Eats. Right on your map.',
    boosterCta: 'Unlock more',
    starterCta: 'Sign up',
    searchClose: 'Close search',
    viewToggleMap: 'Map',
    viewToggleList: 'List',
    filterChipCategory: 'Category',
    filterChipBezirk: 'District',
    filterChipPrice: 'Price',
    filterChipOpen: 'Open now',
    filterChipClear: 'Clear filter',
    filterChipsPausedBySearch: 'Your search overrides these filters',
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
    starterPromoBody: 'Sign in — more spots and Must Eats are waiting for you.',
    starterPromoLogin: 'Already in? Sign in',
    /* Two states, two texts. The kicker names WHICH of them you are in, the
       heading is the same either way, and the button says what it clears —
       "Reset filters" was wrong for someone who had only typed something. */
    emptyTitle: 'Nothing here.',
    emptyKickerSearch: 'Your search',
    emptyKickerFilter: 'Your filters',
    emptyBodySearch: 'Nothing matches “{query}”. Try a name, a cuisine or a district.',
    emptyBodyFilter: 'Together these leave nothing. Loosen one — or start over.',
    emptyReset: 'Reset filters',
    emptyResetSearch: 'Clear search',
    // Card metaphor, matching the reveal mechanic. The map list no longer has a
    // locked variant of its own — every match is a row, and this is the one
    // place that names the state.
    lockedDetailKicker: 'Still face down',
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
    // is a notice in the central toast (lib/map/locationStatus.ts), the same
    // one the map and the home page show.
    locationBlocked: 'Location blocked',
    proximityTapReveal: 'Tap it and see what to order here.',
    // Makes the card worth wanting instead of just explaining the rule: it names
    // the prize first ("the one dish") and puts the condition second. Echoes the
    // onboarding's "You gotta try this."
    proximityHint: "A dish you have to try. Flip the card at the spot — then it's yours.",
    revealSaving: 'Going into your collection…',
    revealSavingHint: 'It flips in a second.',
    revealError: "That didn't work.",
    revealRetry: 'Tap the card again.',
    revealAria: 'Reveal',
    addToDeckAria: 'Add to your deck',
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
    /* Ueber dem Deck: was das hier ist, in einem Atemzug. Der Rest steht
       unter dem Deck. */
    intro:
      'Eat This is a map of Berlin spots we actually recommend. Every Must Eat is a collectible card \u2014 and it only flips on site.',
    explainKicker: 'New here?',
    explainTitle: 'What is Eat This?',
    explainLead:
      'Some spots carry a Michelin star, some are tiny places you would never find without a tip. What they have in common: we would recommend them ourselves.',
    step1Kicker: 'Must Eat',
    step1Title: 'You have to try this.',
    step1Body:
      'Every card is a dish we swear by \u2014 our clear recommendation for that one restaurant.',
    step2Kicker: 'How it works',
    step2Title: 'Go. Tap. Open.',
    step2Body:
      'Some cards lie face up, some face down. A face-down one only flips on site \u2014 one tap while you stand in front of the spot.',
    step3Kicker: 'Your deck',
    step3Title: "And then it's yours.",
    step3Body: 'Every card you flip joins your deck. That is how the deck above was built.',
    cardsAlt: 'Two Eat This cards side by side, one face down and one face up',
    deckHeadingNamed: "{name}'s deck",
    deckHeading: 'The deck',
    /* Der Stand als Satz, nicht als Punktestand auf der Figur. */
    standNamed:
      '{name} has flipped {done} of {total} cards. {missing, plural, =0 {The deck is full.} one {One is still face down.} other {# are still face down.}}',
    stand:
      '{done} of {total} cards are flipped. {missing, plural, =0 {The deck is full.} one {One is still face down.} other {# are still face down.}}',
    empty: 'No cards on this map yet.',
    /* Dieselbe Tafel wie der Starter-Pack-Abschnitt der Startseite, also
       auch dieselben Worte. Was sich unterscheidet, ist der erste Satz: hier
       steht ein Freund daneben. */
    joinKicker: 'Free',
    joinTitle: 'Starter Pack',
    joinLead: '{name} is already collecting. Start your own deck\u00a0\u2014 free.',
    joinLeadAnon: 'Start your own deck\u00a0\u2014 free.',
    joinSentLead: "We've sent your link. One click and you're in.",
    joinHint: 'We send you a sign-in link.',
    joinEmailLabel: 'Email address',
    joinEmailPlaceholder: 'your@email.com',
    joinCta: 'Get the Starter Pack',
    joinSending: 'Sending\u2026',
    joinSent: 'Check your mail',
    joinEmptyEmail: 'Add your email first.',
    joinInvalidEmail: 'That does not look like an email yet.',
    joinArtAlt: 'Eat This Starter Pack',
    browse: 'Just looking? Open the Berlin Food Map',
    ctaHeadingIn: 'Back to your own deck',
    ctaLineIn: 'Your cards are waiting all over Berlin.',
    ctaIn: 'Open my deck',
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
    cityKicker: 'Berlin',
    cityCount: 'of {total} spots on your map',
    emptySpots: 'Nothing saved yet. Tap a spot on the map and hit the heart — it lands here.',
    toMap: 'To the map',
    removeSaved: 'Remove {name} from saved',
    spotNoteLabel: 'Note on {name}',
    spotNotePlaceholder: 'Add a note …',
    spotNoteError: 'Could not save note.',
    spotWantTo: 'Want to go',
    spotWasThere: 'Been there',
    spotMarkVisited: '{name}: mark as visited',
    spotUnmarkVisited: '{name}: mark as not visited yet',
    spotVisitedError: 'Could not be saved.',
    lockedSubhead: 'Still face-down',
    emptyMustEats:
      'No Must Eats in your collection yet. Open a Booster Pack and reveal them on site.',
    albumHeading: 'Your deck',
    /* Zwilling von deck.howTo — dieselbe Erklaerung auf beiden Deck-Seiten.
       Wer sie hier aendert, aendert sie dort mit. */
    howTo:
      "Every card sits at a spot in Berlin. Stand in front of it, tap the card \u2014 it flips, and it's yours.",
    albumCount: 'of {total} Must Eats',
    albumGroupProgress: '{group}: {done} of {total} revealed',
    albumFilterLabel: 'Filter your collection',
    albumFilterAll: 'All',
    albumFilterMissing: 'Missing',
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
    inviteLine: 'Send it to someone you like eating with. You both get new spots on your map.',
    inviteJoinedOne: '1 friend joined through your link',
    inviteJoinedMany: '{count} friends joined through your link',
    invitePreview: 'Preview',
    friendsHeading: 'Your crew',
    friendsLine: 'They started through your link. Tap a character to see their deck.',
    friendAnonymous: 'No name',
    inviteCta: 'Share deck',
    inviteCopied: 'Link copied',
    inviteShareTitle: 'My deck on the Eat This map',
    changeAvatar: 'Change character',
    changeAvatarShort: 'Change',
    avatarModalTitle: 'Choose your character',
    avatarModalSub: 'Who are you on the map?',
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
  },
  cookie: {
    title: 'Cookies',
    text: 'We use Google Analytics to understand how our site is used. This sets a cookie and sends data to Google.',
    moreInfo: 'Show details',
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
      signinGoogleBtn: 'Sign in with Google',
      googleSigningIn: 'Signing you in',
      termsLink: 'Terms',
      privacyLink: 'Privacy Policy',
      sendLinkBtn: 'Sign in',
      signinSendLinkBtn: 'Sign in',
      heroHeadline: 'Sign in',
      signinHeroHeadline: 'Sign in',
      dividerOr: 'or',
      resendBtn: 'Resend mail',
      backBtn: 'Back',
      heroH1: 'Starter Pack',
      heroSub: 'More spots, more Must Eats: on your map right after sign-in.',
      modalBenefitLead: 'More spots and more Must Eats are waiting on your map.',
      signinBoosterHeadline: 'WE TELL YOU WHAT TO EAT',
      signinBoosterLead: 'New Must Eats and spots are waiting for you. Grab your pack.',
      modalTagline: 'Sign in',
      signinModalTagline: 'Sign in',
      emailLabel: 'Email',
      legalLead: 'By signing in you accept our',
      signinLegalLead: 'By signing in you accept our',
      legalAnd: 'and our',
      sentH1: 'Mail’s out',
      sentToLabel: 'Sent to',
      sentSub:
        'Click the link in the mail and you’re on your map. It’s valid 15 minutes and only on this device.',
      spamHint:
        'Nothing in your inbox? Check the spam folder — first contact sometimes lands there.',
      otherEmail: 'Use a different email',
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
    onb1Body:
      'Jede Karte ist ein Gericht, das wir dir ans Herz legen — unsere klare Empfehlung für genau dieses Restaurant.',
    onb2Kicker: "So geht's",
    onb2Title: 'Hin. Tap. Offen.',
    onb2Body: 'Verdeckte Karte? Geh zum Spot und dreh sie vor Ort mit einem Tap um.',
    onb3Kicker: 'Mehr Spots',
    onb3Title: 'Booster Packs.',
    onb3Body:
      "Neue Spots gibt's in den Booster Packs — kauf eins und schalte frische Spots plus Must Eats für deine Map frei.",
    onbFlipAria: 'Karte umdrehen',
    onbStarterKicker: 'Gratis',
    onbStarterTitle: 'Starter Pack.',
    onbStarterBody:
      'Melde dich an und schalte weitere Spots samt ihren Must Eats auf deiner Map frei. Kostenlos.',
    onbStarterCta: 'Starter Pack holen',
    onbNext: 'Weiter',
    onbStart: "Los geht's",
    onbPacksCta: 'Booster Packs ansehen',
    onbClose: 'Schließen',
    teaserTitle: 'Must Eats',
    teaserSub:
      'Sammelkarten mit Gerichten, die du bestellen musst. Verdeckte Karten deckst du vor Ort auf — dann gehören sie dir.',
    teaserCta: 'Alle Must-Eats',
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
    dataEyebrow: 'Karte',
    dataLoadingTitle: 'Wird geladen',
    dataLoadingDetail: 'Einen Moment — die Spots kommen gleich.',
    dataRefreshingTitle: 'Wird aktualisiert',
    dataRefreshingDetail: 'Deine Map holt sich den neuesten Stand.',
    dataErrorTitle: 'Nicht geladen',
    dataErrorDetail: 'Prüf deine Verbindung und versuch es nochmal.',
    dataStaleTitle: 'Aktualisierung fehlgeschlagen',
    dataStaleDetail: 'Du siehst ältere Kartendaten.',
    dataRetry: 'Nochmal',
    tooFarToReveal: 'Zu weit weg',
    revealHere: 'Jetzt aufdecken. Tipp auf die Karte.',
    unitsMin: 'Min',
    unitsH: 'Std',
    boosterTitle: 'Hunger auf mehr?',
    boosterDesc: 'Mehr gute Spots. Mehr Must Eats. Direkt auf deiner Map.',
    boosterCta: 'Mehr freischalten',
    starterCta: 'Jetzt anmelden',
    searchClose: 'Suche schließen',
    viewToggleMap: 'Map',
    viewToggleList: 'Liste',
    filterChipCategory: 'Kategorie',
    filterChipBezirk: 'Bezirk',
    filterChipPrice: 'Preis',
    filterChipOpen: 'Geöffnet',
    filterChipClear: 'Filter zurücksetzen',
    filterChipsPausedBySearch: 'Deine Suche überschreibt diese Filter',
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
    starterPromoBody: 'Melde dich an — weitere Spots und Must Eats warten auf dich.',
    starterPromoLogin: 'Schon dabei? Einloggen',
    /* Zwei Zustände, zwei Texte. Vorher sagten Kicker und Überschrift
       zweimal dasselbe („Nichts gefunden" / „Keine Spots."), und der Knopf
       bot „Filter zurücksetzen" auch dem an, der gar keinen Filter gesetzt,
       sondern nur etwas eingetippt hatte. Der Kicker benennt jetzt, worin man
       steckt, und der Suchtext nennt die Anfrage beim Namen — sonst bleibt
       offen, ob man sich vertippt hat oder ob es das wirklich nicht gibt. */
    emptyTitle: 'Nichts dabei.',
    emptyKickerSearch: 'Deine Suche',
    emptyKickerFilter: 'Deine Filter',
    emptyBodySearch:
      'Zu „{query}" haben wir nichts. Probier einen Namen, eine Küche oder einen Bezirk.',
    emptyBodyFilter: 'Zusammen lassen sie nichts übrig. Lockere einen — oder fang neu an.',
    emptyReset: 'Filter zurücksetzen',
    emptyResetSearch: 'Suche löschen',
    lockedDetailKicker: 'Noch verdeckt',
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
    // (lib/map/locationStatus.ts), wie auf Map und Startseite.
    locationBlocked: 'Standort blockiert',
    proximityTapReveal: 'Tipp drauf und sieh, was du hier bestellen musst.',
    // Muss in den reservierten Copy-Slot passen (--me-mid-slot, 105px für den
    // Textteil): eine Zeile mehr, und der verdeckte Zustand steht 14px höher
    // als die Beschreibung der Nachbarkarte.
    proximityHint:
      'Ein Gericht, das du probieren musst. Am Spot deckst du die Karte auf — dann gehört sie dir.',
    revealSaving: 'Kommt in deine Sammlung …',
    revealSavingHint: 'Gleich dreht sie sich um.',
    revealError: 'Hat nicht geklappt.',
    revealRetry: 'Tipp nochmal auf die Karte.',
    revealAria: 'Aufdecken',
    addToDeckAria: 'In dein Deck legen',
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
    accept: 'Akzeptieren',
    decline: 'Ablehnen',
  },
  deck: {
    anonymous: 'dieses Deck',
    metaTitle: 'Ein Deck bei Eat This',
    metaTitleNamed: 'Das Deck von {name} bei Eat This',
    /* Ueber dem Deck: was das hier ist, in einem Atemzug — mehr braucht es
       nicht, um die Kartenwand darunter zu verstehen. Der ausfuehrliche Teil
       steht UNTER dem Deck (Nutzer, 06.09.2026: „was ist Eat This muss unter
       dem Deck, oder etwas ueber und etwas unter dem Deck an Infos").

       Davor stand die ganze Erklaerung ueber dem Deck und schob es aus dem
       ersten Bildschirm; davor stand sie ganz unten und wurde nie gelesen.
       Beides war zu viel von einer Seite. */
    intro:
      'Eat This ist eine Map mit Berliner Spots, die wir wirklich empfehlen. Jedes Must Eat ist eine Sammelkarte \u2014 und aufgedeckt wird sie vor Ort.',
    explainKicker: 'Neu hier?',
    explainTitle: 'Was ist Eat This?',
    explainLead:
      'Manche Spots tragen einen Michelin-Stern, manche sind kleine L\u00e4den, die man ohne Tipp nie findet. Was sie verbindet: wir w\u00fcrden sie selbst empfehlen.',
    step1Kicker: 'Must Eat',
    step1Title: 'Musst du probieren.',
    step1Body:
      'Jede Karte ist ein Gericht, das wir dir ans Herz legen \u2014 unsere klare Empfehlung f\u00fcr genau dieses Restaurant.',
    step2Kicker: "So geht's",
    step2Title: 'Hin. Tap. Offen.',
    step2Body:
      'Manche Karten liegen offen, manche verdeckt. Eine verdeckte drehst du nur vor Ort um \u2014 mit einem Tap, wenn du davor stehst.',
    step3Kicker: 'Dein Deck',
    step3Title: 'Und sie geh\u00f6rt dir.',
    step3Body:
      'Jede aufgedeckte Karte wandert in dein Deck. Genau so ist das Deck hier oben entstanden.',
    cardsAlt:
      'Zwei Eat-This-Sammelkarten nebeneinander, eine mit der R\u00fcckseite nach oben, eine aufgedeckt',
    deckHeadingNamed: '{name}s Deck',
    deckHeading: 'Das Deck',
    /* Der Stand als Satz. Als Zahlenpaar stand er bis zum 06.09.2026 auf der
       Spielerkarte und sagte einem Fremden „10/25", bevor er wusste, wovon
       (Nutzer: „das braucht es nicht"). Als Satz sagt er, was er meint — und
       er sagt es an der Stelle, an der es um den Freund geht. */
    standNamed:
      '{name} hat {done} von {total} Karten umgedreht. {missing, plural, =0 {Das Deck ist voll.} one {Eine liegt noch verdeckt.} other {# liegen noch verdeckt.}}',
    stand:
      '{done} von {total} Karten sind umgedreht. {missing, plural, =0 {Das Deck ist voll.} one {Eine liegt noch verdeckt.} other {# liegen noch verdeckt.}}',
    empty: 'Auf dieser Map liegen noch keine Karten.',
    /* Der Ausgang. Kein Knopf mehr, der irgendwohin fuehrt: das Feld steht
       auf der Seite (Nutzer, 06.09.2026). Was es verspricht, ist dasselbe wie
       auf der Startseite — das Starter Pack, kostenlos. */
    joinKicker: 'Gratis',
    joinTitle: 'Starter Pack',
    joinLead: '{name} sammelt schon. Fang dein eigenes Deck an\u00a0\u2014 kostenlos.',
    joinLeadAnon: 'Fang dein eigenes Deck an\u00a0\u2014 kostenlos.',
    joinSentLead: 'Wir haben dir den Link geschickt. Ein Klick und du bist drin.',
    joinHint: 'Wir schicken dir einen Link zum Einloggen.',
    joinEmailLabel: 'E-Mail Adresse',
    joinEmailPlaceholder: 'deine@email.com',
    joinCta: 'Starter Pack holen',
    joinSending: 'Sende\u2026',
    joinSent: 'Check deine Mail',
    joinEmptyEmail: 'Bitte gib deine E-Mail ein.',
    joinInvalidEmail: 'Das sieht noch nicht nach einer E-Mail aus.',
    joinArtAlt: 'Eat This Starter Pack',
    /* Der leise Weg fuer alle, die sich noch nicht anmelden wollen — statt
       einer Sackgasse. */
    browse: 'Erst mal umsehen? Zur Berlin Food Map',
    ctaHeadingIn: 'Zur\u00fcck zu deinem eigenen Deck',
    ctaLineIn: 'Deine Karten warten \u00fcberall in Berlin.',
    ctaIn: 'Mein Deck',
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
    cityKicker: 'Berlin',
    cityCount: 'von {total} Spots auf deiner Map',
    emptySpots:
      'Noch nichts gespeichert. Tipp auf der Map einen Spot an und dr\u00fcck aufs Herz — er landet hier.',
    toMap: 'Zur Map',
    removeSaved: '{name} aus Gespeicherten entfernen',
    spotNoteLabel: 'Notiz zu {name}',
    spotNotePlaceholder: 'Notiz hinzuf\u00fcgen …',
    spotNoteError: 'Notiz konnte nicht gespeichert werden.',
    /* Zwei Zustaende, ein Schalter: „will hin" ist der Normalfall — deshalb
       ist der Spot ueberhaupt gespeichert —, „war da" der gedrueckte. */
    spotWantTo: 'Will hin',
    spotWasThere: 'War da',
    spotMarkVisited: '{name}: als besucht markieren',
    spotUnmarkVisited: '{name}: doch noch nicht da gewesen',
    spotVisitedError: 'Konnte nicht gespeichert werden.',
    lockedSubhead: 'Noch verdeckt',
    emptyMustEats:
      'Noch keine Must Eats in deiner Sammlung. \u00d6ffne ein Booster Pack und geh vor Ort aufdecken.',
    albumHeading: 'Dein Deck',
    /* Zwilling von deck.howTo — dieselbe Erklaerung auf beiden Deck-Seiten.
       Wer sie hier aendert, aendert sie dort mit. */
    howTo:
      'Jede Karte liegt bei einem Spot in Berlin. Steh davor, tipp sie an \u2014 und sie dreht sich um und geh\u00f6rt dir.',
    albumCount: 'von {total} Must Eats',
    albumGroupProgress: '{group}: {done} von {total} aufgedeckt',
    albumFilterLabel: 'Sammlung filtern',
    albumFilterAll: 'Alle',
    albumFilterMissing: 'Fehlende',
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
      'Schick es jemandem, mit dem du gern essen gehst. Ihr bekommt beide neue Spots auf eure Map.',
    inviteJoinedOne: '1 Freund ist \u00fcber deinen Link gestartet',
    inviteJoinedMany: '{count} Freunde sind \u00fcber deinen Link gestartet',
    invitePreview: 'Ansehen',
    /* Die Reihe unter dem Einladen-Kasten. Der Referral-Weg laeuft seit Tag
       eins, sichtbar war davon nur eine Zahl — wen man geworben hat, stand
       nirgends. */
    friendsHeading: 'Deine Crew',
    friendsLine: 'Sie sind \u00fcber deinen Link gestartet. Tipp auf eine Figur und sieh dir ihr Deck an.',
    friendAnonymous: 'Namenlos',
    inviteCta: 'Deck teilen',
    inviteCopied: 'Link kopiert',
    inviteShareTitle: 'Mein Deck auf der Eat This Map',
    changeAvatar: 'Charakter \u00e4ndern',
    changeAvatarShort: '\u00c4ndern',
    avatarModalTitle: 'Charakter w\u00e4hlen',
    avatarModalSub: 'Wer bist du auf der Map?',
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
      signinGoogleBtn: 'Mit Google einloggen',
      googleSigningIn: 'Du wirst angemeldet',
      termsLink: 'AGB',
      privacyLink: 'Datenschutzerkl\u00e4rung',
      sendLinkBtn: 'Anmelden',
      signinSendLinkBtn: 'Einloggen',
      heroHeadline: 'Anmelden',
      signinHeroHeadline: 'Einloggen',
      dividerOr: 'oder',
      resendBtn: 'Mail erneut senden',
      backBtn: 'Zur\u00fcck',
      heroH1: 'Starter Pack',
      heroSub: 'Mehr Spots, mehr Must Eats: direkt nach der Anmeldung auf deiner Map.',
      modalBenefitLead: 'Dich erwarten mehr Spots und mehr Must Eats auf deiner Map.',
      signinBoosterHeadline: 'WE TELL YOU WHAT TO EAT',
      signinBoosterLead: 'Neue Must Eats und Spots warten auf dich. Hol dir dein Pack.',
      modalTagline: 'Anmelden',
      signinModalTagline: 'Einloggen',
      emailLabel: 'E-Mail',
      legalLead: 'Mit deiner Anmeldung akzeptierst du unsere',
      signinLegalLead: 'Mit dem Einloggen akzeptierst du unsere',
      legalAnd: 'und die',
      sentH1: 'Mail ist raus',
      sentToLabel: 'Gesendet an',
      sentSub:
        'Klick den Link in der Mail und du bist auf deiner Map. Er gilt 15 Minuten und nur auf diesem Ger\u00e4t.',
      spamHint:
        'Nichts in der Inbox? Wirf einen Blick in den Spam-Ordner \u2014 Erstkontakt landet manchmal da.',
      otherEmail: 'Andere E-Mail nehmen',
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
