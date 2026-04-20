/* ============================================
   EAT THIS — i18n
   All innerHTML usage below reads from the TRANSLATIONS constant only.
   No user input is ever passed to innerHTML.
   ============================================ */

const TRANSLATIONS = {
  en: {
    nav: {
      searchAriaLabel: 'Search',
      menuAriaLabel: 'Menu',
      closeAriaLabel: 'Close',
    },
    hero: {
      tagline: 'We tell you what to eat',
      cta: 'Create account',
    },
    newsletter: {
      eyebrow:     'Stay in the loop',
      title:       'New Must-Eats, every week.',
      sub:         'Get the latest Berlin spots delivered to your inbox — plus a free bonus card pack.',
      placeholder: 'your@email.com',
      cta:         'Subscribe',
      error:       'Please enter a valid email address.',
      success:     'You\'re in! Check your inbox.',
    },
  start: {
      section1Label: 'Eat This',
      section1Title: 'Probably the BEST food guide you know.',
      section1Body: 'The most curated selection of Must-Eats in Berlin. Discover the city via our interactive map and start building your deck.',
      section2Label: 'The Concept',
      section2Title: 'Just order this.',
      section2Body1: 'We hunt down the outstanding dishes. Every Must-Eat Card in your collection represents a recommendation we stand behind—from single iconic plates to entire "Menu Approved" spots.',
      section2Body2: 'Register to unlock your first Booster Pack including 10 free Must-Eat Cards. Collect them all, explore the map, and master the Berlin food scene.',
      section2Body3: '', // Leer lassen oder entfernen
      section3Label: 'Account',
      section3Title: 'Be the first to know.',
      section3Body: 'Create an account and get 10 free Must-Eat Cards to start your collection.',
      section3Cta: 'Create account',
      section4Label: 'Our Standards',
      philo1Title: 'Pure Curation.',
      philo1Text: 'One rule: only the best food. We visit, we taste, we select.',
      philo2Title: 'The Deck.',
      philo2Text: "Hundreds of Must-Eats to discover. Build your personal archive of the city's finest restaurants and cafés.",
      philo3Title: 'Explore the Map.',
      philo3Text: 'Discover the city dish by dish.',
      section5Label: 'How we choose',
      section5Title: 'Only the best makes the deck.',
      section5Body1: 'We visit every place ourselves and talk to the chefs to find the dishes that stand out.',
      section5Body2: '',
      section6Label: "What's next",
      section6Title: 'Berlin is just the first deck.',
      section6Body1: 'We are expanding city by city. More decks, more Must-Eats, and exclusive Merch coming soon.',
      section6Cities: 'Istanbul, Amsterdam, Paris — we’re on it.',
      section6Body2: 'Same approach, different cities.',
    },
      about: {
        title: 'Just order this.',
        body: '<h3>The Concept</h3><p>Eat This is a curated food guide for Berlin. We don’t just list places; we find the outstanding dishes you actually need to try.</p><h3>Must-Eat Cards</h3><p>Every recommendation is a card. Collect them, build your deck, and track your culinary journey through the city. New users receive a 10-card Booster Pack upon registration.</p><h3>Pure Curation</h3><p>We visit every spot, talk to the chefs, and only select what truly stands out. No paid content, no noise—just the best food.</p><h3>What’s Next</h3><p>Berlin is our starting point. Istanbul, Amsterdam, and Paris are coming soon. Same rules, different cities.</p>',
      },
    musts: {
      sectionLabel: 'Berlin',
      subtitle: "The dishes you can't leave Berlin without trying.",
    },
    news: {
      sectionLabel: 'Berlin',
      sectionTitle: 'Food News',
      errorLoad: 'Could not load articles. Please try again later.',
      back: 'Back',
      more: 'More from Eat This',
      // removed: articles[] — content lives in Sanity CMS only
    },
    map: {
      cityLabel: 'Berlin',
      sectionLabel: 'Map',
      sectionTitle: '',
      searchPlaceholder: 'Restaurant, district, pizza…',
      openNow: 'Open',
      filterAll: 'All',
      filterDinner: 'Dinner',
      filterLunch: 'Lunch',
      filterCoffee: 'Coffee',
      filterBreakfast: 'Breakfast',
      filterSweets: 'Sweets',
      filterPizza: 'Pizza',
      myLocationAriaLabel: 'My location',
      errorMapLoad: 'Could not load map',
      locationDenied: 'Location access denied',
      locationUnavailable: 'Location unavailable',
      locationTimeout: 'Location timeout',
      locationError: 'Could not get location',
      nearby: 'Nearby',
      nearbyMore: 'Swipe for more',
      open: 'Open',
      closed: 'Closed',
      openInMaps: 'Open in Maps',
      reserve: 'Reserve',
    },
    footer: {
      start: 'Start',
      news: 'News',
      musts: 'Eat This',
      map: 'Map',
      signIn: 'Login / Register',
      about: 'About',
      contact: 'Contact',
      press: 'Press',
      impressum: 'Impressum',
      datenschutz: 'Privacy',
      agb: 'Terms',
      copyright: '\u00a9 2026 Eat This. All rights reserved.',
    },
    burger: {
      about: 'About',
      contact: 'Contact',
      press: 'Press',
      impressum: 'Impressum',
    },
    theme: {
      darkMode: 'Dark Mode',
    },
    search: {
      placeholder: 'What are you craving?',
      hint: 'Start typing to search...',
      noResults: 'No results for',
      noResultsSub: 'Try a different search term',
      mustEats: 'Must Eats',
      news: 'News',
      restaurants: 'Restaurants',
    },
    cookie: {
      text: 'We use cookies to give you the best experience.',
      moreInfo: 'Learn more',
      accept: 'Accept',
      decline: 'Decline',
    },
   modals: {
      about: {
        title: 'Just order this.',
        body: '<h3>Corrections Policy</h3><p>If we publish something wrong, we want to know. Email <a href="mailto:hello@eatthisdot.com">hello@eatthisdot.com</a> with the article and the correction. We aim to fix factual errors within 24 hours and add a visible note at the bottom of the article explaining what was changed and when. Small typos we silently fix; anything that changes the meaning of a piece gets a visible correction.</p><h3>Fact Checking and Sources</h3><p>Everything we write about a restaurant is based on at least one personal visit. Opening hours, addresses and prices are verified with the restaurant before publication and periodically re-checked. When we quote someone, we quote them on the record.</p><h3>Funding and Transparency</h3><p>EAT THIS is currently self-funded and free for readers. If and when we introduce paid partnerships, subscriptions, or sponsored content, they will always be labelled clearly and kept separate from our editorial recommendations. We are not owned by, invested in, or paid by any restaurant, restaurant group or food brand. Full company and contact details are in our Impressum.</p><h3>Editorial Contact</h3><p>Editorial questions, tips, corrections: <a href="mailto:hello@eatthisdot.com">hello@eatthisdot.com</a></p><h3>The Concept</h3><p>Eat This is a curated food guide for Berlin. We don\u2019t just list places; we find the outstanding dishes you actually need to try.</p><h3>Must-Eat Cards</h3><p>Every recommendation is a card. Collect them, build your deck, and track your culinary journey through the city. New users receive a 10-card Booster Pack upon registration.</p><h3>Pure Curation</h3><p>We visit every spot, talk to the chefs, and only select what truly stands out. No paid content, no noise\u2014just the best food.</p><h3>What\u2019s Next</h3><p>Berlin is our starting point. Istanbul, Amsterdam, and Paris are coming soon. Same rules, different cities.</p>',
      },
      contact: {
        title: 'Get in touch',
        body: '<h3>Restaurant tip?</h3><p>Know a place we absolutely need to try? We\'re always looking for new Must Eats. Send us your recommendation and we\'ll check it out.</p><h3>Something wrong?</h3><p>A restaurant closed? A dish changed? Help us keep our recommendations accurate. Drop us a line and we\'ll update it.</p><h3>Just want to say hi?</h3><p>We\'re real people and we read every message. Whether it\'s feedback, a question, or just a hello \u2014 we\'re here.</p><p><a href="mailto:hello@eatthisdot.com">hello@eatthisdot.com</a></p><p>We usually respond within 24 hours.</p>',
      },
      press: {
        title: 'Press & Media',
        body: '<h3>About EAT THIS</h3><p>EAT THIS is a curated food guide for Berlin. Instead of overwhelming you with options, we pick the one dish you absolutely have to try at each restaurant. Founded in 2025, we\'ve become the go-to source for honest, no-nonsense food recommendations in Berlin.</p><h3>Logo & Assets</h3><p>Our logo and brand assets are available for press use. Please use them as-is and follow our brand guidelines. Contact us for high-resolution files.</p><h3>Press inquiries</h3><p><a href="mailto:hello@eatthisdot.com">hello@eatthisdot.com</a></p>',
      },
      impressum: {
        title: 'Impressum',
        body: '<h3>Angaben gem\u00e4\u00df \u00a7 5 TMG</h3><p>EAT THIS<br>Berlin, Deutschland<br><a href="mailto:hello@eatthisdot.com">hello@eatthisdot.com</a></p><h3>Verantwortlich f\u00fcr den Inhalt</h3><p>EAT THIS Redaktion, Berlin</p><h3>Haftungsausschluss</h3><p>Die Inhalte dieser Website wurden mit gr\u00f6\u00dfter Sorgfalt erstellt. F\u00fcr die Richtigkeit, Vollst\u00e4ndigkeit und Aktualit\u00e4t der Inhalte k\u00f6nnen wir jedoch keine Gew\u00e4hr \u00fcbernehmen.</p><h3>Urheberrecht</h3><p>Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht.</p>',
      },
      agb: {
        title: 'Terms & Conditions',
        body: '<h3>Scope</h3><p>These terms apply to the use of the EAT THIS platform, including all content, features and services.</p><h3>Use</h3><p>EAT THIS is an editorial food guide for Berlin. The content is for informational purposes only and does not constitute a commercial recommendation.</p><h3>Liability</h3><p>We make no guarantee as to the timeliness, completeness or accuracy of the information provided.</p><h3>Contact</h3><p>Questions: <a href="mailto:hello@eatthisdot.com">hello@eatthisdot.com</a></p>',
      },
      datenschutz: {
        title: 'Privacy Policy',
        body: '<h3>Controller</h3><p>EAT THIS, Berlin. Contact: <a href="mailto:hello@eatthisdot.com">hello@eatthisdot.com</a></p><h3>Data Collection</h3><p>When you register, we store your name and email address to manage your account.</p><h3>Cookies</h3><p>We use technically necessary cookies as well as third-party cookies (map, fonts). Details can be found in our Cookie Policy.</p><h3>Your Rights</h3><p>You have the right to access, correct and delete your data at any time. Requests to: <a href="mailto:hello@eatthisdot.com">hello@eatthisdot.com</a></p>',
      },
      cookies: {
        title: 'Cookie Policy',
        body: '<h3>What are cookies?</h3><p>Cookies are small text files stored on your device when you visit a website. They help save your preferences and improve your browsing experience.</p><h3>How we use cookies</h3><p>EAT THIS uses minimal cookies, mainly from third parties:</p><ul><li><strong>Google Fonts</strong> \u2014 fonts for better typography</li><li><strong>Leaflet / CartoDB</strong> \u2014 tiles for our Food Map</li><li><strong>Instagram / Meta</strong> \u2014 embedded posts</li></ul><h3>Managing cookies</h3><p>You can block or delete cookies at any time in your browser settings. Some features of the site may be limited as a result.</p><h3>Contact</h3><p>Questions? <a href="mailto:hello@eatthisdot.com">hello@eatthisdot.com</a></p>',
      },
      login: {
        titleRegister: 'Create account',
        subtitleRegister: 'Sign up to discover the best dishes in Berlin.',
        titleLogin: 'Sign in',
        subtitleLogin: 'Welcome back.',
        namePlaceholder: 'Name',
        emailPlaceholder: 'Email',
        passwordPlaceholder: 'Password',
        forgotPassword: 'Forgot password?',
        submitRegister: 'Create account',
        submitLogin: 'Sign in',
        googleBtn: 'Continue with Google',
        termsText: 'By signing up, you agree to our',
        termsLink: 'Terms',
        privacyLink: 'Privacy Policy',
        dividerOr: 'or',
        toggleToLogin: 'Already have an account? Sign in',
        toggleToRegister: 'New here? Create account',
        logoutBtn: 'Sign out',
        errors: {
          emailRequired:       'Please enter your email address.',
          passwordRequired:    'Please enter your password.',
          nameRequired:        'Please enter your name.',
          emailRequiredFirst:  'Please enter your email address first.',
          emailInUse:          'This email is already registered.',
          invalidEmail:        'Invalid email address.',
          weakPassword:        'Password too weak (min. 6 characters).',
          wrongPassword:       'Incorrect password.',
          userNotFound:        'No account with this email address.',
          invalidCredential:   'Email or password incorrect.',
          tooManyRequests:     'Too many attempts — please wait a moment.',
          tooManyRequestsLong: 'Too many attempts — please try again in an hour.',
          networkFailed:       'Network error — please try again.',
          sendFailed:          'Error sending — please try again.',
          generic:             'An error occurred. Please try again.',
        },
        notifications: {
          welcome:   'Welcome to EAT THIS, {name}!',
          signedIn:  'Hey {name}, good to see you!',
          signedOut: 'You have been signed out.',
        },
        forgotSuccess: "If an account exists, we've sent you a link. Please check your inbox.",
      },
    },
    profile: {
      signInTitle: 'Sign in to EAT THIS',
      signInSub:   'Save restaurants, collect your Must Eat deck and manage your account.',
      tab:     { deck: 'My Deck', saved: 'Saved', settings: 'Settings' },
      saved:   { empty: 'You have no saved restaurants yet.', title: 'Saved Places' },
      deck:    { boosterSection: 'Booster Packs', unlockBtn: 'Unlock', comingSoon: 'Coming Soon' },
      booster: { title: 'Booster Packs - Coming Soon', sub: 'Expand your deck with exclusive dishes' },
      settings: {
        displayName:        'Display name',
        displayNamePlaceholder: 'Your name',
        saveBtn:            'Save',
        email:              'Email',
        security:           'Security',
        resetPassword:      'Reset password',
        signOut:            'Sign out',
        deleteAccount:      'Delete account',
        savedFeedback:      'Saved \u2713',
        saveError:          'Error saving.',
        emailSent:          'Email sent \u2713',
        tryAgain:           'Error. Please try again.',
        deleteConfirm:      'Are you sure? Your account will be permanently deleted.',
        deleteError:        'Error. Please log in again and try again.',
      },
    },
  },

  // DE skeleton — all keys mirror EN; fill values when launching German version
  de: {},
};

