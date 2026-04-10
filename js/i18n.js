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
      articles: [
        {
          id: 'bun-society',
          title: 'The Bun Society: Why This Smashburger Spot in Kreuzberg Makes You Forget All the Others',
          excerpt: 'Same Same But Different — smashburgers with Korean, Thai and Middle Eastern flavours. The Bussin Bulgogi is a revelation.',
          category: 'guides',
          categoryLabel: 'Guides',
          date: 'March 24',
          dateISO: '2026-03-24',
          img: 'pics/news/bun-society.webp',
          alt: 'The Bun Society Kreuzberg',
          content: '<p>Berlin feels like it has a smashburger spot on every corner. But The Bun Society in Kreuzberg does something different: they combine the crispy, lacy-edged patties of the American smashburger format with flavours from Southeast Asia, Korea and the Middle East. The result is one of the most exciting burger menus in the city.</p><h4>The Address</h4><p>Adalbertstra\u00dfe 23 in Kreuzberg \u2014 the spot is unassuming, the queue outside says it all. Open Thursday to Sunday, making it the perfect weekend destination.</p><h4>What to Order</h4><p>The Bussin Bulgogi is the star: Korean beef, sweet-salty-umami, with perfect crust edges on the patty. Also worth trying: the Banging Bangkok with a Thai profile and the Gochu Chick with Korean gochujang. Eight burgers on the menu \u2014 all have their reason to exist.</p><h4>The Concept</h4><p>The Bun Society positions itself with the slogan "Same Same But Different". Fresh ingredients, globally influenced recipes, but the familiar comfort-food soul of the burger stays intact. 5.0 stars from 160 reviews is no coincidence.</p><h4>Our Verdict</h4><p>If you think you\'ve already had the best smashburger in Berlin, give The Bun Society a visit. Thursday to Sunday, Adalbertstra\u00dfe 23, Kreuzberg. Also available on Uber Eats.</p>',
        },
        {
          id: 'ramen-berlin',
          title: "Berlin's New Ramen Wave: Why the Capital Now Has the Ultimate Noodle House",
          excerpt: 'Three new ramen spots have opened in the past few weeks — all using hand-pulled noodles and 18-hour broths. We tested all three.',
          category: 'openings',
          categoryLabel: 'Openings',
          date: 'March 15',
          dateISO: '2026-03-15',
          img: 'pics/news/ramen.webp',
          alt: "Berlin's new ramen wave",
          content: '<p>Berlin is going through a ramen revolution. In the last four weeks, three new restaurants have opened that focus exclusively on Japanese noodle soups \u2014 and all three use hand-pulled noodles and broths that simmer for up to 18 hours.</p><h4>Fukagawa Ramen \u2014 Prenzlauer Berg</h4><p>The smallest of the three sits on Lychener Stra\u00dfe with only 16 seats. The tonkotsu broth is creamier than anything we\'ve tried in Berlin. The owner learned his craft in Fukuoka and brought the original recipe with him. Recommendation: Spicy Miso Ramen with extra chashu.</p><h4>Cocolo Ramen \u2014 Kreuzberg</h4><p>Cocolo opens its second Berlin location on Paul-Lincke-Ufer. The Shinjuku-style ramen here are lighter than Fukagawa\'s but more aromatic. The eggs are perfect \u2014 soft, juicy, soy-marinated. Tip: come early, weekend wait times are long.</p><h4>Wen Cheng Ramen \u2014 Friedrichshain</h4><p>The big surprise: Wen Cheng, known for its Biang Biang noodles, has set up a ramen pop-up corner. The fusion ramen with Chinese influences is unlike anything else. The Dan-Dan Ramen with Sichuan pepper is a must for adventurous eaters.</p><h4>Our Verdict</h4><p>Berlin now has three addresses that can hold their own against Tokyo. All three are worth it \u2014 but if you can only pick one: Fukagawa for authenticity, Cocolo for atmosphere, Wen Cheng for innovation.</p>',
        },
        {
          id: 'markthalle9',
          title: 'Markthalle Neun Is Getting a New Street Food Floor',
          excerpt: 'The beloved market hall in Kreuzberg is expanding: the second floor is getting a brand new area for international street food vendors.',
          category: 'openings',
          categoryLabel: 'Openings',
          date: 'March 14',
          dateISO: '2026-03-14',
          img: 'pics/news/markthalle9.webp',
          alt: 'Markthalle Neun',
          content: '<p>Markthalle Neun in Kreuzberg \u2014 a fixture of Berlin\'s food scene for years \u2014 is getting an entirely new floor in summer 2026. The second storey will become an 800 square metre street food area with space for 20 vendors.</p><h4>What to Expect</h4><p>The selection is international: Vietnamese ph\u1edf, Mexican tacos, Ethiopian injera, Lebanese falafel and of course German Flammkuchen. Each stall will be run by a different operator \u2014 many of them Berlin street food veterans who have only ever traded at markets.</p><h4>The Concept</h4><p>No seating at the stalls. Instead, a large shared dining hall with long wooden tables \u2014 like an Asian market hall. Beer on tap, wine from Berlin natural wine suppliers.</p><h4>Opening</h4><p>The opening is planned for July 2026. The first vendors are already confirmed, further applications are still open. Tip: sign up for the Markthalle newsletter to get early access.</p>',
        },
        {
          id: 'michelin-berlin',
          title: 'Berlin Now Has 8 Michelin-Starred Restaurants \u2014 And None Cost More Than \u20ac150',
          excerpt: "The new Michelin Guide edition celebrates Berlin's democratic fine dining scene. Fine dining doesn't have to be expensive.",
          category: 'culture',
          categoryLabel: 'Culture',
          date: 'March 13',
          dateISO: '2026-03-13',
          img: 'pics/news/michelin.webp',
          alt: 'Fine Dining',
          content: '<p>The new Michelin Guide Berlin 2026 edition is out \u2014 and it sends a clear message: Berlin is the most democratic fine dining city in Europe. None of the 8 starred restaurants charges more than \u20ac150 for a full dinner menu.</p><h4>The Newcomer</h4><p>The biggest surprise is Natura, which only opened last year. Ren\u00e9 Redzepi\'s Berlin outpost received a star immediately \u2014 at a menu price of just \u20ac89. Critics speak of revolutionary sustainability on the plate.</p><h4>The Consistent Ones</h4><p>CODA Dessert Dining defends its star with a 7-course dessert tasting for \u20ac95. Otto in Mitte offers a seasonal 5-course menu for \u20ac78 \u2014 one of the most affordable Michelin stars in Germany.</p><h4>Why Berlin?</h4><p>The answer is simple: lower rents than Munich or Hamburg, an international chef scene, and diners who are willing to pay for quality \u2014 but not for status. Berlin fine dining is not a status symbol; it\'s lived conviction.</p>',
        },
        {
          id: 'donuts-berlin',
          title: 'The 10 Best Donut Shops in Berlin \u2014 From Brooklyn Style to Thai',
          excerpt: 'Berlin has become the donut capital of Europe. We tried 20 shops and picked the best ten.',
          category: 'guides',
          categoryLabel: 'Guides',
          date: 'March 12',
          dateISO: '2026-03-12',
          img: 'pics/news/donuts.webp',
          alt: 'Berlin Donuts',
          content: '<p>Berlin has experienced a donut revolution over the past three years. From 2 shops to over 30 \u2014 and the quality is better than ever. We tried all 20 and picked the best ten.</p><h4>1. Atelier Dough \u2014 Prenzlauer Berg</h4><p>The undisputed number one. The donuts here are hand-crafted, the recipes updated monthly. The matcha donut is legendary, the salted caramel donut is poetry. Tip: come in the morning \u2014 afternoons often sell out.</p><h4>2. Momo Mochi Donut \u2014 Prenzlauer Berg</h4><p>Mochi donuts \u2014 made from glutinous rice flour \u2014 are the hot trend. Momo makes the best in Berlin: chewy, sweet but not heavy. The ube variant (purple sweet potato) is an Instagram hit.</p><h4>3. Brammibal\'s \u2014 Neuk\u00f6lln</h4><p>Vegan donuts that nobody would call vegan. The texture is perfect, the glazes creative. The lemon poppy seed is our favourite.</p><h4>4. The Dough Club \u2014 Mitte</h4><p>Brooklyn-style donuts in Berlin: large, generous, decadent. Fillings range from pistachio cream to Biscoff. Not for every day, but perfect for special occasions.</p><h4>5\u201310</h4><p>The remaining six on our list: Holy Sugar, Da Capo, Jones Ice Cream (yes, they have donuts too), Zeit f\u00fcr Brot, Roamers Coffee and Five Elephant. Find the details in our full guide.</p>',
        },
      ],
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
    ` data-content="${esc(a.content)}">`,
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

