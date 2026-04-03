# EAT THIS — i18n + Code Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the site fully English with a proper i18n infrastructure (EN default, DE skeleton ready), add a language switcher pill to the navbar, and fix all code audit issues.

**Architecture:** New `js/i18n.js` (loads before `app.js`) defines `TRANSLATIONS`, renders news cards from data, exposes `window.i18n` API. HTML gets `data-i18n` keys. `app.js` reads German strings via `window.i18n.t()`.

**Tech Stack:** Vanilla JS, no build tools, no bundler, no new dependencies. `three.js` stays (used for globe animation).

---

## Security Notes

The i18n engine sets `.innerHTML` and `.textContent` on elements. All content comes exclusively from the `TRANSLATIONS` constant defined in `js/i18n.js` — it is **never derived from user input, URL parameters, or external sources**. This is safe. The `escapeHtml()` helper in `app.js` continues to sanitize any dynamic user-facing strings (search queries).

---

## File Map

| File | Change |
|------|--------|
| `js/i18n.js` | **Create** — translations object + engine + news renderer |
| `index.html` | Modify — add `data-i18n` keys, lang switcher HTML, fix `lang` attr |
| `css/style.css` | Modify — add `.lang-switcher` styles, remove duplicate CSS rule |
| `js/app.js` | Modify — replace 4 German strings with `window.i18n.t()` calls |

---

## Task 1: Code Audit — HTML + CSS fixes

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`

- [ ] **Step 1: Fix `<html lang>` attribute**

In `index.html` line 2, change:

```
<html lang="de">
```

to:

```
<html lang="en">
```

- [ ] **Step 2: Remove duplicate `.navbar-insta::after` rule in CSS**

In `css/style.css`, the block `.navbar .navbar-insta::after { display: none; }` appears twice (lines 102-104 and 105-107). Delete the second occurrence.

- [ ] **Step 3: Fix German `aria-label` attributes in `index.html`**

Use find-and-replace for all occurrences:

| Find | Replace |
|------|---------|
| `aria-label="Suchen"` | `aria-label="Search"` |
| `aria-label="Menü"` | `aria-label="Menu"` |
| `aria-label="Schließen"` | `aria-label="Close"` |
| `aria-label="Mein Standort"` | `aria-label="My location"` |

There are ~10 instances of `Schließen` — replace all.

- [ ] **Step 4: Fix German text in footer nav**

In `index.html` around line 763, find `<span>Anmelden</span>` and change to:

```html
<span>Sign In</span>
```

- [ ] **Step 5: Commit audit fixes**

```bash
git add index.html css/style.css
git commit -m "fix: code audit — lang attr, aria-labels, duplicate CSS, German footer text"
```

---

## Task 2: Create `js/i18n.js`

**Files:**
- Create: `js/i18n.js`

Three parts: TRANSLATIONS object, engine functions, news card renderer.

### Steps

- [ ] **Step 1: Create `js/i18n.js`**

Create the file with the following content. Note: all `.innerHTML` assignments in this file use content exclusively from the `TRANSLATIONS` constant — never from user input.

```js
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
      section6Cities: 'Istanbul, Amsterdam, Paris — we\'re working on it.',
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
          title: 'Berlin Now Has 8 Michelin-Starred Restaurants — And None Cost More Than \u20ac150',
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
          title: 'The 10 Best Donut Shops in Berlin — From Brooklyn Style to Thai',
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
      },
    },
  },

  // DE skeleton — all keys mirror EN; fill values when launching German version
  de: {},
};

// Populate DE with EN as fallback (deep merge, EN wins only for missing keys)
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