// Populate DE with EN as fallback (deep copy)
(function buildDeFallback() {
  function deepCopy(src) {
    if (Array.isArray(src)) return src.map(deepCopy);
    if (src && typeof src === 'object') {
      const out = {};
      for (const k in src) out[k] = deepCopy(src[k]);
      return out;
    }
    return src;
  }
  TRANSLATIONS.de = deepCopy(TRANSLATIONS.en);
})();

// DE profile overrides
TRANSLATIONS.de.profile.signInTitle     = 'Bei EAT THIS anmelden';
TRANSLATIONS.de.profile.signInSub       = 'Speichere Restaurants, sammel dein Must Eat Deck und verwalte deinen Account.';
TRANSLATIONS.de.profile.tab.deck        = 'Mein Deck';
TRANSLATIONS.de.profile.tab.saved       = 'Gespeichert';
TRANSLATIONS.de.profile.tab.settings    = 'Einstellungen';
TRANSLATIONS.de.profile.saved.empty     = 'Du hast noch keine Restaurants gespeichert.';
TRANSLATIONS.de.profile.saved.title     = 'Gespeicherte Orte';
TRANSLATIONS.de.profile.deck.unlockBtn  = 'Freischalten';
TRANSLATIONS.de.profile.deck.comingSoon = 'Demnächst';
TRANSLATIONS.de.profile.booster.title   = 'Booster Packs - Demnächst';
TRANSLATIONS.de.profile.booster.sub     = 'Erweitere dein Deck mit exklusiven Gerichten';
TRANSLATIONS.de.profile.settings.displayName        = 'Anzeigename';
TRANSLATIONS.de.profile.settings.displayNamePlaceholder = 'Dein Name';
TRANSLATIONS.de.profile.settings.saveBtn            = 'Speichern';
TRANSLATIONS.de.profile.settings.email              = 'E-Mail';
TRANSLATIONS.de.profile.settings.security           = 'Sicherheit';
TRANSLATIONS.de.profile.settings.resetPassword      = 'Passwort zur\u00FCcksetzen';
TRANSLATIONS.de.profile.settings.signOut            = 'Abmelden';
TRANSLATIONS.de.profile.settings.deleteAccount      = 'Account l\u00F6schen';
TRANSLATIONS.de.profile.settings.savedFeedback      = 'Gespeichert \u2713';
TRANSLATIONS.de.profile.settings.saveError          = 'Fehler beim Speichern.';
TRANSLATIONS.de.profile.settings.emailSent          = 'E-Mail gesendet \u2713';
TRANSLATIONS.de.profile.settings.tryAgain           = 'Fehler. Bitte erneut versuchen.';
TRANSLATIONS.de.profile.settings.deleteConfirm      = 'Bist du sicher? Dein Account wird dauerhaft gel\u00F6scht.';
TRANSLATIONS.de.profile.settings.deleteError        = 'Fehler. Bitte neu einloggen und erneut versuchen.';

