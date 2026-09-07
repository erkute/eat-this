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
    onbStarterKicker: 'Free',
    onbStarterTitle: 'Starter Pack.',
    onbStarterBody: '10 straight into your deck. 10 more are waiting out in Berlin for you.',
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
    boosterDesc: 'Unlock more Must Eats right away with a Booster Pack.',
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
    starterPromoBody: '20 Must Eats, spread all over Berlin. Waiting for you to discover them.',
    starterPromoLogin: 'Already in? Sign in',
    /* Die Anmelde-Tafel in der verdeckten Karte, ohne Konto: was unter dem
       Ruecken liegt, gibt es fuer eine Anmeldung — und diese Karte garantiert. */
    guestPitchKicker: 'Free',
    guestPitchTitle: 'Starter Pack',
    guestPitchBody: 'Sign up and get 20 Must Eats. This one is in.',
    guestPitchCta: 'Get the Starter Pack',
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
    proximityHint:
      'What to order here, you find out right at the spot. That is where you flip the card and add it to your deck.',
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
    /* Der Satz, der in WhatsApp unter der Vorschaukarte steht. Er muss die
       Frage „warum schickt der mir das" beantworten, bevor jemand klickt. */
    metaDescription:
      '{done} of {total} cards flipped. Over a hundred spots in Berlin, and because discovering beats searching, every Must Eat is a card.',
    metaDescriptionNamed:
      '{name} has flipped {done} of {total} cards. Over a hundred spots in Berlin, and because discovering beats searching, every Must Eat is a card.',
    /* Ueber dem Deck: was das hier ist, in einem Atemzug. Der Rest steht
       unter dem Deck. */
    intro:
      'Every spot on the map is hand-picked. At selected spots we also show you which dish to order. These Must Eats you can flip and collect in your deck.',
    explainKicker: 'New here?',
    explainTitle: 'What is Eat This?',
    explainLead:
      'Every spot on the map is hand-picked. From the starred restaurant to the place around the corner.',
    step1Kicker: 'Must Eat',
    step1Title: 'You have to try this.',
    step1Body:
      'Every card is a dish we swear by \u2014 our clear recommendation for that one restaurant.',
    step2Kicker: 'How it works',
    step2Title: 'Go. Tap. Open.',
    step2Body:
      'Every card belongs to a spot in Berlin. Go there, open the card and tap it \u2014 it flips over, and now you know what to order.',
    step3Kicker: 'Your deck',
    step3Title: "And then it's yours.",
    step3Body:
      'The card you flipped joins your deck and stays there. That is how the deck above was built.',
    cardsAlt: 'Two Eat This cards side by side, one face down and one face up',
    deckHeadingNamed: "{name}'s deck",
    deckHeading: 'The deck',
    /* Der Stand als Satz, nicht als Punktestand auf der Figur. */
    standNamed:
      '{name} has flipped {done} of {total} cards. {missing, plural, =0 {The deck is full.} one {One is still face down.} other {# are still face down.}}',
    stand:
      '{done} of {total} cards are flipped. {missing, plural, =0 {The deck is full.} one {One is still face down.} other {# are still face down.}}',
    empty: 'No cards on this map yet.',
    /* Dieselbe Tafel wie der Starter-Pack-Abschnitt der Startseite, also auch
       dieselben Worte. Was sich unterscheidet, ist der erste Satz: hier steht
       ein Freund daneben. */
    joinKicker: 'Free',
    joinTitle: 'Starter Pack',
    joinLead: '{name} is already collecting. 20 cards to start your own\u00a0\u2014 ten in the deck, ten out there. Free.',
    joinLeadAnon: '20 cards to start a deck of your own\u00a0\u2014 ten in the deck, ten out there. Free.',
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
      'Your deck is still empty. Must Eats are out in Berlin and in the Booster Packs.',
    albumHeading: 'Your deck',
    howTo:
      'Every Must Eat you have flipped lands here. Whatever is missing is waiting out in Berlin and in the Booster Packs.',
    albumCount: 'of {total} Must Eats',
    albumStamped: 'Been there',
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
    inviteLine: 'Send it to someone you like eating with. You both get a card for it.',
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
      heroSub: '20 Must Eats, spread all over Berlin. Waiting for you to discover them.',
      modalBenefitLead: '20 Must Eats, spread all over Berlin. Waiting for you to discover them.',
      signinBoosterHeadline: 'WE TELL YOU WHAT TO EAT',
      signinBoosterLead: 'Your deck is waiting. Pick up where you left off.',
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
    onb1Body: 'Viele Gerichte. Ein Grund hinzugehen. Wir zeigen dir, welchen.',
    onb2Kicker: "So geht's",
    onb2Title: 'Hin. Tap. Offen.',
    onb2Body: 'Verdeckte Karte? Geh zum Spot und dreh sie vor Ort mit einem Tap um.',
    onb3Kicker: 'Keine Zeit?',
    onb3Title: 'Booster Packs.',
    onb3Body:
      'Ganz Berlin liegt schon auf deiner Map. Ein Booster Pack dreht dir Karten um, ohne dass du hinmusst.',
    onbFlipAria: 'Karte umdrehen',
    onbStarterKicker: 'Gratis',
    onbStarterTitle: 'Starter Pack.',
    onbStarterBody: '10 direkt im Deck. 10 weitere warten draußen in Berlin auf dich.',
    onbStarterCta: 'Starter Pack holen',
    onbNext: 'Weiter',
    onbStart: "Los geht's",
    onbPacksCta: 'Booster Packs ansehen',
    onbClose: 'Schließen',
    teaserTitle: 'Must Eats',
    teaserSub:
      'Gerichte, die du bestellen solltest. Einige zeigen wir dir direkt, andere deckst du erst vor Ort auf und sammelst sie in deinem Deck.',
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
    boosterDesc: 'Weitere Must Eats direkt mit einem Booster Pack freischalten.',
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
    starterPromoBody: '20 Must Eats, überall in Berlin verteilt. Bereit, von dir entdeckt zu werden.',
    starterPromoLogin: 'Schon dabei? Einloggen',
    guestPitchKicker: 'Gratis',
    guestPitchTitle: 'Starter Pack',
    guestPitchBody: 'Melde dich an und bekomm 20 Must Eats. Diese ist dabei.',
    guestPitchCta: 'Starter Pack holen',
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
      'Was du hier bestellen solltest, erfährst du direkt am Spot. Dort kannst du die Karte aufdecken und deinem Deck hinzufügen.',
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
    metaDescription:
      '{done} von {total} Karten umgedreht. \u00dcber hundert Spots in Berlin, und weil Entdecken mehr Spa\u00df macht als Suchen, ist jedes Must Eat eine Karte.',
    metaDescriptionNamed:
      '{name} hat {done} von {total} Karten umgedreht. \u00dcber hundert Spots in Berlin, und weil Entdecken mehr Spa\u00df macht als Suchen, ist jedes Must Eat eine Karte.',
    /* Ueber dem Deck: was das hier ist, in einem Atemzug — mehr braucht es
       nicht, um die Kartenwand darunter zu verstehen. Der ausfuehrliche Teil
       steht UNTER dem Deck (Nutzer, 06.09.2026: „was ist Eat This muss unter
       dem Deck, oder etwas ueber und etwas unter dem Deck an Infos").

       Davor stand die ganze Erklaerung ueber dem Deck und schob es aus dem
       ersten Bildschirm; davor stand sie ganz unten und wurde nie gelesen.
       Beides war zu viel von einer Seite. */
    intro:
      'Jeder Spot auf der Map ist handverlesen. Bei ausgew\u00e4hlten Spots zeigen wir dir au\u00dferdem, welches Gericht du dort bestellen solltest. Diese Must Eats kannst du aufdecken und in deinem Deck sammeln.',
    explainKicker: 'Neu hier?',
    explainTitle: 'Was ist Eat This?',
    explainLead:
      'Jeder Spot auf der Map ist handverlesen. Vom Sterne-Restaurant bis zum Laden um die Ecke.',
    step1Kicker: 'Must Eat',
    step1Title: 'Musst du probieren.',
    step1Body:
      'Jede Karte ist ein Gericht, das wir dir ans Herz legen \u2014 unsere klare Empfehlung f\u00fcr genau dieses Restaurant.',
    step2Kicker: "So geht's",
    step2Title: 'Hin. Tap. Offen.',
    /* Der ganze Handgriff, nicht die Kurzfassung (Nutzer, 06.09.2026: „mehr
       Details … geh hin, oeffne die Karte, tipp sie an — und sie dreht sich
       um, du weißt was du probieren musst und die Karte kommt in dein
       Deck"). Kuerzer steht er im Must-Eats-Onboarding (`mustEats.onb2Body`),
       und das darf so bleiben: dort dreht sich waehrenddessen eine echte
       Karte, hier steht keine. */
    step2Body:
      'Jede Karte geh\u00f6rt zu einem Spot in Berlin. Geh hin, \u00f6ffne die Karte und tipp sie an \u2014 sie dreht sich um, und du wei\u00dft, was du dort bestellen musst.',
    step3Kicker: 'Dein Deck',
    step3Title: 'Und sie geh\u00f6rt dir.',
    step3Body:
      'Die aufgedeckte Karte wandert in dein Deck und bleibt dort. Genau so ist das Deck hier oben entstanden.',
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
    joinLead: '{name} sammelt schon. 20 Karten f\u00fcr dein eigenes Deck\u00a0\u2014 zehn liegen drin, zehn liegen drau\u00dfen. Kostenlos.',
    joinLeadAnon: '20 Karten f\u00fcr dein eigenes Deck\u00a0\u2014 zehn liegen drin, zehn liegen drau\u00dfen. Kostenlos.',
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
      'Dein Deck ist noch leer. Must Eats findest du drau\u00dfen in Berlin und in den Booster Packs.',
    albumHeading: 'Dein Deck',
    /* Der Handgriff in einem Satz. Bis zum 06.09.2026 hatte `deck.howTo`
       einen Zwilling davon; auf dem geteilten Deck tragen ihn jetzt die drei
       Schritte, hier steht er allein. */
    howTo:
      'Hier landen alle Must Eats, die du aufgedeckt hast. Was noch fehlt, wartet drau\u00dfen in Berlin und in den Booster Packs.',
    albumCount: 'von {total} Must Eats',
    /* Der Stempel auf einer Karte, die vor Ort umgedreht wurde. Kurz, weil er
       quer über eine Karte läuft — und Vergangenheit, weil er eine Tat
       bezeugt, keinen Zustand. Gekaufte Karten tragen ihn nicht: das ist der
       ganze Unterschied. */
    albumStamped: 'War da',
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
      'Schick es jemandem, mit dem du gern essen gehst. Ihr bekommt beide eine Karte dafür.',
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
      heroSub: '20 Must Eats, überall in Berlin verteilt. Bereit, von dir entdeckt zu werden.',
      modalBenefitLead: '20 Must Eats, überall in Berlin verteilt. Bereit, von dir entdeckt zu werden.',
      signinBoosterHeadline: 'WE TELL YOU WHAT TO EAT',
      signinBoosterLead: 'Dein Deck wartet. Mach da weiter, wo du aufgehört hast.',
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
