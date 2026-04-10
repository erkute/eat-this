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
      section1Body: 'No endless scrolling. Just the one dish that makes the trip worth it.',
      section2Label: 'About',
      section2Title: 'We started in 2025.',
      section2Body1: 'One rule: one dish per restaurant. No exceptions.',
      section2Body2: 'A small team based in Berlin, eating our way through the city — from hidden ramen bars to Michelin stars. We visit every place ourselves. We talk to the chefs. We go back.',
      section2Body3: "If we recommend it, we'd order it again.",
      section3Label: 'Account',
      section3Title: 'Be the first to know.',
      section3Body: 'Create an account and get new recommendations before anyone else does.',
      section3Cta: 'Create account',
      section4Label: 'Philosophy',
      philo1Title: "One dish. That's the point.",
      philo1Text: 'Anyone can make a top 10. We find the dish that matters.',
      philo2Title: 'We show up.',
      philo2Text: 'We eat there ourselves. We go back. We talk to the chef. Then we make a call.',
      philo3Title: "We don't take money for recommendations.",
      philo3Text: 'Simple as that.',
      section5Label: 'How we choose',
      section5Title: "Most reviews happen once. Ours don't.",
      section5Body1: 'We visit every place more than once, talk to the people behind it, and order everything that looks worth ordering. Then we pick one thing.',
      section5Body2: "That's how we choose.",
      section6Label: "What's next",
      section6Title: 'Berlin is where we started.',
      section6Body1: "It won't be where we stop.",
      section6Cities: "Istanbul, Amsterdam, Paris — we're working on it.",
      section6Body2: 'Same rules, different cities.',
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
        title: "One dish. That's it.",
        body: '<p>No endless scrolling. Just the one dish that makes the trip worth it.</p><h3>We started in 2025.</h3><p>One rule: one dish per restaurant. No exceptions.</p><p>A small team based in Berlin, eating our way through the city \u2014 from hidden ramen bars to Michelin stars. We visit every place ourselves. We talk to the chefs. We go back.</p><p>If we recommend it, we\'d order it again.</p><h3>How we choose</h3><p>Most reviews happen once. Ours don\'t.</p><p>We visit every place more than once, talk to the people behind it, and order everything that looks worth ordering. Then we pick one thing. That\'s how we choose.</p><h3>We don\'t take money for recommendations.</h3><p>Simple as that.</p><h3>What\'s next</h3><p>Berlin is where we started. It won\'t be where we stop.</p><p>Istanbul, Amsterdam, Paris \u2014 we\'re working on it. Same rules, different cities.</p>',
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
function buildNewsCardHtml(a) {
  const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const imgSrc = a.imageUrl || a.img || '';
  const dateLabel = a.date ? new Date(a.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : (a.date || '');
  return [
    `<article class="news-card"`,
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