// DE hero overrides
TRANSLATIONS.de.hero.tagline = 'Wir sagen dir, was du essen sollst';
TRANSLATIONS.de.hero.cta     = 'Konto erstellen';

// DE newsletter
TRANSLATIONS.de.newsletter = {
  eyebrow:     'Immer up to date',
  title:       'Neue Must-Eats, jede Woche.',
  sub:         'Die besten neuen Spots aus Berlin — direkt in dein Postfach.',
  placeholder: 'deine@email.com',
  cta:         'Anmelden',
  error:       'Bitte gib eine gültige E-Mail-Adresse ein.',
  success:     'Du bist dabei! Schau in dein Postfach.',
};

// DE start page overrides
TRANSLATIONS.de.start.section1Title  = 'Wahrscheinlich der beste Food-Guide, den du kennst.';
TRANSLATIONS.de.start.section1Body   = 'Die kuratierteste Auswahl an Must-Eats in Berlin. Entdecke die Stadt auf unserer interaktiven Karte und starte dein Deck.';
TRANSLATIONS.de.start.section2Label  = 'Das Konzept';
TRANSLATIONS.de.start.section2Title  = 'Bestell genau das.';
TRANSLATIONS.de.start.section2Body1  = 'Wir sp\u00fcren herausragende Gerichte auf. Jede Must-Eat-Karte in deiner Sammlung steht f\u00fcr eine Empfehlung, hinter der wir stehen \u2013 von einzelnen ikonischen Tellern bis hin zu ganzen \u201eMenu Approved\u201c-Spots.';
TRANSLATIONS.de.start.section2Body2  = 'Registriere dich, um dein erstes Booster Pack mit 10 kostenlosen Must-Eat-Karten freizuschalten. Sammle sie alle, erkunde die Karte und meistere die Berliner Food-Szene.';
TRANSLATIONS.de.start.section3Label  = 'Account';
TRANSLATIONS.de.start.section3Title  = 'Sei der Erste.';
TRANSLATIONS.de.start.section3Body   = 'Erstelle einen Account und erhalte 10 kostenlose Must-Eat-Karten f\u00fcr deine Sammlung.';
TRANSLATIONS.de.start.section3Cta   = 'Konto erstellen';
TRANSLATIONS.de.start.section4Label  = 'Unsere Standards';
TRANSLATIONS.de.start.philo1Title    = 'Reine Kuration.';
TRANSLATIONS.de.start.philo1Text     = 'Eine Regel: nur das beste Essen. Wir besuchen, wir kosten, wir w\u00e4hlen aus.';
TRANSLATIONS.de.start.philo2Title    = 'Das Deck.';
TRANSLATIONS.de.start.philo2Text     = 'Hunderte von Must-Eats zu entdecken. Baue dein pers\u00f6nliches Archiv der feinsten Restaurants und Caf\u00e9s der Stadt.';
TRANSLATIONS.de.start.philo3Title    = 'Erkunde die Karte.';
TRANSLATIONS.de.start.philo3Text     = 'Entdecke die Stadt Gericht f\u00fcr Gericht.';
TRANSLATIONS.de.start.section5Label  = 'Wie wir ausw\u00e4hlen';
TRANSLATIONS.de.start.section5Title  = 'Nur das Beste kommt ins Deck.';
TRANSLATIONS.de.start.section5Body1  = 'Wir besuchen jeden Ort selbst und sprechen mit den K\u00f6chen, um die Gerichte zu finden, die wirklich herausragen.';
TRANSLATIONS.de.start.section5Body2  = '';
TRANSLATIONS.de.start.section6Label  = 'Was kommt';
TRANSLATIONS.de.start.section6Title  = 'Berlin ist erst der Anfang.';
TRANSLATIONS.de.start.section6Body1  = 'Wir expandieren Stadt f\u00fcr Stadt. Mehr Decks, mehr Must-Eats und exklusives Merch kommen bald.';
TRANSLATIONS.de.start.section6Cities = 'Istanbul, Amsterdam, Paris \u2013 wir sind dran.';
TRANSLATIONS.de.start.section6Body2  = 'Gleicher Anspruch, andere St\u00e4dte.';