// Renders news cards. Fetches from Sanity CMS, falls back to static TRANSLATIONS.
async function renderNewsCards() {
  const grid = document.querySelector('.news-grid');
  if (!grid) return;

  if (window.CMS) {
    try {
      const articles = await window.CMS.fetchNews(_lang);
      if (articles && articles.length) {
        // safe: all values escaped by buildNewsCardHtml; HTML structure is hardcoded
        grid.innerHTML = articles.map(buildNewsCardHtml).join('');
        if (typeof window._bindNewsCards === 'function') window._bindNewsCards();
        return;
      }
    } catch (e) {
      console.warn('[CMS] News fetch failed, using static fallback:', e.message);
    }
  }

  // Static fallback from TRANSLATIONS constant
  const articles = (TRANSLATIONS[_lang]?.news?.articles) || [];
  // safe: values from TRANSLATIONS constant, escaped by buildNewsCardHtml
  grid.innerHTML = articles.map(a => buildNewsCardHtml({ ...a, imageUrl: a.img })).join('');
}

function setLang(lang) {
  if (!TRANSLATIONS[lang]) return;
  _lang = lang;
  localStorage.setItem('lang', lang);
  applyTranslations();
  renderNewsCards();
  if (typeof window._bindNewsCards === 'function') window._bindNewsCards();
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
