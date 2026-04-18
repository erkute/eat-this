# Eat This Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 5 UX improvements: navbar labels, hero CTA, swipeable Must-Eat Album, newsletter email capture, and post-signup onboarding flow.

**Architecture:** Vanilla JS SPA — all changes are HTML/CSS additions and modifications to `js/app.js` / `js/auth.js`. The album replaces the flat `#mustEatsGrid` with a paginated swipeable structure rendered from the same Sanity CMS data. The newsletter adds a Cloud Function endpoint following the existing `sendVerificationEmail` / `sendPasswordReset` pattern.

**Tech Stack:** Vanilla JS ES modules, Firebase Auth + Firestore + Cloud Functions v2, Sanity CMS (GROQ), Playwright (tests), Resend (email via existing Cloud Functions pattern).

---

## File Map

| File | Change |
|------|--------|
| `index.html` | Navbar labels, hero CTA button, musts page album structure, newsletter section, onboarding overlay |
| `css/style.css` | All new/modified component styles |
| `js/app.js` | Album render + swipe, newsletter form handler, onboarding show/hide, auth state album sync |
| `js/auth.js` | Expose `window._functions`, trigger onboarding after signup |
| `functions/index.js` | `subscribeNewsletter` Cloud Function |
| `tests/e2e/navigation.spec.js` | Navbar label + hero CTA tests |
| `tests/e2e/album.spec.js` | New: album card states, swipe, progress |
| `tests/e2e/newsletter.spec.js` | New: newsletter form validation |
| `tests/e2e/onboarding.spec.js` | New: onboarding overlay flow |

---

## Task 1: Navbar Labels

**Files:**
- Modify: `index.html:277-302`
- Modify: `css/style.css:90-115`

- [ ] **Step 1: Write the failing test**

Add to `tests/e2e/navigation.spec.js` inside the existing `Navigation` describe block:

```javascript
test('navbar icons have visible labels', async ({ page }) => {
  await expect(page.locator('#navNewsBtn .nav-label')).toBeVisible();
  await expect(page.locator('#navNewsBtn .nav-label')).toHaveText('News');
  await expect(page.locator('#navMapBtn .nav-label')).toHaveText('Map');
  await expect(page.locator('#navMustsBtn .nav-label')).toHaveText('Album');
  await expect(page.locator('#navProfileBtn .nav-label')).toHaveText('Profile');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx playwright test tests/e2e/navigation.spec.js --headed
```
Expected: FAIL — `.nav-label` elements don't exist.

- [ ] **Step 3: Add label spans to navbar buttons in `index.html`**

Replace lines 277–302 (the four `.navbar-icon-btn` buttons). Each button gets a `<span class="nav-label">` after its SVG:

```html
<button class="navbar-icon-btn" id="navNewsBtn" aria-label="News">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
    <path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>
  </svg>
  <span class="nav-label">News</span>
</button>
<button class="navbar-icon-btn" id="navMapBtn" aria-label="Map">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
    <line x1="9" y1="3" x2="9" y2="18"/>
    <line x1="15" y1="6" x2="15" y2="21"/>
  </svg>
  <span class="nav-label">Map</span>
</button>
<button class="navbar-icon-btn" id="navMustsBtn" aria-label="Eat This">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
    <path d="M7 2v20"/>
    <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
  </svg>
  <span class="nav-label">Album</span>
</button>
<button class="navbar-icon-btn" id="navProfileBtn" aria-label="Profile">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
  <span class="nav-label">Profile</span>
</button>
```

- [ ] **Step 4: Update `.navbar-icon-btn` CSS in `css/style.css` (~line 90)**

Replace the existing `.navbar-icon-btn` block (lines 90–115):

```css
.navbar-icon-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 48px;
  height: auto;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--black);
  padding: 4px 0;
  border-radius: 8px;
  transition: color 0.2s, background 0.2s;
  -webkit-tap-highlight-color: transparent;
}
.navbar-icon-btn svg {
  width: 20px;
  height: 20px;
  stroke: currentColor;
  flex-shrink: 0;
}
.navbar-icon-btn .nav-label {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.3px;
  color: currentColor;
  line-height: 1;
}
.navbar-icon-btn:hover {
  color: var(--orange);
}
.navbar-icon-btn.active {
  color: var(--orange);
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx playwright test tests/e2e/navigation.spec.js --headed
```
Expected: PASS — all label assertions pass.

- [ ] **Step 6: Visual check** — open the local dev server, confirm labels appear below icons and active state turns orange.

- [ ] **Step 7: Commit**

```bash
git add index.html css/style.css tests/e2e/navigation.spec.js
git commit -m "feat: add text labels to navbar icons"
```

---

## Task 2: Hero "Explore Album" CTA