// DE musts overrides
TRANSLATIONS.de.musts.subtitle = 'Die Gerichte, die du in Berlin nicht verpassen darfst.';

// DE news overrides
TRANSLATIONS.de.news.errorLoad = 'Artikel konnten nicht geladen werden. Bitte versuche es sp\u00e4ter erneut.';
TRANSLATIONS.de.news.back      = 'Zur\u00fcck';
TRANSLATIONS.de.news.more      = 'Mehr von Eat This';

// DE map overrides
TRANSLATIONS.de.map.filterAll       = 'Alle';
TRANSLATIONS.de.map.filterCoffee    = 'Kaffee';
TRANSLATIONS.de.map.filterBreakfast = 'Fr\u00fchst\u00fcck';
TRANSLATIONS.de.map.filterSweets    = 'S\u00fc\u00dfes';
TRANSLATIONS.de.map.nearby          = 'In deiner N\u00e4he';
TRANSLATIONS.de.map.nearbyMore      = 'Mehr entdecken';
TRANSLATIONS.de.map.locationDenied      = 'Standortzugriff verweigert';
TRANSLATIONS.de.map.locationUnavailable = 'Standort nicht verf\u00fcgbar';
TRANSLATIONS.de.map.locationTimeout     = 'Standort-Zeitlimit';
TRANSLATIONS.de.map.locationError       = 'Standort konnte nicht ermittelt werden';
TRANSLATIONS.de.map.sectionLabel      = 'Map';
TRANSLATIONS.de.map.searchPlaceholder = 'Restaurant, Bezirk, Pizza…';
TRANSLATIONS.de.map.openNow           = 'Offen';
TRANSLATIONS.de.map.open        = 'Ge\u00f6ffnet';
TRANSLATIONS.de.map.closed      = 'Geschlossen';
TRANSLATIONS.de.map.openInMaps  = 'In Maps \u00f6ffnen';
TRANSLATIONS.de.map.reserve     = 'Reservieren';