// Renders news cards from TRANSLATIONS. Must run before app.js reads the DOM.
// All content is from TRANSLATIONS constant — no user data.
function renderNewsCards() {
  const grid = document.querySelector('.news-grid');
  if (!grid) return;

  const articles = TRANSLATIONS[_lang].news.articles;

  grid.innerHTML = articles.map(a => {
    const safeTitle = a.title.replace(/"/g, '&quot;');
    const safeExcerpt = a.excerpt.replace(/"/g, '&quot;');
    const safeContent = a.content.replace(/"/g, '&quot;');
    return [
      `<article class="news-card"`,
      ` data-category="${a.category}"`,
      ` data-title="${safeTitle}"`,
      ` data-img="${a.img}"`,
      ` data-category-label="${a.categoryLabel}"`,
      ` data-date="${a.date}"`,
      ` data-excerpt="${safeExcerpt}"`,
      ` data-content="${safeContent}">`,
      `<a href="#">`,
      `<div class="news-card-img"><img src="${a.img}" alt="${a.alt}" loading="lazy"></div>`,
      `<div class="news-card-body">`,
      `<div class="news-card-top">`,
      `<span class="news-card-category">${a.categoryLabel}</span>`,
      `<time class="news-card-date" datetime="${a.dateISO}">${a.date}</time>`,
      `</div>`,
      `<h3 class="news-card-headline">${a.title}</h3>`,
      `<p class="news-card-excerpt">${a.excerpt}</p>`,
      `</div></a></article>`,
    ].join('');
  }).join('');  // safe: source is TRANSLATIONS constant
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
// DOMContentLoaded fires before app.js's listener (i18n.js loads first).
// News cards are rendered before app.js reads them from the DOM.

document.addEventListener('DOMContentLoaded', () => {
  renderNewsCards();
  applyTranslations();

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });
});

window.i18n = { t, setLang, currentLang, renderNewsCards };
```

- [ ] **Step 2: Verify file saved**

```bash
wc -l "/Users/ersane/Downloads/Projekte/Eat This/js/i18n.js"
```
Expected: 250+ lines.

- [ ] **Step 3: Commit**

```bash
git add js/i18n.js
git commit -m "feat: add i18n engine and full English translations"
```

---

## Task 3: Add `data-i18n` Keys to `index.html`

**Files:**
- Modify: `index.html`

### Steps

- [ ] **Step 1: Add `i18n.js` script tag before `app.js`**

At the bottom of `<body>`, change the script block from:
```html
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="js/app.js"></script>
<script type="module" src="js/auth.js?v=3"></script>
```
to:
```html
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="js/i18n.js"></script>
<script src="js/app.js"></script>
<script type="module" src="js/auth.js?v=3"></script>
```

- [ ] **Step 2: Add lang switcher to navbar**

Find `<div class="navbar-actions">` and insert the switcher as the first child:
```html
<div class="navbar-actions">
  <div class="lang-switcher" id="langSwitcher">
    <button class="lang-btn active" data-lang="en">EN</button>
    <button class="lang-btn" data-lang="de">DE</button>
  </div>
  <!-- existing search trigger, instagram, burger follow here -->
```

- [ ] **Step 3: Add `data-i18n` to hero**

```html
<h1 class="hero-tagline" data-i18n="hero.tagline">We tell you what to eat</h1>

<button class="hero-register-btn" onclick="openLoginModal()">
  <span data-i18n="hero.cta">Create account</span>
  <svg ...>...</svg>
</button>
```

- [ ] **Step 4: Add `data-i18n` to all start scroll sections**

Section 1:
```html
<span class="start-section-label" data-i18n="start.section1Label">Eat This</span>
<h2 class="start-section-title" data-i18n="start.section1Title">Probably the best food guide you know.</h2>
<p class="start-section-body" data-i18n="start.section1Body">No endless scrolling...</p>
```

Section 2:
```html
<span class="start-section-label" data-i18n="start.section2Label">About</span>
<h2 class="start-section-title" data-i18n="start.section2Title">We started<br>in 2025.</h2>
<p data-i18n="start.section2Body1">One rule: one dish per restaurant. No exceptions.</p>
<p data-i18n="start.section2Body2">A small team based in Berlin...</p>
<p data-i18n="start.section2Body3">If we recommend it, we'd order it again.</p>
```

Section 3 (Join CTA):
```html
<span class="start-section-label" data-i18n="start.section3Label">Account</span>
<h2 class="start-section-title" data-i18n="start.section3Title">Be the first<br>to know.</h2>
<p class="start-section-body" data-i18n="start.section3Body">Create an account...</p>
<button class="start-join-btn" onclick="openLoginModal()">
  <span data-i18n="start.section3Cta">Create account</span>
  <svg ...>...</svg>
</button>
```

Section 4 (Philosophy — label only, philo items):
```html
<span class="start-section-label" data-i18n="start.section4Label">Philosophy</span>
<div class="start-philo-title" data-i18n="start.philo1Title">One dish. That's the point.</div>
<div class="start-philo-text" data-i18n="start.philo1Text">Anyone can make a top 10...</div>
<div class="start-philo-title" data-i18n="start.philo2Title">We show up.</div>
<div class="start-philo-text" data-i18n="start.philo2Text">We eat there ourselves...</div>
<div class="start-philo-title" data-i18n="start.philo3Title">We don't take money for recommendations.</div>
<div class="start-philo-text" data-i18n="start.philo3Text">Simple as that.</div>
```

Section 5 (How we choose):
```html
<span class="start-section-label" data-i18n="start.section5Label">How we choose</span>
<h2 class="start-section-title" data-i18n="start.section5Title">Most reviews happen once.<br>Ours don't.</h2>
<p data-i18n="start.section5Body1">We visit every place more than once...</p>
<p data-i18n="start.section5Body2">That's how we choose.</p>
```

Section 6 (What's next):
```html
<span class="start-section-label" data-i18n="start.section6Label">What's next</span>
<h2 class="start-section-title" data-i18n="start.section6Title">Berlin is where<br>we started.</h2>
<p class="start-section-body" data-i18n="start.section6Body1">It won't be where we stop.</p>
<p class="start-cities" data-i18n="start.section6Cities">Istanbul, Amsterdam, Paris — we're working on it.</p>
<p class="start-section-body" data-i18n="start.section6Body2">Same rules, different cities.</p>
```

- [ ] **Step 5: Add `data-i18n` to Must Eats header**

```html
<p class="section-label reveal" data-i18n="musts.sectionLabel">Berlin</p>
<p class="must-eats-subtitle reveal" data-i18n="musts.subtitle">The dishes you can't leave Berlin without trying.</p>
```

- [ ] **Step 6: Add `data-i18n` to News section header**

```html
<p class="section-label reveal" data-i18n="news.sectionLabel">Berlin</p>
<h2 class="news-title reveal" data-i18n="news.sectionTitle">Food News</h2>
```

- [ ] **Step 7: Remove hardcoded news article HTML from `.news-grid`**

The 5 `<article class="news-card">` blocks inside `.news-grid` must be deleted entirely. The div should be empty after this:

```html
<!-- News Grid -->
<div class="news-grid reveal-stagger">
  <!-- populated by js/i18n.js -->
</div>
```

- [ ] **Step 8: Add `data-i18n` to Map section**

```html
<p class="section-label" data-i18n="map.sectionLabel">Find</p>
<h2 class="map-title" data-i18n="map.sectionTitle">Eat Around</h2>
<button class="map-filter-option active" data-filter="all" role="option">
  <span data-i18n="map.filterAll">All</span><span class="map-filter-option-count" id="count-all"></span>
</button>
<button class="map-location-btn-fixed" id="mapLocationBtnFixed" data-i18n-aria="map.myLocationAriaLabel" aria-label="My location">
```

- [ ] **Step 9: Add `data-i18n` to footer nav spans**

```html
<span data-i18n="footer.start">Start</span>
<span data-i18n="footer.news">News</span>
<span data-i18n="footer.musts">Eat This</span>
<span data-i18n="footer.map">Map</span>
<!-- Login button -->
<span data-i18n="footer.signIn">Sign In</span>
```

- [ ] **Step 10: Add `data-i18n-placeholder` to search input**

```html
<input type="text" class="search-input" id="searchInput"
  data-i18n-placeholder="search.placeholder"
  placeholder="What are you craving?"
  autocomplete="off">
```

Change the static search hint div:
```html
<div class="search-hint" data-i18n="search.hint">Start typing to search...</div>
```

- [ ] **Step 11: Add `data-i18n` to cookie consent**

```html
<p class="cookie-text">
  <span data-i18n="cookie.text">We use cookies to give you the best experience.</span>
  <button class="cookie-info-trigger" id="cookieInfoTrigger" data-i18n="cookie.moreInfo">Learn more</button>
</p>
<button class="cookie-btn cookie-btn-accept" id="cookieAccept" data-i18n="cookie.accept">Accept</button>
<button class="cookie-btn cookie-btn-decline" id="cookieDecline" data-i18n="cookie.decline">Decline</button>
```

- [ ] **Step 12: Add `data-i18n` to all modal titles and `data-i18n-html` to modal bodies**

For each modal, add to the `<h2>` element and the body div:

About:
```html
<h2 class="cookie-info-title" data-i18n="modals.about.title">One dish. That's it.</h2>
<div class="cookie-info-body" data-i18n-html="modals.about.body"></div>
```

Contact:
```html
<h2 class="cookie-info-title" data-i18n="modals.contact.title">Get in touch</h2>
<div class="cookie-info-body" data-i18n-html="modals.contact.body"></div>
```

Press:
```html
<h2 class="cookie-info-title" data-i18n="modals.press.title">Press &amp; Media</h2>
<div class="cookie-info-body" data-i18n-html="modals.press.body"></div>
```

Impressum:
```html
<h2 class="cookie-info-title" data-i18n="modals.impressum.title">Impressum</h2>
<div class="cookie-info-body" data-i18n-html="modals.impressum.body"></div>
```

AGB:
```html
<h2 class="cookie-info-title" data-i18n="modals.agb.title">Terms &amp; Conditions</h2>
<div class="cookie-info-body" data-i18n-html="modals.agb.body"></div>
```

Datenschutz:
```html
<h2 class="cookie-info-title" data-i18n="modals.datenschutz.title">Privacy Policy</h2>
<div class="cookie-info-body" data-i18n-html="modals.datenschutz.body"></div>
```

Cookie Info Modal:
```html
<h2 class="cookie-info-title" data-i18n="modals.cookies.title">Cookie Policy</h2>
<div class="cookie-info-body" data-i18n-html="modals.cookies.body"></div>
```

- [ ] **Step 13: Add `data-i18n` to login modal**

```html
<h2 class="login-title" id="loginTitle" data-i18n="modals.login.titleRegister">Create account</h2>
<p class="login-subtitle" id="loginSubtitle" data-i18n="modals.login.subtitleRegister">Sign up to discover the best dishes in Berlin.</p>
<input type="text" id="loginName" data-i18n-placeholder="modals.login.namePlaceholder" placeholder="Name" autocomplete="name">
<input type="email" id="loginEmail" data-i18n-placeholder="modals.login.emailPlaceholder" placeholder="Email" required autocomplete="email">
<input type="password" id="loginPassword" data-i18n-placeholder="modals.login.passwordPlaceholder" placeholder="Password" required autocomplete="current-password" minlength="6">
<button type="button" class="login-forgot-btn" id="forgotPasswordBtn" data-i18n="modals.login.forgotPassword">Forgot password?</button>
<span id="loginSubmitText" data-i18n="modals.login.submitRegister">Create account</span>
```

Divider and Google button:
```html
<span data-i18n="modals.login.dividerOr">or</span>
```
Inside the Google button:
```html
<span data-i18n="modals.login.googleBtn">Continue with Google</span>
```

Terms line:
```html
<p class="login-terms">
  <span data-i18n="modals.login.termsText">By signing up, you agree to our</span>
  <button class="login-terms-link" id="agbTrigger" data-i18n="modals.login.termsLink">Terms</button> and
  <button class="login-terms-link" id="datenschutzTrigger" data-i18n="modals.login.privacyLink">Privacy Policy</button>.
</p>
```

Burger menu footer links (they already read the modal title dynamically; update static text):
```html
<button class="burger-drawer-footer-btn" id="openDatenschutzFromBurger" data-i18n="modals.datenschutz.title">Privacy Policy</button>
<button class="burger-drawer-footer-btn" id="openAgbFromBurger" data-i18n="modals.agb.title">Terms &amp; Conditions</button>
```

- [ ] **Step 14: Commit HTML changes**

```bash
git add index.html
git commit -m "feat: add data-i18n keys to index.html, add lang switcher, remove hardcoded news HTML"
```

---

## Task 4: Add Language Switcher CSS

**Files:**
- Modify: `css/style.css`

- [ ] **Step 1: Add lang switcher styles after the `.navbar-actions` block (around line 107)**

```css
/* ============================================
   LANGUAGE SWITCHER
   ============================================ */
.lang-switcher {
  display: flex;
  align-items: center;
  background: var(--gray-50);
  border-radius: 100px;
  padding: 3px;
  gap: 2px;
}
.lang-btn {
  cursor: pointer;
  border: none;
  font-family: var(--font);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 4px 10px;
  border-radius: 100px;
  color: var(--gray-400);
  background: transparent;
  transition: background 0.18s, color 0.18s;
  line-height: 1;
}
.lang-btn.active {
  background: var(--black);
  color: var(--white);
}
.lang-btn:hover:not(.active) {
  color: var(--black);
}
```

- [ ] **Step 2: Commit**

```bash
git add css/style.css
git commit -m "feat: add language switcher pill CSS"
```

---

## Task 5: Update `app.js` — Replace German Strings

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: Replace the two German search hint strings**

There are two occurrences of `'Tippe um zu suchen...'` — in `closeSearch()` and in `search()`. Replace both with:

```js
`<div class="search-hint">${window.i18n ? window.i18n.t('search.hint') : 'Start typing to search...'}</div>`
```

- [ ] **Step 2: Replace German no-results message in `search()`**

Find:
```js
searchResults.innerHTML = `
  <div class="search-no-results">
    <p>Keine Ergebnisse für &ldquo;${escapeHtml(query)}&rdquo;</p>
    <span>Versuche einen anderen Suchbegriff</span>
  </div>
`;
```
Replace with:
```js
const _noRes = window.i18n ? window.i18n.t('search.noResults') : 'No results for';
const _noResSub = window.i18n ? window.i18n.t('search.noResultsSub') : 'Try a different search term';
searchResults.innerHTML = `<div class="search-no-results"><p>${_noRes} &ldquo;${escapeHtml(query)}&rdquo;</p><span>${_noResSub}</span></div>`;
```

- [ ] **Step 3: Replace German map error notification**

Find `showNotification('Karte konnte nicht geladen werden')` and replace with:
```js
showNotification(window.i18n ? window.i18n.t('map.errorMapLoad') : 'Could not load map');
```

- [ ] **Step 4: Expose `_bindNewsCards` for lang-switch re-binding**

Find the block in `app.js` that attaches click listeners to `.news-card` elements. It will look like:

```js
document.querySelectorAll('.news-card').forEach(card => {
  card.querySelector('a').addEventListener('click', (e) => {
    // ... opens news modal
  });
});
```

Wrap this entire block in a named function and expose it:

```js
function bindNewsCards() {
  document.querySelectorAll('.news-card').forEach(card => {
    // ... existing handler code unchanged ...
  });
}
bindNewsCards();
window._bindNewsCards = bindNewsCards;
```

- [ ] **Step 5: Commit**

```bash
git add js/app.js
git commit -m "feat: replace German strings in app.js with i18n.t() calls"
```

---

## Task 6: Final Verification

- [ ] **Step 1: Start server and open browser**

```bash
npx serve "/Users/ersane/Downloads/Projekte/Eat This" -p 3000
```

Open `http://localhost:3000`

- [ ] **Step 2: Verify EN content**

- [ ] Hero: "We tell you what to eat" / "Create account"
- [ ] 5 news cards render in English
- [ ] Search placeholder: "What are you craving?"
- [ ] Cookie banner: "We use cookies to give you the best experience." / "Accept" / "Decline"
- [ ] Footer: "Sign In" (not "Anmelden")
- [ ] Navbar: EN/DE pill visible

- [ ] **Step 3: Verify language switcher**

- [ ] Pill renders correctly (black active state on EN)
- [ ] Clicking DE → content switches (same EN for now, DE skeleton)
- [ ] Reload → stays on selected language
- [ ] `<html lang>` updates in DevTools Elements panel

- [ ] **Step 4: Verify all modals**

Open each via burger menu and verify titles are in English, content is in English. Impressum stays German.

- [ ] **Step 5: Verify news modal**

Click a news card → modal opens with English article content.

- [ ] **Step 6: Verify map**

Navigate to Map page → globe animation plays → map loads. No console errors.

- [ ] **Step 7: Check DevTools console**

Expected: zero errors. If `window.i18n is not defined`, verify script load order in `index.html`.

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: complete i18n integration — English default, DE skeleton, pill lang switcher"
```

---

## Key Reminders

1. **`three.js` stays** — it powers the globe animation on the Map page.
2. **Load order**: `i18n.js` before `app.js` — both use `DOMContentLoaded`, first-registered fires first.
3. **No duplicate news HTML** — after Task 3 Step 7, `.news-grid` must be empty in HTML.
4. **Impressum stays German** — legal requirement under § 5 TMG.
5. **innerHTML in i18n.js is safe** — all content comes from the `TRANSLATIONS` constant, never user input.