**Files:**
- Modify: `index.html:349` (after `heroRegisterBtn` closing tag)
- Modify: `css/style.css` (add `.hero-explore-btn`)
- Modify: `js/app.js` (wire click)

- [ ] **Step 1: Write the failing test**

Add to `tests/e2e/navigation.spec.js`:

```javascript
test('hero explore-album button navigates to album', async ({ page }) => {
  const btn = page.locator('#heroExploreBtn');
  await expect(btn).toBeVisible();
  await btn.click();
  await expect(page.locator('.app-page[data-page="musts"]')).toHaveClass(/active/);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx playwright test tests/e2e/navigation.spec.js --headed
```
Expected: FAIL — `#heroExploreBtn` not found.

- [ ] **Step 3: Add the button to `index.html`**

After the closing `</button>` of `#heroRegisterBtn` (~line 349):

```html
<button class="hero-explore-btn" id="heroExploreBtn">
  Explore the Album
</button>
```

- [ ] **Step 4: Add CSS for `.hero-explore-btn` in `css/style.css`** (after the `.hero-register-btn` block):

```css
.hero-explore-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  color: #fff;
  padding: 12px 24px;
  font-family: var(--font);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  -webkit-tap-highlight-color: transparent;
}
.hero-explore-btn:hover {
  border-color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.08);
}
```

- [ ] **Step 5: Wire the button click in `js/app.js`**

Find `const heroRegisterBtn = document.getElementById('heroRegisterBtn');` — after its click handler block, add:

```javascript
const heroExploreBtn = document.getElementById('heroExploreBtn');
if (heroExploreBtn) {
  heroExploreBtn.addEventListener('click', () => navigateToPage('musts'));
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npx playwright test tests/e2e/navigation.spec.js --headed
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add index.html css/style.css js/app.js tests/e2e/navigation.spec.js
git commit -m "feat: add explore-album CTA to hero"
```

---

## Task 3: Must-Eat Album

Replaces the flat `#mustEatsGrid` with an 18-page swipeable album. 156 total slots (9/page). Cards 1–11: always sharp. Cards 12–21: blurred for guests, sharp after login. Slots 22–156: empty gray boxes.

**Files:**
- Modify: `index.html:489-512`
- Modify: `css/style.css`
- Modify: `js/app.js`
- Create: `tests/e2e/album.spec.js`

### 3a — HTML scaffold

- [ ] **Step 1: Replace musts page content in `index.html` (lines 489–512)**

```html
<div class="app-page" data-page="musts">
  <section class="must-eats-section" id="must-eats">
    <div class="must-eats-header">
      <p class="section-label reveal" data-i18n="musts.sectionLabel">Berlin</p>
      <img
        src="pics/logo2.webp"
        alt="EAT THIS"
        class="must-eats-logo-img"
        width="1815"
        height="576"
        loading="lazy"
        decoding="async"
      />
    </div>

    <div class="album-progress-row">
      <span class="album-prog-label">Progress</span>
      <div class="album-prog-bar">
        <div class="album-prog-fill" id="albumProgFill" style="width:0%"></div>
      </div>
      <span class="album-prog-count" id="albumProgCount">0 / 156</span>
    </div>

    <div class="album-viewport">
      <div class="album-pages" id="albumPages">
        <!-- populated by js/app.js -->
      </div>
    </div>

    <div class="album-dots-row" id="albumDots">
      <!-- populated by js/app.js -->
    </div>
  </section>
</div>
```

- [ ] **Step 2: Commit scaffold**

```bash
git add index.html
git commit -m "feat: replace mustEatsGrid with album scaffold"
```

### 3b — CSS

- [ ] **Step 3: Add album CSS to `css/style.css`** (after the existing `.must-eats-section` block):