// DE search overrides (section titles)
TRANSLATIONS.de.search.restaurants = 'Restaurants';

// DE footer overrides
TRANSLATIONS.de.footer.signIn      = 'Anmelden / Registrieren';
TRANSLATIONS.de.footer.about       = '\u00dcber uns';
TRANSLATIONS.de.footer.contact     = 'Kontakt';
TRANSLATIONS.de.footer.press       = 'Presse';
TRANSLATIONS.de.footer.datenschutz = 'Datenschutz';
TRANSLATIONS.de.footer.agb         = 'AGB';

// DE burger-drawer footer labels (modal titles used as the button text)
TRANSLATIONS.de.modals.datenschutz.title = 'Datenschutz';
TRANSLATIONS.de.modals.agb.title         = 'AGB';
TRANSLATIONS.de.footer.copyright   = '\u00a9 2026 Eat This. Alle Rechte vorbehalten.';

// DE burger menu overrides
TRANSLATIONS.de.burger.about    = '\u00dcber uns';
TRANSLATIONS.de.burger.contact  = 'Kontakt';
TRANSLATIONS.de.burger.press    = 'Presse';

// DE theme overrides
TRANSLATIONS.de.theme = { darkMode: 'Dark Mode' };

// DE cookie overrides
TRANSLATIONS.de.cookie.text     = 'Wir verwenden Cookies, um dir das beste Erlebnis zu bieten.';
TRANSLATIONS.de.cookie.moreInfo = 'Mehr erfahren';
TRANSLATIONS.de.cookie.accept   = 'Akzeptieren';
TRANSLATIONS.de.cookie.decline  = 'Ablehnen';

