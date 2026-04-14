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
  start: {
      section1Label: 'Eat This',
      section1Title: 'Probably the best food guide you know.',
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
      philo1Text: "One rule: only the best food. We visit, we taste, we select. If it's not outstanding, it doesn't get a card.",
      philo2Title: 'The Deck.',
      philo2Text: "Hundreds of Must-Eats to discover. Build your personal archive of the city's finest restaurants and cafés.",
      philo3Title: 'Always Independent.',
      philo3Text: "No paid placements. We tell you what to eat based on quality, nothing else.",
      section5Label: 'How we choose',
      section5Title: 'Only the best makes the deck.',
      section5Body1: 'We visit every place ourselves and talk to the chefs to find the dishes that stand out. If we would order it again, it makes the list.',
      section5Body2: 'That’s how we curate.',
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
      // removed: articles[] — content lives in Sanity CMS only
    },
    map: {
      sectionLabel: 'Find',
      sectionTitle: 'Eat Around',
      filterAll: 'All',
      myLocationAriaLabel: 'My location',
      errorMapLoad: 'Could not load map',
      locationDenied: 'Location access denied',
      locationUnavailable: 'Location unavailable',
      locationTimeout: 'Location timeout',
      locationError: 'Could not get location',
      nearby: 'Nearby',
      nearbyMore: 'Swipe for more',
    },
    footer: {
      start: 'Start',
      news: 'News',
      musts: 'Eat This',
      map: 'Map',
      signIn: 'Sign In',
    },
    search: {
      placeholder: 'What are you craving?',
      hint: 'Start typing to search...',
      noResults: 'No results for',
      noResultsSub: 'Try a different search term',
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
        body: '<h3>The Concept</h3><p>Eat This is a curated food guide for Berlin. We don’t just list places; we find the outstanding dishes you actually need to try.</p><h3>Must-Eat Cards</h3><p>Every recommendation is a card. Collect them, build your deck, and track your culinary journey through the city. New users receive a 10-card Booster Pack upon registration.</p><h3>Pure Curation</h3><p>We visit every spot, talk to the chefs, and only select what truly stands out. No paid content, no noise—just the best food.</p><h3>What’s Next</h3><p>Berlin is our starting point. Istanbul, Amsterdam, and Paris are coming soon. Same rules, different cities.</p>',
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
      tab:     { deck: 'My Deck', saved: 'Saved', settings: 'Settings' },
      saved:   { empty: 'You have no saved restaurants yet.' },
      deck:    { boosterSection: 'Booster Packs', unlockBtn: 'Unlock', comingSoon: 'Coming Soon' },
      booster: { title: 'Booster Packs - Coming Soon', sub: 'Expand your deck with exclusive dishes' },
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
TRANSLATIONS.de.profile.tab.deck        = 'Mein Deck';
TRANSLATIONS.de.profile.tab.saved       = 'Gespeichert';
TRANSLATIONS.de.profile.tab.settings    = 'Einstellungen';
TRANSLATIONS.de.profile.saved.empty     = 'Du hast noch keine Restaurants gespeichert.';
TRANSLATIONS.de.profile.deck.unlockBtn  = 'Freischalten';
TRANSLATIONS.de.profile.deck.comingSoon = 'Demnächst';
TRANSLATIONS.de.profile.booster.title   = 'Booster Packs - Demnächst';
TRANSLATIONS.de.profile.booster.sub     = 'Erweitere dein Deck mit exklusiven Gerichten';

// ─── ENGINE ───────────────────────────────────────────────────────────────

let _lang = localStorage.getItem('lang') || 'en';

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
  const dateLabel = a.date ? new Date(a.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : (a.date || '');
  return [
    `<article class="news-card"`,
    ` data-index="${i}"`,
    ` data-category="${esc(a.category)}"`,
    ` data-title="${esc(a.title)}"`,
    ` data-img="${esc(imgSrc)}"`,
    ` data-category-label="${esc(a.categoryLabel)}"`,
    ` data-date="${esc(dateLabel)}"`,
    ` data-excerpt="${esc(a.excerpt)}"`,
    ` data-content="${esc(Array.isArray(a.content) ? JSON.stringify(a.content) : (a.content || ''))}">`,
    `<a href="#">`,
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

// Renders news cards. Source of truth: Sanity CMS only.
async function renderNewsCards() {
  const grid = document.querySelector('.news-grid');
  if (!grid) return;

  const articles = window.CMS ? await window.CMS.fetchNews(_lang) : null;

  if (articles && articles.length) {
    // safe: all values escaped by buildNewsCardHtml; HTML structure is hardcoded
    grid.innerHTML = articles.map(buildNewsCardHtml).join('');
    if (typeof window._bindNewsCards === 'function') window._bindNewsCards();
  } else {
    const msg = TRANSLATIONS[_lang]?.news?.errorLoad || 'Could not load articles.';
    grid.innerHTML = `<p class="news-error">${msg}</p>`;
  }
}

function setLang(lang) {
  if (!TRANSLATIONS[lang]) return;
  _lang = lang;
  localStorage.setItem('lang', lang);
  applyTranslations();
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

window.i18n = { t, setLang, currentLang, renderNewsCards };