```css
/* ============================================
   MUST-EAT ALBUM
   ============================================ */
.album-progress-row {
  background: #fff;
  padding: 8px 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.album-prog-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #bbb;
  white-space: nowrap;
}
.album-prog-bar {
  flex: 1;
  height: 2px;
  background: #e8e8e8;
  border-radius: 1px;
  overflow: hidden;
}
.album-prog-fill {
  height: 100%;
  background: var(--orange);
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.album-prog-count {
  font-size: 9px;
  font-weight: 700;
  color: var(--orange);
  white-space: nowrap;
}

.album-viewport {
  overflow: hidden;
  background: #fafafa;
}
.album-pages {
  display: flex;
  transition: transform 0.36s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: grab;
  will-change: transform;
}
.album-pages:active { cursor: grabbing; }
.album-page { min-width: 100%; }

.album-card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 14px 20px;
}
.album-slot {
  aspect-ratio: 1449 / 2163;
  position: relative;
}
.album-slot-inner {
  position: absolute;
  inset: 0;
  clip-path: inset(0 round 6%);
  overflow: hidden;
}

.album-slot.sharp .album-slot-inner { background-color: #e0e0e0; }
.album-slot.sharp .album-slot-bg {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
}

.album-slot.blurred .album-slot-inner { background-color: #d8d8d8; }
.album-slot.blurred .album-slot-bg {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  filter: blur(9px);
  transform: scale(1.15);
  opacity: 0.55;
  transition: filter 0.7s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.7s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.album-slot.blurred.revealed .album-slot-bg {
  filter: blur(0);
  transform: scale(1);
  opacity: 1;
}

.album-slot.empty .album-slot-inner { background: #ebebeb; }

.album-page-footer {
  background: #fff;
  border-top: 1px solid #f0f0f0;
  padding: 8px 20px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.album-page-num {
  font-size: 9px;
  color: #bbb;
  font-weight: 600;
}
.album-cta-btn {
  background: var(--orange);
  color: #fff;
  border: none;
  padding: 7px 14px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: var(--radius);
  font-family: var(--font);
}

.album-dots-row {
  background: #fff;
  padding: 8px 20px 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
}
.album-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #d4d4d4;
  transition: all 0.3s;
  cursor: pointer;
  border: none;
  padding: 0;
  flex-shrink: 0;
}
.album-dot.active {
  background: var(--orange);
  width: 16px;
  border-radius: 2px;
}
.album-dot.visited {
  background: var(--orange);
  opacity: 0.3;
}
```

- [ ] **Step 4: Commit CSS**

```bash
git add css/style.css
git commit -m "feat: add must-eat album CSS"
```

### 3c — JS renderer

- [ ] **Step 5: Write the failing test** — create `tests/e2e/album.spec.js`:

```javascript
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  const cookieBtn = page.locator('#cookieAccept');
  if (await cookieBtn.isVisible()) await cookieBtn.click();
  await page.locator('#navMustsBtn').click();
});

test.describe('Must-Eat Album', () => {
  test('album renders pages container', async ({ page }) => {
    await expect(page.locator('#albumPages')).toBeVisible();
  });

  test('album shows sharp, blurred and empty slots', async ({ page }) => {
    await expect(page.locator('.album-slot.sharp').first()).toBeVisible();
    await expect(page.locator('.album-slot.blurred').first()).toBeVisible();
    await expect(page.locator('.album-slot.empty').first()).toBeVisible();
  });

  test('album shows progress count', async ({ page }) => {
    const count = page.locator('#albumProgCount');
    await expect(count).toBeVisible();
    await expect(count).toContainText('/ 156');
  });

  test('dot navigation moves to page 2', async ({ page }) => {
    const dots = page.locator('.album-dot');
    await dots.nth(1).click();
    const transform = await page.locator('#albumPages').evaluate(el => el.style.transform);
    expect(transform).toContain('translateX(-100%)');
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
npx playwright test tests/e2e/album.spec.js --headed
```
Expected: FAIL — album slots don't exist.

- [ ] **Step 7: Replace the must-eats CMS rendering block in `js/app.js` (~lines 901–930)**

Find and replace the `// Must-Eat cards` try block (the one that fetches from `window.CMS.fetchMustEats()` and populates `mustEatsGrid`). Replace the entire block with:

```javascript
// Must-Eat Album
const ALBUM_TOTAL = 156;
const ALWAYS_VISIBLE = 11;
const SLOTS_PER_PAGE = 9;
window._albumCards = [];

try {
  const cards = await window.CMS.fetchMustEats(); // ordered by `order asc`
  window._albumCards = cards || [];
  renderAlbum();
} catch (err) {
  console.warn('[CMS] Must-Eats fetch failed:', err.message); // eslint-disable-line no-console
}

function renderAlbum() {
  const pagesEl = document.getElementById('albumPages');
  const dotsEl  = document.getElementById('albumDots');
  if (!pagesEl || !dotsEl) return;

  const cards      = window._albumCards;
  const isLoggedIn = !!(window._currentUser);
  const totalPages = Math.ceil(ALBUM_TOTAL / SLOTS_PER_PAGE);

  pagesEl.textContent = '';
  dotsEl.textContent  = '';

  for (let p = 0; p < totalPages; p++) {
    const pageEl = document.createElement('div');
    pageEl.className = 'album-page';

    const grid = document.createElement('div');
    grid.className = 'album-card-grid';

    for (let s = 0; s < SLOTS_PER_PAGE; s++) {
      const idx  = p * SLOTS_PER_PAGE + s;
      const card = cards[idx];

      let slotType;
      if (!card)              slotType = 'empty';
      else if (idx < ALWAYS_VISIBLE) slotType = 'sharp';
      else                    slotType = isLoggedIn ? 'sharp' : 'blurred';

      const slotEl  = document.createElement('div');
      slotEl.className = 'album-slot ' + slotType;
      slotEl.dataset.cardIndex = String(idx);

      const inner = document.createElement('div');
      inner.className = 'album-slot-inner';

      if (slotType !== 'empty' && card) {
        const bg = document.createElement('div');
        bg.className = 'album-slot-bg';
        bg.style.backgroundImage = 'url(' + card.imageUrl + ')';
        inner.appendChild(bg);
      }

      slotEl.appendChild(inner);
      grid.appendChild(slotEl);
    }

    const footer  = document.createElement('div');
    footer.className = 'album-page-footer';

    const pageNum = document.createElement('span');
    pageNum.className = 'album-page-num';
    pageNum.textContent = (p + 1) + ' / ' + totalPages;

    const ctaBtn = document.createElement('button');
    ctaBtn.className = 'album-cta-btn album-cta';
    ctaBtn.textContent = isLoggedIn ? 'Get More Packs' : 'Collect Them All';
    ctaBtn.addEventListener('click', () => navigateToPage('profile'));

    footer.appendChild(pageNum);
    footer.appendChild(ctaBtn);
    pageEl.appendChild(grid);
    pageEl.appendChild(footer);
    pagesEl.appendChild(pageEl);
  }

  // Dots
  for (let i = 0; i < totalPages; i++) {
    const dot = document.createElement('button');
    dot.className = 'album-dot' + (i === 0 ? ' active' : '');
    if (i >= 3) {
      dot.style.opacity = String(Math.max(0.04, 0.22 - (i - 3) * 0.06));
      const sz = Math.max(2, 5 - (i - 3));
      dot.style.width  = sz + 'px';
      dot.style.height = sz + 'px';
    }
    dot.addEventListener('click', () => albumGoTo(i));
    dotsEl.appendChild(dot);
  }

  updateAlbumProgress(isLoggedIn ? Math.min(cards.length, ALBUM_TOTAL) : ALWAYS_VISIBLE);
}

let _albumCur = 0;

function albumGoTo(n) {
  const pagesEl = document.getElementById('albumPages');
  const dots    = document.querySelectorAll('.album-dot');
  _albumCur     = Math.max(0, Math.min(Math.ceil(ALBUM_TOTAL / SLOTS_PER_PAGE) - 1, n));
  if (pagesEl) pagesEl.style.transform = 'translateX(-' + (_albumCur * 100) + '%)';
  dots.forEach((d, i) => {
    d.classList.remove('active', 'visited');
    if (i === _albumCur)    d.classList.add('active');
    else if (i < _albumCur) d.classList.add('visited');
  });
}

function updateAlbumProgress(count) {
  const fill    = document.getElementById('albumProgFill');
  const countEl = document.getElementById('albumProgCount');
  if (fill)    fill.style.width = ((count / ALBUM_TOTAL) * 100) + '%';
  if (countEl) countEl.textContent = count + ' / ' + ALBUM_TOTAL;
}

function revealBlurredCards() {
  document.querySelectorAll('.album-slot.blurred').forEach((slot, i) => {
    setTimeout(() => slot.classList.add('revealed'), i * 80);
  });
}

// Album swipe — touch + mouse
(function bindAlbumSwipe() {
  const pagesEl = document.getElementById('albumPages');
  if (!pagesEl) return;
  let sx = 0, sy = 0;
  pagesEl.addEventListener('touchstart', e => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });
  pagesEl.addEventListener('touchend', e => {
    const dx = sx - e.changedTouches[0].clientX;
    const dy = Math.abs(sy - e.changedTouches[0].clientY);
    if (Math.abs(dx) > dy && Math.abs(dx) > 40) albumGoTo(_albumCur + (dx > 0 ? 1 : -1));
  });
  let mx = 0, drag = false;
  pagesEl.addEventListener('mousedown', e => { mx = e.clientX; drag = true; });
  window.addEventListener('mouseup', e => {
    if (!drag) return;
    drag = false;
    if (Math.abs(mx - e.clientX) > 40) albumGoTo(_albumCur + (mx - e.clientX > 0 ? 1 : -1));
  });
}());

window._renderAlbum        = renderAlbum;
window._revealBlurredCards = revealBlurredCards;
```

- [ ] **Step 8: Sync album on auth state change in `js/auth.js`**

In `function applyLoggedInUI(user)` (~line 332), at the end of the function body:

```javascript
window._currentUser = user;
if (typeof window._renderAlbum === 'function') window._renderAlbum();
```

Find the `applyLoggedOutUI` function and add at its end:

```javascript
window._currentUser = null;
if (typeof window._renderAlbum === 'function') window._renderAlbum();
```

- [ ] **Step 9: Run test to verify it passes**