// DE search overrides
TRANSLATIONS.de.search.placeholder  = 'Worauf hast du Appetit?';
TRANSLATIONS.de.search.hint         = 'Tippen zum Suchen\u2026';
TRANSLATIONS.de.search.noResults    = 'Keine Ergebnisse f\u00fcr';
TRANSLATIONS.de.search.noResultsSub = 'Versuche einen anderen Suchbegriff';

// ─── ENGINE ───────────────────────────────────────────────────────────────

// Must match the priority used in the inline bootstrap script in index.html.
// URL ?lang= wins (shareable EN links); otherwise localStorage; otherwise
// browser language; otherwise 'de' (Berlin-first default).
let _lang = (function () {
  const fromUrl = new URLSearchParams(window.location.search).get('lang');
  if (fromUrl === 'de' || fromUrl === 'en') return fromUrl;
  const stored = localStorage.getItem('lang');
  if (stored === 'de' || stored === 'en') return stored;
  const nav = (navigator.language || 'de').toLowerCase();
  if (nav.indexOf('de') === 0) return 'de';
  if (nav.indexOf('en') === 0) return 'en';
  return 'de';
})();
let _articlesCache = null; // bilingual articles, fetched once

function t(keyPath) {
  const keys = keyPath.split('.');
  let val = TRANSLATIONS[_lang] || TRANSLATIONS.en;
  for (const k of keys) {
    if (val == null) return keyPath;
    val = val[k];
  }
  return val != null ? val : keyPath;
}