```bash
npx playwright test tests/e2e/album.spec.js --headed
```
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add index.html css/style.css js/app.js js/auth.js tests/e2e/album.spec.js
git commit -m "feat: implement swipeable must-eat album with card states"
```

---

## Task 4: Newsletter Section

**Files:**
- Modify: `index.html` (insert section before `<!-- END SCROLL SECTIONS -->`)
- Modify: `css/style.css`
- Modify: `functions/index.js`
- Modify: `js/app.js`
- Modify: `js/auth.js` (expose `window._functions`)
- Create: `tests/e2e/newsletter.spec.js`

- [ ] **Step 1: Write the failing test** — create `tests/e2e/newsletter.spec.js`:

```javascript
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  const cookieBtn = page.locator('#cookieAccept');
  if (await cookieBtn.isVisible()) await cookieBtn.click();
});

test.describe('Newsletter', () => {
  test('newsletter section is visible on start page', async ({ page }) => {
    await expect(page.locator('#newsletterSection')).toBeVisible();
  });

  test('shows error on empty submit', async ({ page }) => {
    await page.locator('#newsletterSubmit').click();
    await expect(page.locator('#newsletterError')).toBeVisible();
  });

  test('accepts valid email input', async ({ page }) => {
    await page.locator('#newsletterEmail').fill('test@example.com');
    await expect(page.locator('#newsletterEmail')).toHaveValue('test@example.com');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx playwright test tests/e2e/newsletter.spec.js --headed
```
Expected: FAIL.

- [ ] **Step 3: Add newsletter HTML to `index.html`**

Find `<!-- END SCROLL SECTIONS -->` (~line 487) and insert before it:

```html
<!-- NEWSLETTER SECTION -->
<section class="newsletter-section" id="newsletterSection">
  <p class="newsletter-eyebrow">Stay in the loop</p>
  <p class="newsletter-title">New Must-Eats, every week.</p>
  <p class="newsletter-sub">
    Get the latest Berlin spots delivered to your inbox — plus a free bonus card pack.
  </p>
  <form class="newsletter-form" id="newsletterForm" novalidate>
    <input
      class="newsletter-input"
      id="newsletterEmail"
      type="email"
      placeholder="your@email.com"
      autocomplete="email"
    />
    <button class="newsletter-btn" id="newsletterSubmit" type="submit">Subscribe</button>
  </form>
  <p class="newsletter-error" id="newsletterError" hidden>Please enter a valid email address.</p>
  <p class="newsletter-success" id="newsletterSuccess" hidden>You're in! Check your inbox.</p>
  <p class="newsletter-fine">No spam. Unsubscribe anytime.</p>
</section>
```

- [ ] **Step 4: Add newsletter CSS to `css/style.css`**:

```css
/* ============================================
   NEWSLETTER SECTION
   ============================================ */
.newsletter-section {
  background: #fff;
  padding: 48px 24px;
  text-align: center;
  border-top: 1px solid #ececec;
}
.newsletter-eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--orange);
  margin-bottom: 8px;
}
.newsletter-title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: var(--black);
  margin-bottom: 6px;
}
.newsletter-sub {
  font-size: 13px;
  color: var(--gray-400);
  line-height: 1.55;
  max-width: 320px;
  margin: 0 auto 20px;
}
.newsletter-form {
  display: flex;
  gap: 6px;
  max-width: 320px;
  margin: 0 auto;
}
.newsletter-input {
  flex: 1;
  border: 1px solid var(--gray-200);
  padding: 11px 14px;
  font-size: 13px;
  font-family: var(--font);
  border-radius: var(--radius);
  outline: none;
  color: var(--black);
  transition: border-color 0.2s;
}
.newsletter-input:focus { border-color: var(--black); }
.newsletter-btn {
  background: var(--orange);
  color: #fff;
  border: none;
  padding: 11px 18px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: var(--radius);
  font-family: var(--font);
  white-space: nowrap;
  transition: opacity 0.2s;
}
.newsletter-btn:disabled { opacity: 0.5; cursor: default; }
.newsletter-error {
  font-size: 11px;
  color: var(--orange);
  margin-top: 8px;
}
.newsletter-success {
  font-size: 11px;
  color: #2a7a2a;
  font-weight: 600;
  margin-top: 8px;
}
.newsletter-fine {
  font-size: 10px;
  color: #bbb;
  margin-top: 12px;
}
```

- [ ] **Step 5: Expose `window._functions` in `js/auth.js`**

Find `const functions = getFunctions(app);` (~line 35). Add directly after:

```javascript
window._functions = functions;
```

- [ ] **Step 6: Add newsletter form handler to `js/app.js`**

Inside `DOMContentLoaded`, after the `heroExploreBtn` block:

```javascript
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  newsletterForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('newsletterEmail');
    const errorEl    = document.getElementById('newsletterError');
    const successEl  = document.getElementById('newsletterSuccess');
    const submitBtn  = document.getElementById('newsletterSubmit');
    const email      = emailInput ? emailInput.value.trim() : '';

    errorEl.hidden   = true;
    successEl.hidden = true;

    if (!email || !EMAIL_RE.test(email)) {
      errorEl.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    try {
      const { httpsCallable } = await import(
        'https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js'
      );
      const fn = httpsCallable(window._functions, 'subscribeNewsletter');
      await fn({ email });
      successEl.hidden = false;
      if (emailInput) emailInput.value = '';
    } catch {
      errorEl.textContent = 'Something went wrong. Please try again.';
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });
}
```

- [ ] **Step 7: Add `subscribeNewsletter` Cloud Function to `functions/index.js`**

After `exports.onUserCreate`, add:

```javascript
exports.subscribeNewsletter = onCall({ region: 'europe-west1' }, async (req) => {
  const { email } = req.data || {};
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !EMAIL_RE.test(email)) {
    throw new Error('invalid-email');
  }
  const db  = admin.firestore();
  const ref = db.collection('newsletterSubscribers').doc(email.toLowerCase());
  const doc = await ref.get();
  if (doc.exists) return { status: 'already_subscribed' };
  await ref.set({
    email: email.toLowerCase(),
    subscribedAt: Date.now(),
    source: 'landing_page',
  });
  logger.info('[subscribeNewsletter] new subscriber:', email);
  return { status: 'subscribed' };
});
```

- [ ] **Step 8: Deploy the new function**

```bash
firebase deploy --only functions:subscribeNewsletter
```
Expected: `functions[subscribeNewsletter]: function updated`

- [ ] **Step 9: Run tests**

```bash
npx playwright test tests/e2e/newsletter.spec.js --headed
```
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add index.html css/style.css js/app.js js/auth.js functions/index.js tests/e2e/newsletter.spec.js
git commit -m "feat: add newsletter email capture section and Cloud Function"
```

---

## Task 5: Onboarding Flow

4-step bottom-sheet overlay shown once after signup. Skippable on steps 1–3. Final step reveals the Booster Pack.

**Files:**
- Modify: `index.html` (overlay before `</body>`)
- Modify: `css/style.css`
- Modify: `js/app.js`
- Modify: `js/auth.js`
- Create: `tests/e2e/onboarding.spec.js`

- [ ] **Step 1: Write the failing test** — create `tests/e2e/onboarding.spec.js`:

```javascript
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  const cookieBtn = page.locator('#cookieAccept');
  if (await cookieBtn.isVisible()) await cookieBtn.click();
  await page.evaluate(() => {
    if (typeof window.showOnboarding === 'function') window.showOnboarding();
  });
});

test.describe('Onboarding', () => {
  test('overlay appears', async ({ page }) => {
    await expect(page.locator('#onboardingOverlay')).toBeVisible();
  });

  test('step 1 is shown first', async ({ page }) => {
    await expect(page.locator('#obStep1')).toBeVisible();
    await expect(page.locator('#obStep2')).not.toBeVisible();
  });

  test('Next button advances to step 2', async ({ page }) => {
    await page.locator('#obStep1 .ob-next-btn').click();
    await expect(page.locator('#obStep2')).toBeVisible();
    await expect(page.locator('#obStep1')).not.toBeVisible();
  });

  test('Skip goes directly to step 4', async ({ page }) => {
    await page.locator('#obStep1 .ob-skip-btn').click();
    await expect(page.locator('#obStep4')).toBeVisible();
  });

  test('Open Booster Pack closes overlay', async ({ page }) => {
    await page.evaluate(() => window._obGoTo && window._obGoTo(4));
    await page.locator('#obOpenPackBtn').click();
    await expect(page.locator('#onboardingOverlay')).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx playwright test tests/e2e/onboarding.spec.js --headed
```
Expected: FAIL.

- [ ] **Step 3: Add onboarding overlay HTML to `index.html`** (directly before `</body>`):