function currentLang() { return _lang; }

// Applies all data-i18n* attributes in the DOM.
// All content is from TRANSLATIONS constant — no user data.
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const val = t(el.getAttribute('data-i18n'));
    if (typeof val === 'string') el.textContent = val;
  });

  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const val = t(el.getAttribute('data-i18n-html'));
    if (typeof val === 'string') el.innerHTML = val; // safe: source is TRANSLATIONS constant
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const val = t(el.getAttribute('data-i18n-placeholder'));
    if (typeof val === 'string') el.placeholder = val;
  });

  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const val = t(el.getAttribute('data-i18n-aria'));
    if (typeof val === 'string') el.setAttribute('aria-label', val);
  });

  document.documentElement.lang = _lang;

  // Keep og:locale in sync so a share from an ?lang=en session carries EN locale.
  const ogLocale = document.querySelector('meta[property="og:locale"]');
  const ogAlt    = document.querySelector('meta[property="og:locale:alternate"]');
  if (ogLocale) ogLocale.setAttribute('content', _lang === 'de' ? 'de_DE' : 'en_US');
  if (ogAlt)    ogAlt.setAttribute('content',    _lang === 'de' ? 'en_US' : 'de_DE');

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === _lang);
  });
}

// Build a single news card HTML string.
// All dynamic values are escaped with esc() before insertion.
// HTML structure is hardcoded — not derived from user or CMS input.
// Source is our own Sanity CMS (trusted) or the TRANSLATIONS constant.
function buildNewsCardHtml(a, i) {
  const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const imgSrc = a.imageUrl || a.img || '';
  const dateLocale = _lang === 'de' ? 'de-DE' : 'en-US';
  const dateLabel = a.date ? new Date(a.date).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric' }) : (a.date || '');
  return [
    `<article class="news-card"`,
    ` data-index="${i}"`,
    ` data-category="${esc(a.category)}"`,
    ` data-title="${esc(a.title)}"`,
    ` data-img="${esc(imgSrc)}"`,
    ` data-category-label="${esc(a.categoryLabel)}"`,
    ` data-date="${esc(dateLabel)}"`,
    ` data-excerpt="${esc(a.excerpt)}"`,
    ` data-content="${esc(Array.isArray(a.content) ? JSON.stringify(a.content) : (a.content || ''))}"`,
    ` data-slug="${esc(a.id)}">`,
    `<a href="${a.id ? `/news/${a.id}` : '#'}">`,
    `<div class="news-card-img"><img src="${esc(imgSrc)}" alt="${esc(a.alt || a.title)}" loading="lazy"></div>`,
    `<div class="news-card-body">`,
    `<div class="news-card-top">`,
    `<span class="news-card-category">${esc(a.categoryLabel)}</span>`,
    `<time class="news-card-date" datetime="${esc(a.dateISO || a.date)}">${esc(dateLabel)}</time>`,
    `</div>`,
    `<h3 class="news-card-headline">${esc(a.title)}</h3>`,
    `<p class="news-card-excerpt">${esc(a.excerpt)}</p>`,
    `</div></a></article>`,
  ].join('');
}

// Renders news cards. Fetches once and caches — re-renders instantly on language switch.
// All dynamic values are escaped by buildNewsCardHtml; HTML structure is hardcoded (XSS-safe).
async function renderNewsCards() {
  const grid = document.querySelector('.news-grid');
  if (!grid) return;

  if (!_articlesCache && window.CMS) {
    _articlesCache = await window.CMS.fetchNews();
  }

  if (_articlesCache && _articlesCache.length) {
    const isDe = _lang === 'de';
    const localized = _articlesCache.map(a => ({
      ...a,
      title:         (isDe && a.titleDe)         ? a.titleDe         : a.title,
      categoryLabel: (isDe && a.categoryLabelDe) ? a.categoryLabelDe : a.categoryLabel,
      excerpt:       (isDe && a.excerptDe)       ? a.excerptDe       : a.excerpt,
      content:       (isDe && a.contentDe)       ? a.contentDe       : a.content,
    }));
    grid.innerHTML = localized.map(buildNewsCardHtml).join(''); // safe: see buildNewsCardHtml
    if (typeof window._bindNewsCards === 'function') window._bindNewsCards();
  } else {
    const msg = TRANSLATIONS[_lang]?.news?.errorLoad || 'Could not load articles.';
    grid.innerHTML = `<p class="news-error">${msg}</p>`; // safe: msg is from TRANSLATIONS constant
  }
}