```html
<!-- ONBOARDING OVERLAY -->
<div class="ob-overlay" id="onboardingOverlay" hidden>

  <div class="ob-panel">
    <!-- Step 1: News -->
    <div class="ob-step" id="obStep1">
      <p class="ob-step-num">1 of 4</p>
      <div class="ob-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
          <path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>
        </svg>
      </div>
      <p class="ob-title">Berlin food news</p>
      <p class="ob-body">New openings, hidden gems, guides.</p>
      <div class="ob-dots">
        <span class="ob-dot active"></span>
        <span class="ob-dot"></span>
        <span class="ob-dot"></span>
        <span class="ob-dot"></span>
      </div>
      <div class="ob-footer">
        <button class="ob-next-btn" id="obNext1">Next</button>
        <button class="ob-skip-btn" id="obSkip1">Skip intro</button>
      </div>
    </div>

    <!-- Step 2: Map -->
    <div class="ob-step" id="obStep2" hidden>
      <p class="ob-step-num">2 of 4</p>
      <div class="ob-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round">
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
          <line x1="9" y1="3" x2="9" y2="18"/>
          <line x1="15" y1="6" x2="15" y2="21"/>
        </svg>
      </div>
      <p class="ob-title">Spots on the map</p>
      <p class="ob-body">Berlin's best food map. Filter by category.</p>
      <div class="ob-dots">
        <span class="ob-dot"></span>
        <span class="ob-dot active"></span>
        <span class="ob-dot"></span>
        <span class="ob-dot"></span>
      </div>
      <div class="ob-footer">
        <button class="ob-next-btn" id="obNext2">Next</button>
        <button class="ob-skip-btn" id="obSkip2">Skip intro</button>
      </div>
    </div>

    <!-- Step 3: Album -->
    <div class="ob-step" id="obStep3" hidden>
      <p class="ob-step-num">3 of 4</p>
      <div class="ob-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="M2 9h20"/>
        </svg>
      </div>
      <p class="ob-title">Must-Eat Album</p>
      <p class="ob-body">156 dishes. Collect them all.</p>
      <div class="ob-dots">
        <span class="ob-dot"></span>
        <span class="ob-dot"></span>
        <span class="ob-dot active"></span>
        <span class="ob-dot"></span>
      </div>
      <div class="ob-footer">
        <button class="ob-next-btn" id="obNext3">Next</button>
        <button class="ob-skip-btn" id="obSkip3">Skip intro</button>
      </div>
    </div>

    <!-- Step 4: Booster Pack -->
    <div class="ob-step" id="obStep4" hidden>
      <p class="ob-step-num">4 of 4</p>
      <div class="ob-icon ob-icon--star">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </div>
      <p class="ob-title">Your Booster Pack is ready.</p>
      <p class="ob-body">10 free cards are waiting for you.</p>

      <div class="ob-pack-wrap">
        <div class="ob-pack-stack">
          <div class="ob-pack-shadow ob-pack-shadow--far"></div>
          <div class="ob-pack-shadow ob-pack-shadow--near"></div>
          <div class="ob-pack-body">
            <div class="ob-pack-stripe"></div>
            <div class="ob-pack-brand">Eat This</div>
            <div class="ob-pack-content">
              <div class="ob-pack-num">10</div>
              <div class="ob-pack-cards-lbl">Cards</div>
              <div class="ob-pack-divider"></div>
              <div class="ob-pack-type">Booster Pack</div>
            </div>
          </div>
        </div>
        <p class="ob-pack-tap">Tap to open</p>
      </div>

      <div class="ob-dots">
        <span class="ob-dot"></span>
        <span class="ob-dot"></span>
        <span class="ob-dot"></span>
        <span class="ob-dot active"></span>
      </div>
      <div class="ob-footer">
        <button class="ob-next-btn" id="obOpenPackBtn">Open Booster Pack</button>
      </div>
    </div>
  </div>

</div>
```

- [ ] **Step 4: Add onboarding CSS to `css/style.css`**:

```css
/* ============================================
   ONBOARDING OVERLAY
   ============================================ */
.ob-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 10000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: env(safe-area-inset-bottom, 0);
}
.ob-overlay[hidden] { display: none; }

.ob-panel {
  background: #fff;
  width: 100%;
  max-width: 480px;
  border-radius: 20px 20px 0 0;
  padding-bottom: 24px;
  overflow: hidden;
}

.ob-step { padding: 28px 24px 0; text-align: center; }
.ob-step[hidden] { display: none; }

.ob-step-num {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--orange);
  margin-bottom: 20px;
}
.ob-icon {
  width: 56px;
  height: 56px;
  background: rgba(255, 59, 0, 0.07);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}
.ob-icon svg { width: 28px; height: 28px; stroke: var(--orange); }
.ob-icon--star { background: rgba(255, 59, 0, 0.1); }

.ob-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: var(--black);
  margin-bottom: 8px;
}
.ob-body {
  font-size: 13px;
  color: var(--gray-400);
  line-height: 1.6;
  margin-bottom: 4px;
}

.ob-dots {
  display: flex;
  justify-content: center;
  gap: 5px;
  padding: 12px 0 16px;
}
.ob-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #d4d4d4;
}
.ob-dot.active {
  background: var(--orange);
  width: 16px;
  border-radius: 2px;
}

.ob-footer {
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ob-next-btn {
  background: var(--orange);
  color: #fff;
  border: none;
  padding: 14px;
  width: 100%;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: var(--radius);
  font-family: var(--font);
}
.ob-skip-btn {
  background: none;
  border: none;
  font-size: 11px;
  color: #aaa;
  cursor: pointer;
  font-family: var(--font);
  padding: 4px;
}

/* Booster pack visual */
.ob-pack-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 8px 0 4px;
}
.ob-pack-stack {
  position: relative;
  width: 100px;
  height: 149px;
}
.ob-pack-shadow {
  position: absolute;
  left: 50%;
  width: 100px;
  height: 149px;
  border-radius: 4px;
}
.ob-pack-shadow--far  {
  top: 8px;
  background: #d8d8d8;
  transform: translateX(-50%) rotate(-4deg);
}
.ob-pack-shadow--near {
  top: 4px;
  background: #e5e5e5;
  transform: translateX(-50%) rotate(-2deg);
}
.ob-pack-body {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 149px;
  border-radius: 4px;
  background: #0a0a0a;
  overflow: hidden;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
}
.ob-pack-stripe {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 44px;
  background: linear-gradient(135deg, var(--orange), #cc2a00);
}
.ob-pack-stripe::after {
  content: '';
  position: absolute;
  bottom: -11px;
  left: 0;
  right: 0;
  height: 22px;
  background: #0a0a0a;
  clip-path: polygon(0 100%, 100% 100%, 100% 0);
}
.ob-pack-brand {
  position: absolute;
  top: 10px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #fff;
}
.ob-pack-content {
  position: absolute;
  top: 48px;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
}
.ob-pack-num {
  font-size: 36px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -2px;
  line-height: 1;
}
.ob-pack-cards-lbl {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--orange);
}
.ob-pack-divider {
  width: 28px;
  height: 1px;
  background: #333;
  margin: 3px 0;
}
.ob-pack-type {
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #555;
}
.ob-pack-tap {
  font-size: 10px;
  color: #aaa;
  font-weight: 600;
}
```

- [ ] **Step 5: Add onboarding JS to `js/app.js`**

Inside `DOMContentLoaded`, after the newsletter form block:

```javascript
// ── Onboarding ──
window._obGoTo = function(step) {
  [1, 2, 3, 4].forEach(n => {
    const el = document.getElementById('obStep' + n);
    if (el) el.hidden = (n !== step);
  });
};

window.showOnboarding = function() {
  if (localStorage.getItem('onboardingComplete')) return;
  const overlay = document.getElementById('onboardingOverlay');
  if (overlay) {
    overlay.hidden = false;
    window._obGoTo(1);
  }
};

const obNext1 = document.getElementById('obNext1');
const obNext2 = document.getElementById('obNext2');
const obNext3 = document.getElementById('obNext3');
const obSkip1 = document.getElementById('obSkip1');
const obSkip2 = document.getElementById('obSkip2');
const obSkip3 = document.getElementById('obSkip3');
const obOpenPackBtn = document.getElementById('obOpenPackBtn');

if (obNext1) obNext1.addEventListener('click', () => window._obGoTo(2));
if (obNext2) obNext2.addEventListener('click', () => window._obGoTo(3));
if (obNext3) obNext3.addEventListener('click', () => window._obGoTo(4));
if (obSkip1) obSkip1.addEventListener('click', () => window._obGoTo(4));
if (obSkip2) obSkip2.addEventListener('click', () => window._obGoTo(4));
if (obSkip3) obSkip3.addEventListener('click', () => window._obGoTo(4));

if (obOpenPackBtn) {
  obOpenPackBtn.addEventListener('click', () => {
    const overlay = document.getElementById('onboardingOverlay');
    if (overlay) overlay.hidden = true;
    localStorage.setItem('onboardingComplete', '1');
    navigateToPage('musts');
  });
}
```

- [ ] **Step 6: Trigger onboarding after signup in `js/auth.js`**

In the `isRegisterMode` success block (~line 254–256), after `applyLoggedInUI(cred.user)` and before `closeLoginModal()`:

```javascript
setTimeout(() => {
  if (typeof window.showOnboarding === 'function') window.showOnboarding();
}, 400);
```

- [ ] **Step 7: Run test to verify it passes**

```bash
npx playwright test tests/e2e/onboarding.spec.js --headed
```
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add index.html css/style.css js/app.js js/auth.js tests/e2e/onboarding.spec.js
git commit -m "feat: add post-signup onboarding flow with booster pack reveal"
```

---

## Final Verification

- [ ] Run full test suite:

```bash
npx playwright test
```
Expected: all tests pass.

- [ ] Manual smoke test at 375×812 mobile viewport:
  - Navbar: labels visible, tap each tab, active tab turns orange
  - Hero: explore button visible, tapping opens album
  - Album: 156 slots across 18 pages, 11 sharp / 10 blurred / 135 empty, swipes work, dots update
  - Newsletter: scroll to bottom of home page, enter email, submit
  - Onboarding: register new account, overlay appears, step through 4 slides, "Open Booster Pack" closes and lands on album

- [ ] Deploy:

```bash
firebase deploy --only hosting
```