function setLang(lang) {
  if (!TRANSLATIONS[lang]) return;
  _lang = lang;
  localStorage.setItem('lang', lang);
  // Keep URL in sync so shared links carry the chosen language.
  // DE = canonical (no param); EN = ?lang=en.
  try {
    const url = new URL(window.location.href);
    if (lang === 'en') url.searchParams.set('lang', 'en');
    else url.searchParams.delete('lang');
    window.history.replaceState(null, '', url.toString());
  } catch { /* non-critical: URL sync failure shouldn't block translation */ }
  applyTranslations(); // also syncs <html lang> and og:locale
  renderNewsCards().then(() => {
    if (typeof window._bindNewsCards === 'function') window._bindNewsCards();
  });
}

// ─── INIT ─────────────────────────────────────────────────────────────────
// DOMContentLoaded fires before app.js listener (i18n.js loads first in HTML).
// News cards are rendered before app.js reads them from the DOM.

document.addEventListener('DOMContentLoaded', () => {
  renderNewsCards();
  applyTranslations();

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });
});

// Merges CMS startContent fields into TRANSLATIONS and re-renders all data-i18n elements.
function applyStartContent(d) {
  if (!d) return;
  const map = [
    ['s1LabelEn',    'en', 'start', 'section1Label'],
    ['s1LabelDe',    'de', 'start', 'section1Label'],
    ['s1TitleEn',    'en', 'start', 'section1Title'],
    ['s1TitleDe',    'de', 'start', 'section1Title'],
    ['s1BodyEn',     'en', 'start', 'section1Body'],
    ['s1BodyDe',     'de', 'start', 'section1Body'],
    ['s2LabelEn',    'en', 'start', 'section2Label'],
    ['s2LabelDe',    'de', 'start', 'section2Label'],
    ['s2TitleEn',    'en', 'start', 'section2Title'],
    ['s2TitleDe',    'de', 'start', 'section2Title'],
    ['s2Body1En',    'en', 'start', 'section2Body1'],
    ['s2Body1De',    'de', 'start', 'section2Body1'],
    ['s2Body2En',    'en', 'start', 'section2Body2'],
    ['s2Body2De',    'de', 'start', 'section2Body2'],
    ['philoLabelEn', 'en', 'start', 'section4Label'],
    ['philoLabelDe', 'de', 'start', 'section4Label'],
    ['philo1TitleEn','en', 'start', 'philo1Title'],
    ['philo1TitleDe','de', 'start', 'philo1Title'],
    ['philo1TextEn', 'en', 'start', 'philo1Text'],
    ['philo1TextDe', 'de', 'start', 'philo1Text'],
    ['philo2TitleEn','en', 'start', 'philo2Title'],
    ['philo2TitleDe','de', 'start', 'philo2Title'],
    ['philo2TextEn', 'en', 'start', 'philo2Text'],
    ['philo2TextDe', 'de', 'start', 'philo2Text'],
    ['philo3TitleEn','en', 'start', 'philo3Title'],
    ['philo3TitleDe','de', 'start', 'philo3Title'],
    ['philo3TextEn', 'en', 'start', 'philo3Text'],
    ['philo3TextDe', 'de', 'start', 'philo3Text'],
    ['s5LabelEn',    'en', 'start', 'section5Label'],
    ['s5LabelDe',    'de', 'start', 'section5Label'],
    ['s5TitleEn',    'en', 'start', 'section5Title'],
    ['s5TitleDe',    'de', 'start', 'section5Title'],
    ['s5BodyEn',     'en', 'start', 'section5Body1'],
    ['s5BodyDe',     'de', 'start', 'section5Body1'],
    ['s6LabelEn',    'en', 'start', 'section6Label'],
    ['s6LabelDe',    'de', 'start', 'section6Label'],
    ['s6TitleEn',    'en', 'start', 'section6Title'],
    ['s6TitleDe',    'de', 'start', 'section6Title'],
    ['s6BodyEn',     'en', 'start', 'section6Body1'],
    ['s6BodyDe',     'de', 'start', 'section6Body1'],
    ['s6CitiesEn',   'en', 'start', 'section6Cities'],
    ['s6CitiesDe',   'de', 'start', 'section6Cities'],
  ];
  for (const [cmsKey, lang, section, key] of map) {
    if (d[cmsKey]) TRANSLATIONS[lang][section][key] = d[cmsKey];
  }
  applyTranslations();
}

window.i18n = { t, setLang, currentLang, renderNewsCards, applyTranslations, applyStartContent };
