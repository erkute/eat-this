# Desktop Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the existing 480px phone-frame desktop layout to fill the full viewport, add a footer, add a Profile page, improve the map nearby carousel for desktop, and migrate hardcoded modal content (About, Contact, Press, Impressum, Datenschutz, AGB) to CMS-editable full-page views in Sanity.

**Architecture:** All changes are in vanilla JS/HTML/CSS — no build tools or bundler. Desktop styles live in the existing `@media (min-width: 768px)` block in `css/style.css`. New pages follow the existing `data-page` routing pattern. New JS goes in dedicated files loaded in `index.html`. Sanity content is fetched client-side via `js/cms.js` using GROQ queries against the public CDN.

**Tech Stack:** Vanilla JS (ES6+), CSS3 custom properties, Firebase Auth + Firestore, Sanity CMS (GROQ), Leaflet maps

---

## File Map

| File | Role |
|------|------|
| `css/style.css` | All visual changes — remove frame, desktop grids, footer, profile, static pages, map carousel |
| `index.html` | HTML structure — navbar profile icon, footer, profile page, static page shells, remove old modal content |
| `js/app.js` | Page routing — add `profile` + 6 static page slugs; Portable Text renderer; back-button tracking |
| `js/cms.js` | Add `fetchStaticPage(slug)` with in-memory cache |
| `js/profile.js` | New file — profile page tab logic, deck rendering, settings |

---

## Group A — Desktop Frame Removal & Layout

### Task 1: Remove the 480px phone frame

**Files:**
- Modify: `css/style.css` lines ~2836–2865 (the `@media (min-width: 768px)` block opener)

- [ ] **Step 1: Open `css/style.css` and find the desktop block**

  Search for the comment `DESKTOP APP FRAME` (line 2836). The block currently constrains the layout:
  ```css
  @media (min-width: 768px) {
    body { background: #0f0f0f; }
    .navbar {
      left: 50%; right: auto; transform: translateX(-50%);
      width: 100%; max-width: 480px;
      height: 60px; padding: 0 12px;
      background: #ffffff;
    }
    .app-pages {
      max-width: 480px; margin: 60px auto 0;
      box-shadow: 0 0 80px rgba(0,0,0,0.7);
    }
    .app-footer {
      left: 50%; right: auto; transform: translateX(-50%);
      width: 100%; max-width: 480px;
    }
  ```

- [ ] **Step 2: Replace those opening rules with full-width equivalents**

  Replace only the `body`, `.navbar`, `.app-pages`, and `.app-footer` rules above with:

  ```css
  @media (min-width: 768px) {
    body { background: #000; }

    .navbar {
      left: 0; right: 0; transform: none;
      width: 100%; max-width: none;
      height: 60px; padding: 0 32px;
      display: flex; align-items: center; justify-content: space-between;
      background: #fff;
    }

    .app-pages {
      max-width: none; margin: 60px 0 0; box-shadow: none;
    }

    .app-footer { display: none; } /* replaced by new site-footer */
  ```

  Leave all other rules inside `@media (min-width: 768px)` untouched.

- [ ] **Step 3: Verify**

  Run `npm run serve` and open `http://localhost:3000` at 900px+ width.
  Expected: App fills full width. No dark side bars. Navbar spans edge to edge.

- [ ] **Step 4: Commit**

  ```bash
  git add css/style.css
  git commit -m "feat(desktop): remove 480px phone frame — full viewport width"
  ```

---

### Task 2: Desktop navbar — full-width layout and profile icon

**Files:**
- Modify: `index.html` (navbar section, lines ~280–316)
- Modify: `js/app.js` (nav button wiring)

- [ ] **Step 1: Add the profile button to navbar in `index.html`**

  Find `.navbar-actions` and insert a profile button **before** the burger button:

  ```html
  <button class="navbar-btn" id="navProfileBtn" aria-label="Profile">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  </button>
  ```

- [ ] **Step 2: Wire profile button in `js/app.js`**

  Find where `navNewsBtn`, `navMapBtn`, `navMustsBtn` are wired. Add after them:

  ```js
  const navProfileBtn = document.getElementById('navProfileBtn');
  if (navProfileBtn) {
    navProfileBtn.addEventListener('click', () => {
      if (window._currentUser) {
        showPage('profile');
      } else {
        window.openLoginModal && window.openLoginModal();
      }
    });
  }
  ```

- [ ] **Step 3: Verify**

  At desktop width, profile icon visible in navbar. Click when logged out → login modal opens.

- [ ] **Step 4: Commit**

  ```bash
  git add index.html js/app.js
  git commit -m "feat(nav): add profile icon to navbar"
  ```

---

### Task 3: News page — 4-column desktop grid

**Files:**
- Modify: `css/style.css`

- [ ] **Step 1: Find the existing news desktop styles**

  Search for `.app-page[data-page="news"] .news-section` (around line 3062).

- [ ] **Step 2: Add 4-column grid rules inside `@media (min-width: 768px)`**

  After the existing news desktop rules, add:

  ```css
  @media (min-width: 768px) {
    .app-page[data-page="news"] .news-section {
      padding: 0 32px 40px;
      overflow-y: auto;
      height: calc(100dvh - 60px);
    }
    .app-page[data-page="news"] .news-header {
      padding: 32px 0 20px;
      margin-bottom: 24px;
    }
    .app-page[data-page="news"] .news-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
    }
    .app-page[data-page="news"] .news-featured {
      grid-column: span 2;
    }
  }
  ```

- [ ] **Step 3: Verify**

  News page at 900px+: 4-column grid, featured article spans 2, scrollable.

- [ ] **Step 4: Commit**

  ```bash
  git add css/style.css
  git commit -m "feat(desktop): news page 4-column grid"
  ```

---

### Task 4: Must Eats page — 5-column desktop grid

**Files:**
- Modify: `css/style.css`

- [ ] **Step 1: Find the existing must-eats grid desktop rule**

  Search for `.app-page[data-page="musts"] .must-eats-grid` (line ~2980). Currently `grid-template-columns: repeat(2, 1fr)`.

- [ ] **Step 2: Override to 5 columns at desktop widths**

  Inside `@media (min-width: 768px)`:

  ```css
  @media (min-width: 768px) {
    .app-page[data-page="musts"] .must-eats-section {
      padding: 0 32px 40px;
      overflow-y: auto;
      height: calc(100dvh - 60px);
    }
    .app-page[data-page="musts"] .must-eats-header {
      padding: 32px 0 20px;
      text-align: left;
      margin-bottom: 24px;
    }
    .app-page[data-page="musts"] .must-eats-grid {
      grid-template-columns: repeat(5, 1fr);
      gap: 16px;
      padding: 0;
      max-width: none;
    }
    /* Remove the odd-last-child centering hack */
    .app-page[data-page="musts"] .must-eats-grid .must-card:nth-child(odd):last-child {
      grid-column: auto;
      justify-self: auto;
      width: auto;
    }
  }
  ```

- [ ] **Step 3: Verify**

  Must Eats at 900px+: 5-column grid, scrollable, no orphan-card centering.

- [ ] **Step 4: Commit**

  ```bash
  git add css/style.css
  git commit -m "feat(desktop): must eats page 5-column grid"
  ```

---

### Task 5: Map page — desktop nearby carousel (6 cards + right-fade peek)

**Files:**
- Modify: `css/style.css`
- Modify: `index.html` (wrap `.map-nearby-grid` in a wrapper div)

- [ ] **Step 1: Wrap the nearby grid in `index.html`**

  Find `.map-nearby-grid` (id `nearbyGrid`) and wrap it in a new div:

  ```html
  <div class="map-nearby-grid-wrapper">
    <div class="map-nearby-grid" id="nearbyGrid">
      <!-- cards rendered by JS -->
    </div>
  </div>
  ```

- [ ] **Step 2: Add desktop overrides for the nearby carousel in `css/style.css`**

  Inside `@media (min-width: 768px)`:

  ```css
  @media (min-width: 768px) {
    /* Always visible at bottom — no slide-up sheet on desktop */
    .app-page[data-page="map"] .map-nearby {
      transform: translateY(0);
      transition: none;
      border-radius: 16px 16px 0 0;
      padding: 16px 24px 20px;
    }

    /* Hide drag handle */
    .app-page[data-page="map"] .map-nearby-handle {
      display: none;
    }

    /* 6.4 divisor: ~6 cards visible + partial 7th as peek */
    .app-page[data-page="map"] .map-nearby-grid-card {
      flex: 0 0 calc((100% - 8px * 5) / 6.4);
    }

    /* Taller image */
    .app-page[data-page="map"] .map-nearby-grid-card-img {
      height: 120px;
    }

    /* Larger text */
    .app-page[data-page="map"] .map-nearby-grid-card-name { font-size: 13px; }
    .app-page[data-page="map"] .map-nearby-grid-card-meta { font-size: 11px; }
    .app-page[data-page="map"] .map-nearby-grid-card-hours { font-size: 10px; }

    /* Right-fade gradient to hint more cards exist */
    .app-page[data-page="map"] .map-nearby-grid-wrapper {
      position: relative;
    }
    .app-page[data-page="map"] .map-nearby-grid-wrapper::after {
      content: '';
      position: absolute;
      top: 0; right: 0; bottom: 0;
      width: 80px;
      background: linear-gradient(to right, transparent, #fff);
      pointer-events: none;
    }

    /* Shrink map height to account for always-visible strip (~180px) */
    .app-page[data-page="map"] .map-container {
      height: calc(100dvh - 60px - 180px);
    }

    .app-page[data-page="map"] .map-nearby-label {
      font-size: 12px;
      margin-bottom: 12px;
    }
  }
  ```

- [ ] **Step 3: Verify**

  Map page at 900px+: restaurant strip always visible at bottom. 6 cards visible, 7th partially visible. Right-fade gradient present. Taller images. Cards scrollable horizontally.

- [ ] **Step 4: Commit**

  ```bash
  git add css/style.css index.html
  git commit -m "feat(desktop): map nearby carousel — 6 cards, taller, right-fade peek hint"
  ```

---

## Group B — Footer

### Task 6: Footer HTML

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add footer after the `#appPages` container**

  Find the closing `</div>` of `#appPages` (or `.app-pages`) and insert after it:

  ```html
  <footer class="site-footer" id="siteFooter" aria-label="Site footer">
    <div class="site-footer-grid">

      <div class="site-footer-brand">
        <a href="#" class="site-footer-logo" data-page="start" aria-label="Eat This home">
          <img src="pics/eat.png" alt="EAT THIS" width="28" height="28" />
          <span>Eat This</span>
        </a>
        <p class="site-footer-tagline" data-i18n="footer.tagline">
          Berlin's finest food guide. We eat so you know exactly what to order.
        </p>
        <a href="https://www.instagram.com/eatthisdot/" target="_blank"
           rel="noopener noreferrer" class="site-footer-ig" aria-label="Instagram">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          @eatthisdot
        </a>
      </div>

      <div class="site-footer-col">
        <h3 class="site-footer-col-title" data-i18n="footer.company">Company</h3>
        <button class="site-footer-link" data-page="about" data-i18n="nav.about">About</button>
        <button class="site-footer-link" data-page="contact" data-i18n="nav.contact">Contact</button>
        <button class="site-footer-link" data-page="press" data-i18n="nav.press">Press</button>
      </div>

      <div class="site-footer-col">
        <h3 class="site-footer-col-title" data-i18n="footer.legal">Legal</h3>
        <button class="site-footer-link" data-page="impressum" data-i18n="nav.impressum">Impressum</button>
        <button class="site-footer-link" data-page="datenschutz" data-i18n="nav.datenschutz">Datenschutz</button>
        <button class="site-footer-link" data-page="agb" data-i18n="nav.agb">AGB</button>
      </div>

      <div class="site-footer-col">
        <h3 class="site-footer-col-title" data-i18n="footer.language">Language</h3>
        <div class="site-footer-lang">
          <button class="site-footer-lang-btn" id="footerLangDe" data-lang="de">DE</button>
          <button class="site-footer-lang-btn" id="footerLangEn" data-lang="en">EN</button>
        </div>
      </div>

    </div>
    <div class="site-footer-bottom">
      <span class="site-footer-copy">2026 Eat This. All rights reserved.</span>
      <span class="site-footer-copy">Made with love in Berlin</span>
    </div>
  </footer>
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add index.html
  git commit -m "feat(footer): add site footer HTML"
  ```

---

### Task 7: Footer CSS

**Files:**
- Modify: `css/style.css`

- [ ] **Step 1: Append footer styles to `css/style.css`**

  ```css
  /* ═══════════════════════════════════════════
     SITE FOOTER
     ═══════════════════════════════════════════ */
  .site-footer { display: none; }

  @media (min-width: 768px) {
    .site-footer {
      display: block;
      background: #0a0a0a;
      border-top: 1px solid #1a1a1a;
      padding: 48px 32px 24px;
      color: #fff;
    }

    .site-footer-grid {
      display: grid;
      grid-template-columns: 1.5fr 1fr 1fr 1fr;
      gap: 32px;
      margin-bottom: 40px;
    }

    .site-footer-logo {
      display: flex; align-items: center; gap: 8px;
      text-decoration: none; color: #fff;
      font-size: 14px; font-weight: 900;
      letter-spacing: 0.04em; text-transform: uppercase;
      margin-bottom: 14px;
    }

    .site-footer-tagline {
      font-size: 12px; color: #555; line-height: 1.7;
      margin-bottom: 16px; max-width: 240px;
    }

    .site-footer-ig {
      display: inline-flex; align-items: center; gap: 7px;
      font-size: 12px; color: #888; text-decoration: none;
      background: #1a1a1a; border: 1px solid #2a2a2a;
      border-radius: 6px; padding: 6px 12px;
      transition: color 0.15s, border-color 0.15s;
    }
    .site-footer-ig:hover { color: #FF3B00; border-color: #FF3B00; }

    .site-footer-col { display: flex; flex-direction: column; }

    .site-footer-col-title {
      font-size: 10px; font-weight: 700;
      letter-spacing: 0.12em; text-transform: uppercase;
      color: #444; margin-bottom: 14px;
    }

    .site-footer-link {
      background: none; border: none; padding: 0;
      margin-bottom: 10px; font-size: 13px; color: #666;
      cursor: pointer; text-align: left; font-family: inherit;
      transition: color 0.15s; line-height: 1.4;
    }
    .site-footer-link:hover { color: #FF3B00; }

    .site-footer-lang {
      display: flex; border: 1px solid #2a2a2a;
      border-radius: 6px; overflow: hidden; width: fit-content;
    }

    .site-footer-lang-btn {
      background: none; border: none; padding: 6px 14px;
      font-size: 12px; font-weight: 600; color: #666;
      cursor: pointer; font-family: inherit; letter-spacing: 0.04em;
      transition: background 0.15s, color 0.15s;
    }
    .site-footer-lang-btn.active { background: #FF3B00; color: #fff; }

    .site-footer-bottom {
      border-top: 1px solid #1a1a1a; padding-top: 20px;
      display: flex; align-items: center; justify-content: space-between;
    }

    .site-footer-copy { font-size: 11px; color: #333; }
  }
  ```

- [ ] **Step 2: Verify**

  Scroll to bottom of any page at desktop width. Footer visible, 4-column layout.

- [ ] **Step 3: Commit**

  ```bash
  git add css/style.css
  git commit -m "feat(footer): add site footer CSS"
  ```

---

### Task 8: Wire footer links and language buttons

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: Wire footer navigation and language toggle**

  Inside `DOMContentLoaded` in `js/app.js`, add:

  ```js
  // Footer navigation links
  document.querySelectorAll('.site-footer-link[data-page]').forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
  });

  // Footer language toggle
  function updateFooterLangButtons(lang) {
    const de = document.getElementById('footerLangDe');
    const en = document.getElementById('footerLangEn');
    if (de) de.classList.toggle('active', lang === 'de');
    if (en) en.classList.toggle('active', lang === 'en');
  }

  const footerLangDe = document.getElementById('footerLangDe');
  const footerLangEn = document.getElementById('footerLangEn');

  if (footerLangDe) {
    footerLangDe.addEventListener('click', () => {
      window._setLang && window._setLang('de');
      updateFooterLangButtons('de');
    });
  }
  if (footerLangEn) {
    footerLangEn.addEventListener('click', () => {
      window._setLang && window._setLang('en');
      updateFooterLangButtons('en');
    });
  }

  // Sync on load
  updateFooterLangButtons(window._currentLang || 'de');
  ```

  > Note: confirm the i18n language switcher function name in `js/i18n.js` — search for `window._setLang` or `window.setLanguage`. Use whichever is exposed.

- [ ] **Step 2: Commit**

  ```bash
  git add js/app.js
  git commit -m "feat(footer): wire footer links to page navigation and language switcher"
  ```

---

## Group C — Profile Page

### Task 9: Profile page HTML shell

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add the profile page inside `#appPages`**

  After the last existing `.app-page`, insert:

  ```html
  <div class="app-page" data-page="profile" id="profilePage">

    <!-- Logged-out state -->
    <div class="profile-auth-prompt" id="profileAuthPrompt">
      <div class="profile-auth-prompt-inner">
        <div class="profile-auth-icon">&#128100;</div>
        <h2 class="profile-auth-title" data-i18n="profile.signInTitle">Sign in to see your profile</h2>
        <p class="profile-auth-sub" data-i18n="profile.signInSub">Save restaurants, collect your Must Eat deck and manage your account.</p>
        <button class="btn btn--primary" id="profileSignInBtn" data-i18n="auth.signIn">Sign In</button>
      </div>
    </div>

    <!-- Logged-in state -->
    <div class="profile-content" id="profileContent" hidden>

      <div class="profile-header">
        <div class="profile-avatar" id="profileAvatar">
          <span id="profileAvatarInitial">?</span>
        </div>
        <div class="profile-header-info">
          <h1 class="profile-name" id="profileName">&#8212;</h1>
          <p class="profile-email" id="profileEmail">&#8212;</p>
        </div>
      </div>

      <div class="profile-tabs" role="tablist">
        <button class="profile-tab active" role="tab" data-tab="deck"
                aria-selected="true" data-i18n="profile.tab.deck">Mein Deck</button>
        <button class="profile-tab" role="tab" data-tab="saved"
                aria-selected="false" data-i18n="profile.tab.saved">Gespeichert</button>
        <button class="profile-tab" role="tab" data-tab="settings"
                aria-selected="false" data-i18n="profile.tab.settings">Einstellungen</button>
      </div>

      <!-- Tab: Deck -->
      <div class="profile-tab-panel active" data-panel="deck" role="tabpanel">
        <div class="profile-deck-header">
          <span class="profile-deck-count" id="profileDeckCount"></span>
        </div>
        <div class="profile-deck-grid" id="profileDeckGrid"></div>
        <div class="profile-booster-teaser">
          <div class="profile-booster-teaser-text">
            <strong data-i18n="profile.booster.title">Booster Packs &#8212; Coming Soon</strong>
            <span data-i18n="profile.booster.sub">Erweitere dein Deck mit exklusiven Gerichten</span>
          </div>
          <span class="profile-booster-badge">Coming Soon</span>
        </div>
      </div>

      <!-- Tab: Gespeichert -->
      <div class="profile-tab-panel" data-panel="saved" role="tabpanel" hidden>
        <div class="profile-saved-grid" id="profileSavedGrid"></div>
        <p class="profile-saved-empty" id="profileSavedEmpty" hidden
           data-i18n="profile.saved.empty">Du hast noch keine Restaurants gespeichert.</p>
      </div>

      <!-- Tab: Einstellungen -->
      <div class="profile-tab-panel" data-panel="settings" role="tabpanel" hidden>
        <div class="profile-settings">

          <div class="profile-settings-section">
            <h3 class="profile-settings-section-title">Account</h3>
            <div class="profile-settings-field">
              <label class="profile-settings-label">Anzeigename</label>
              <div class="profile-settings-row">
                <input type="text" class="profile-settings-input"
                       id="profileDisplayNameInput" placeholder="Dein Name" autocomplete="name" />
                <button class="profile-settings-save-btn" id="profileSaveNameBtn">Speichern</button>
              </div>
              <p class="profile-settings-feedback" id="profileNameFeedback" hidden></p>
            </div>
            <div class="profile-settings-field">
              <label class="profile-settings-label">E-Mail</label>
              <p class="profile-settings-value" id="profileSettingsEmail">&#8212;</p>
            </div>
          </div>

          <div class="profile-settings-section">
            <h3 class="profile-settings-section-title">Sicherheit</h3>
            <button class="profile-settings-action-btn"
                    id="profileResetPasswordBtn">Passwort zur&#252;cksetzen</button>
            <p class="profile-settings-feedback" id="profilePasswordFeedback" hidden></p>
          </div>

          <div class="profile-settings-section profile-settings-section--danger">
            <h3 class="profile-settings-section-title">Danger Zone</h3>
            <button class="profile-settings-signout-btn" id="profileSignOutBtn">Abmelden</button>
            <button class="profile-settings-delete-btn"
                    id="profileDeleteAccountBtn">Account l&#246;schen</button>
          </div>

        </div>
      </div>

    </div>
  </div>
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add index.html
  git commit -m "feat(profile): add profile page HTML shell"
  ```

---

### Task 10: Profile page CSS

**Files:**
- Modify: `css/style.css`

- [ ] **Step 1: Append profile page styles to `css/style.css`**

  ```css
  /* ═══════════════════════════════════════════
     PROFILE PAGE
     ═══════════════════════════════════════════ */
  .profile-auth-prompt {
    display: flex; align-items: center; justify-content: center;
    height: calc(100dvh - 60px); padding: 32px; text-align: center;
  }
  .profile-auth-prompt-inner { max-width: 340px; }
  .profile-auth-icon { font-size: 48px; margin-bottom: 16px; }
  .profile-auth-title {
    font-size: 20px; font-weight: 800;
    margin-bottom: 10px; letter-spacing: -0.02em;
  }
  .profile-auth-sub {
    font-size: 14px; color: var(--gray-600);
    line-height: 1.6; margin-bottom: 24px;
  }

  .profile-content { overflow-y: auto; height: calc(100dvh - 60px); }

  .profile-header {
    display: flex; align-items: center; gap: 16px;
    padding: 28px 20px 20px; border-bottom: 1px solid var(--gray-100);
  }
  .profile-avatar {
    width: 56px; height: 56px; border-radius: 50%;
    background: var(--orange); color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; font-weight: 700; flex-shrink: 0;
  }
  .profile-name { font-size: 18px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 2px; }
  .profile-email { font-size: 13px; color: var(--gray-600); }

  .profile-tabs {
    display: flex; border-bottom: 1px solid var(--gray-100);
    padding: 0 20px; overflow-x: auto; scrollbar-width: none;
  }
  .profile-tabs::-webkit-scrollbar { display: none; }
  .profile-tab {
    flex-shrink: 0; background: none;
    border: none; border-bottom: 2px solid transparent;
    padding: 14px 16px; font-size: 12px; font-weight: 700;
    letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--gray-400); cursor: pointer; font-family: inherit;
    transition: color 0.15s, border-color 0.15s; white-space: nowrap;
  }
  .profile-tab.active { color: var(--orange); border-bottom-color: var(--orange); }

  .profile-tab-panel { padding: 24px 20px; }
  .profile-tab-panel[hidden] { display: none; }

  .profile-deck-header {
    display: flex; align-items: center;
    justify-content: space-between; margin-bottom: 16px;
  }
  .profile-deck-count {
    font-size: 11px; color: var(--gray-400); font-weight: 600;
    letter-spacing: 0.06em; text-transform: uppercase;
  }
  .profile-deck-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
  }

  @media (min-width: 768px) {
    .profile-deck-grid { grid-template-columns: repeat(6, 1fr); gap: 14px; }
    .profile-tab-panel { padding: 32px; }
    .profile-header { padding: 36px 32px 24px; }
    .profile-tabs { padding: 0 32px; }
  }

  .profile-deck-card {
    cursor: pointer; border-radius: 8px; overflow: hidden;
    background: var(--gray-50); border: 1px solid var(--gray-100);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .profile-deck-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    border-color: var(--orange);
  }
  .profile-deck-card-img {
    width: 100%; aspect-ratio: 3/4; object-fit: cover;
    display: block; background: var(--gray-100);
  }
  .profile-deck-card-body { padding: 6px 8px 8px; }
  .profile-deck-card-name {
    font-size: 10px; font-weight: 700; color: var(--black);
    line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .profile-deck-card-rest {
    font-size: 9px; color: var(--gray-400);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .profile-booster-teaser {
    margin-top: 24px; padding: 14px 18px;
    background: #fff8f6; border: 1px dashed var(--orange);
    border-radius: 10px; display: flex;
    align-items: center; justify-content: space-between; gap: 16px;
  }
  .profile-booster-teaser-text {
    display: flex; flex-direction: column; gap: 3px; font-size: 13px;
  }
  .profile-booster-teaser-text strong { color: var(--orange); }
  .profile-booster-teaser-text span { font-size: 12px; color: var(--gray-600); }
  .profile-booster-badge {
    font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--gray-400);
    border: 1px solid var(--gray-200); border-radius: 4px; padding: 3px 8px;
  }

  .profile-saved-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
  @media (min-width: 768px) {
    .profile-saved-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; max-width: 800px; }
  }
  .profile-saved-item {
    display: flex; align-items: center; gap: 12px; padding: 12px;
    background: var(--gray-50); border: 1px solid var(--gray-100);
    border-radius: 10px; cursor: pointer; transition: border-color 0.15s;
  }
  .profile-saved-item:hover { border-color: var(--orange); }
  .profile-saved-img {
    width: 52px; height: 52px; border-radius: 8px;
    object-fit: cover; background: var(--gray-100); flex-shrink: 0;
  }
  .profile-saved-name { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
  .profile-saved-meta { font-size: 11px; color: var(--gray-400); }
  .profile-saved-empty {
    font-size: 14px; color: var(--gray-400);
    text-align: center; padding: 48px 0; line-height: 1.6;
  }

  .profile-settings { display: flex; flex-direction: column; gap: 32px; max-width: 480px; }
  .profile-settings-section { display: flex; flex-direction: column; gap: 14px; }
  .profile-settings-section-title {
    font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--gray-400);
    padding-bottom: 10px; border-bottom: 1px solid var(--gray-100);
  }
  .profile-settings-field { display: flex; flex-direction: column; gap: 6px; }
  .profile-settings-label { font-size: 12px; font-weight: 600; color: var(--gray-600); }
  .profile-settings-value { font-size: 14px; color: var(--gray-400); }
  .profile-settings-row { display: flex; gap: 8px; }
  .profile-settings-input {
    flex: 1; padding: 10px 12px; border: 1px solid var(--gray-200);
    border-radius: 6px; font-size: 14px; font-family: inherit;
    color: var(--black); background: var(--white); outline: none;
    transition: border-color 0.15s;
  }
  .profile-settings-input:focus { border-color: var(--orange); }
  .profile-settings-save-btn {
    padding: 10px 16px; background: var(--black); color: var(--white);
    border: none; border-radius: 6px; font-size: 13px; font-weight: 600;
    font-family: inherit; cursor: pointer; white-space: nowrap;
    transition: background 0.15s;
  }
  .profile-settings-save-btn:hover { background: #333; }
  .profile-settings-feedback { font-size: 12px; color: var(--gray-600); }
  .profile-settings-action-btn {
    background: none; border: 1px solid var(--gray-200);
    border-radius: 6px; padding: 10px 16px; font-size: 13px; font-weight: 600;
    font-family: inherit; cursor: pointer; color: var(--black); width: fit-content;
    transition: border-color 0.15s;
  }
  .profile-settings-action-btn:hover { border-color: var(--black); }
  .profile-settings-section--danger .profile-settings-section-title {
    color: #c0392b; border-bottom-color: rgba(192,57,43,0.15);
  }
  .profile-settings-signout-btn,
  .profile-settings-delete-btn {
    background: none; border: 1px solid var(--gray-200);
    border-radius: 6px; padding: 10px 16px; font-size: 13px; font-weight: 600;
    font-family: inherit; cursor: pointer; width: fit-content;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .profile-settings-signout-btn { color: var(--black); }
  .profile-settings-signout-btn:hover { background: var(--gray-50); border-color: var(--black); }
  .profile-settings-delete-btn { color: #c0392b; border-color: rgba(192,57,43,0.3); }
  .profile-settings-delete-btn:hover { background: rgba(192,57,43,0.06); border-color: #c0392b; }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add css/style.css
  git commit -m "feat(profile): add profile page CSS"
  ```

---

### Task 11: Profile page JavaScript (`js/profile.js`)

**Files:**
- Create: `js/profile.js`
- Modify: `index.html` (add script tag)
- Modify: `js/auth.js` (call initProfilePage on auth state change)

- [ ] **Step 1: Create `js/profile.js`**

  ```js
  /**
   * profile.js — Profile page logic
   * Dependencies (globals): window._currentUser, window.CMS,
   *   window._favData, window._signOut, window._sendPasswordReset
   */

  /* ── Tab switching ── */
  function initProfileTabs() {
    const tabs   = document.querySelectorAll('.profile-tab[data-tab]');
    const panels = document.querySelectorAll('.profile-tab-panel[data-panel]');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
        panels.forEach(p => { p.classList.remove('active'); p.hidden = true; });
        tab.classList.add('active');
        tab.setAttribute('aria-selected','true');
        const panel = document.querySelector('.profile-tab-panel[data-panel="' + tab.dataset.tab + '"]');
        if (panel) { panel.classList.add('active'); panel.hidden = false; }
      });
    });
  }

  /* ── Header ── */
  function populateProfileHeader(user) {
    const displayName = user.displayName || user.email.split('@')[0];
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('profileName', displayName);
    set('profileEmail', user.email);
    set('profileSettingsEmail', user.email);
    set('profileAvatarInitial', displayName.charAt(0).toUpperCase());
    const input = document.getElementById('profileDisplayNameInput');
    if (input) input.value = user.displayName || '';
  }

  /* ── Deck ── */
  async function renderDeck() {
    const grid    = document.getElementById('profileDeckGrid');
    const countEl = document.getElementById('profileDeckCount');
    if (!grid) return;

    let items = [];
    try { items = await window.CMS.fetchMustEats(); }
    catch (e) { grid.textContent = 'Could not load deck.'; return; }

    if (countEl) countEl.textContent = items.length + ' Karten';

    const fragment = document.createDocumentFragment();
    items.forEach(item => {
      const imgUrl = item.imageUrl ? window.CMS.imageUrl(item.imageUrl, { width: 200 }) : '';
      const card = document.createElement('div');
      card.className = 'profile-deck-card';
      card.title = item.dish || '';

      const img = document.createElement(imgUrl ? 'img' : 'div');
      img.className = 'profile-deck-card-img';
      if (imgUrl) { img.src = imgUrl; img.alt = item.dish || ''; img.loading = 'lazy'; }

      const body = document.createElement('div');
      body.className = 'profile-deck-card-body';

      const name = document.createElement('div');
      name.className = 'profile-deck-card-name';
      name.textContent = item.dish || '\u2014';

      const rest = document.createElement('div');
      rest.className = 'profile-deck-card-rest';
      rest.textContent = item.restaurant || '';

      body.appendChild(name);
      body.appendChild(rest);
      card.appendChild(img);
      card.appendChild(body);
      fragment.appendChild(card);
    });
    grid.textContent = '';
    grid.appendChild(fragment);
  }

  /* ── Saved ── */
  function renderSaved() {
    const grid  = document.getElementById('profileSavedGrid');
    const empty = document.getElementById('profileSavedEmpty');
    if (!grid) return;

    const favData = window._favData || [];
    grid.textContent = '';

    if (favData.length === 0) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    const fragment = document.createDocumentFragment();
    favData.forEach(spot => {
      const item = document.createElement('div');
      item.className = 'profile-saved-item';
      item.dataset.spotId = spot.id;
      item.setAttribute('role','button');
      item.tabIndex = 0;

      const img = document.createElement(spot.photoUrl ? 'img' : 'div');
      img.className = 'profile-saved-img';
      if (spot.photoUrl) { img.src = spot.photoUrl; img.alt = spot.name; img.loading = 'lazy'; }

      const info = document.createElement('div');

      const nameEl = document.createElement('div');
      nameEl.className = 'profile-saved-name';
      nameEl.textContent = spot.name;

      const meta = document.createElement('div');
      meta.className = 'profile-saved-meta';
      meta.textContent = [spot.category, spot.district].filter(Boolean).join(' \u00B7 ');

      info.appendChild(nameEl);
      info.appendChild(meta);
      item.appendChild(img);
      item.appendChild(info);

      item.addEventListener('click', () => {
        window.showPage && window.showPage('map');
        setTimeout(() => { window._openSpotById && window._openSpotById(spot.id); }, 300);
      });

      fragment.appendChild(item);
    });
    grid.appendChild(fragment);
  }

  /* ── Settings ── */
  function initSettings(user) {
    const saveBtn      = document.getElementById('profileSaveNameBtn');
    const nameInput    = document.getElementById('profileDisplayNameInput');
    const nameFeedback = document.getElementById('profileNameFeedback');

    if (saveBtn && nameInput) {
      saveBtn.addEventListener('click', async () => {
        const newName = nameInput.value.trim();
        if (!newName) return;
        try {
          await user.updateProfile({ displayName: newName });
          if (nameFeedback) { nameFeedback.textContent = 'Gespeichert \u2713'; nameFeedback.hidden = false; }
          const nameEl = document.getElementById('profileName');
          const initEl = document.getElementById('profileAvatarInitial');
          if (nameEl) nameEl.textContent = newName;
          if (initEl) initEl.textContent = newName.charAt(0).toUpperCase();
        } catch (e) {
          if (nameFeedback) { nameFeedback.textContent = 'Fehler beim Speichern.'; nameFeedback.hidden = false; }
        }
      });
    }

    const resetBtn   = document.getElementById('profileResetPasswordBtn');
    const pwFeedback = document.getElementById('profilePasswordFeedback');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        try {
          window._sendPasswordReset && await window._sendPasswordReset(user.email);
          if (pwFeedback) { pwFeedback.textContent = 'E-Mail gesendet \u2713'; pwFeedback.hidden = false; }
        } catch (e) {
          if (pwFeedback) { pwFeedback.textContent = 'Fehler. Bitte erneut versuchen.'; pwFeedback.hidden = false; }
        }
      });
    }

    const signOutBtn = document.getElementById('profileSignOutBtn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', () => { window._signOut && window._signOut(); });
    }

    const deleteBtn = document.getElementById('profileDeleteAccountBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (!window.confirm('Bist du sicher? Dein Account wird dauerhaft gel\u00F6scht.')) return;
        user.delete()
          .then(() => { window.showPage && window.showPage('start'); })
          .catch(() => { window.alert('Fehler. Bitte neu einloggen und erneut versuchen.'); });
      });
    }
  }

  /* ── Main entry point ── */
  function initProfilePage(user) {
    const authPrompt = document.getElementById('profileAuthPrompt');
    const content    = document.getElementById('profileContent');
    const signInBtn  = document.getElementById('profileSignInBtn');

    if (!user) {
      if (authPrompt) authPrompt.style.display = 'flex';
      if (content)    content.hidden = true;
      if (signInBtn && !signInBtn._bound) {
        signInBtn._bound = true;
        signInBtn.addEventListener('click', () => window.openLoginModal && window.openLoginModal());
      }
      return;
    }

    if (authPrompt) authPrompt.style.display = 'none';
    if (content)    content.hidden = false;

    populateProfileHeader(user);
    initProfileTabs();
    renderDeck();
    renderSaved();
    initSettings(user);
  }

  window._initProfilePage  = initProfilePage;
  window._renderProfileSaved = renderSaved;
  ```

- [ ] **Step 2: Add script tag in `index.html`**

  Find the `<script src="js/favourites.js">` tag. Add immediately after it:

  ```html
  <script src="js/profile.js"></script>
  ```

- [ ] **Step 3: Call `initProfilePage` from `js/auth.js`**

  In `js/auth.js`, find `onAuthStateChanged`. After the existing code, add:

  ```js
  // inside onAuthStateChanged callback:
  if (window._initProfilePage) {
    window._initProfilePage(user || null);
  }
  ```

- [ ] **Step 4: Verify**

  Log in, navigate to profile. Check all three tabs work. Deck loads. Settings buttons respond.

- [ ] **Step 5: Commit**

  ```bash
  git add js/profile.js index.html js/auth.js
  git commit -m "feat(profile): profile page JS — tabs, deck, saved, settings"
  ```

---

## Group D — Static CMS Pages

### Task 12: Create `staticPage` schema in Sanity Studio

**Files:**
- Action in Sanity Studio (remote — no local file change)

- [ ] **Step 1: Open Sanity Studio**

  Go to the studio for project `ehwjnjr2`. URL format: `https://ehwjnjr2.sanity.studio/` or find it in `https://sanity.io/manage`.

- [ ] **Step 2: Add the `staticPage` document type**

  In the studio codebase (wherever schemas are defined), create `staticPage.js`:

  ```js
  export default {
    name: 'staticPage',
    title: 'Static Page',
    type: 'document',
    fields: [
      {
        name: 'slug', title: 'Slug', type: 'slug',
        description: 'e.g. "impressum", "about", "datenschutz"',
        options: { source: 'title' },
        validation: Rule => Rule.required()
      },
      { name: 'title',   title: 'Title (EN)', type: 'string', validation: Rule => Rule.required() },
      { name: 'titleDe', title: 'Title (DE)', type: 'string' },
      { name: 'body',    title: 'Content (EN)', type: 'array', of: [{ type: 'block' }] },
      { name: 'bodyDe',  title: 'Content (DE)', type: 'array', of: [{ type: 'block' }] }
    ],
    preview: { select: { title: 'title', subtitle: 'slug.current' } }
  }
  ```

  Register it in the schema index (add to the `schemaTypes` array). Deploy the studio.

- [ ] **Step 3: Create the 6 documents in the Studio**

  | Slug | Title (EN) | Title (DE) |
  |------|-----------|-----------|
  | `about` | About | Über uns |
  | `contact` | Contact | Kontakt |
  | `press` | Press | Presse |
  | `impressum` | Impressum | Impressum |
  | `datenschutz` | Privacy Policy | Datenschutz |
  | `agb` | Terms | AGB |

  Copy existing hardcoded content from `index.html` modals into the `bodyDe` fields. Publish all 6 documents.

- [ ] **Step 4: Record completion**

  ```bash
  git commit --allow-empty -m "feat(cms): staticPage schema deployed to Sanity, 6 documents published"
  ```

---

### Task 13: `fetchStaticPage` in `js/cms.js`

**Files:**
- Modify: `js/cms.js`

- [ ] **Step 1: Add cache object and `fetchStaticPage` method to `js/cms.js`**

  Find the CMS object (or module) in `cms.js`. Note the pattern used by `fetchNews` and `fetchMustEats` to build the CDN URL and fetch — use the same `CDN_BASE` constant or equivalent.

  Add alongside existing fetch methods:

  ```js
  // Place the cache outside the CMS object/methods so it persists across calls
  const _staticPageCache = {};

  // Inside the CMS object / exported methods:
  async fetchStaticPage(slug) {
    if (_staticPageCache[slug]) return _staticPageCache[slug];

    // Build the GROQ query — adjust CDN_BASE variable name to match existing code
    const query = encodeURIComponent(
      '*[_type == "staticPage" && slug.current == "' + slug + '"][0]{ title, titleDe, body, bodyDe }'
    );
    const url = CDN_BASE + '?query=' + query; // CDN_BASE: match existing variable name

    try {
      const res  = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const page = data.result || null;
      if (page) _staticPageCache[slug] = page;
      return page;
    } catch (e) {
      console.error('[CMS] fetchStaticPage("' + slug + '") failed:', e);
      return null;
    }
  }
  ```

- [ ] **Step 2: Verify in browser console**

  ```js
  CMS.fetchStaticPage('impressum').then(d => console.log(d))
  ```
  Expected: `{ title: "Impressum", titleDe: "Impressum", bodyDe: [...], body: [...] }`

- [ ] **Step 3: Commit**

  ```bash
  git add js/cms.js
  git commit -m "feat(cms): add fetchStaticPage with in-memory cache"
  ```

---

### Task 14: Static page HTML shells and CSS

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`

- [ ] **Step 1: Add 6 static page shells inside `#appPages`**

  Insert after the profile page. All 6 follow this pattern (repeat for each slug):

  ```html
  <div class="app-page static-page" data-page="about" id="staticPageAbout">
    <div class="static-page-inner">
      <button class="static-page-back" data-back>&#8592; Back</button>
      <h1 class="static-page-title" id="staticPageAbout-title"></h1>
      <div class="static-page-body" id="staticPageAbout-body">
        <span class="static-page-loading">Loading&#8230;</span>
      </div>
    </div>
  </div>
  ```

  Use these IDs:
  - about → `staticPageAbout`, `staticPageAbout-title`, `staticPageAbout-body`
  - contact → `staticPageContact`, `staticPageContact-title`, `staticPageContact-body`
  - press → `staticPagePress`, `staticPagePress-title`, `staticPagePress-body`
  - impressum → `staticPageImpressum`, `staticPageImpressum-title`, `staticPageImpressum-body`
  - datenschutz → `staticPageDatenschutz`, `staticPageDatenschutz-title`, `staticPageDatenschutz-body`
  - agb → `staticPageAgb`, `staticPageAgb-title`, `staticPageAgb-body`

- [ ] **Step 2: Append static page CSS to `css/style.css`**

  ```css
  /* ═══════════════════════════════════════════
     STATIC PAGES
     ═══════════════════════════════════════════ */
  .static-page { overflow-y: auto; height: calc(100dvh - 60px); background: var(--white); }
  .static-page-inner { max-width: 760px; margin: 0 auto; padding: 32px 20px 80px; }

  @media (min-width: 768px) {
    .static-page-inner { padding: 48px 32px 80px; }
  }

  .static-page-back {
    display: inline-flex; align-items: center; gap: 6px;
    background: none; border: none; padding: 0; margin-bottom: 28px;
    font-size: 13px; font-weight: 600; color: var(--gray-400);
    cursor: pointer; font-family: inherit; transition: color 0.15s;
  }
  .static-page-back:hover { color: var(--black); }

  .static-page-title {
    font-size: 28px; font-weight: 900; letter-spacing: -0.03em;
    line-height: 1.1; margin-bottom: 32px; text-transform: uppercase;
  }
  @media (min-width: 768px) { .static-page-title { font-size: 40px; } }

  .static-page-body { font-size: 15px; line-height: 1.8; color: var(--black); }
  .static-page-body h2 { font-size: 20px; font-weight: 800; margin: 32px 0 12px; letter-spacing: -0.02em; }
  .static-page-body h3 { font-size: 16px; font-weight: 700; margin: 24px 0 8px; }
  .static-page-body p  { margin-bottom: 16px; color: var(--gray-600); }
  .static-page-body ul, .static-page-body ol { margin: 0 0 16px 20px; color: var(--gray-600); }
  .static-page-body li { margin-bottom: 6px; }
  .static-page-body a  { color: var(--orange); text-decoration: underline; }
  .static-page-body strong { color: var(--black); font-weight: 700; }
  .static-page-loading { color: var(--gray-400); font-size: 14px; padding: 20px 0; display: block; }
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add index.html css/style.css
  git commit -m "feat(static-pages): HTML shells and CSS for 6 CMS-backed pages"
  ```

---

### Task 15: Static page routing, Portable Text renderer, navigation wiring

**Files:**
- Modify: `js/app.js`
- Modify: `index.html` (burger drawer links)

- [ ] **Step 1: Add constants and Portable Text renderer to `js/app.js`**

  Near the top of `js/app.js` (after `CONFIG`), add:

  ```js
  const STATIC_PAGE_SLUGS = ['about', 'contact', 'press', 'impressum', 'datenschutz', 'agb'];

  /**
   * Render Sanity Portable Text blocks to an HTML string.
   * Handles: h2, h3, paragraph, bullet list, numbered list, strong, em.
   * Uses DOM methods — no innerHTML from user input on final render;
   * text content is set via textContent to prevent XSS.
   */
  function renderPortableText(blocks) {
    if (!blocks || !blocks.length) return document.createDocumentFragment();

    const fragment = document.createDocumentFragment();
    let currentList = null;
    let currentListType = null;

    const closeList = () => {
      if (currentList) { fragment.appendChild(currentList); currentList = null; currentListType = null; }
    };

    const buildInline = (children) => {
      const span = document.createElement('span');
      (children || []).forEach(child => {
        const marks = child.marks || [];
        let node = document.createTextNode(child.text || '');
        marks.slice().reverse().forEach(mark => {
          const wrapper = document.createElement(
            mark === 'strong' ? 'strong' : mark === 'em' ? 'em' : 'span'
          );
          wrapper.appendChild(node);
          node = wrapper;
        });
        span.appendChild(node);
      });
      return span;
    };

    blocks.forEach(block => {
      if (block._type !== 'block') { closeList(); return; }

      if (block.listItem) {
        const listTag = block.listItem === 'number' ? 'ol' : 'ul';
        if (currentListType !== listTag) {
          closeList();
          currentList = document.createElement(listTag);
          currentListType = listTag;
        }
        const li = document.createElement('li');
        li.appendChild(buildInline(block.children));
        currentList.appendChild(li);
        return;
      }

      closeList();

      const tag = block.style === 'h2' ? 'h2' : block.style === 'h3' ? 'h3' : 'p';
      const el = document.createElement(tag);
      el.appendChild(buildInline(block.children));
      fragment.appendChild(el);
    });

    closeList();
    return fragment;
  }
  ```

- [ ] **Step 2: Add `loadStaticPage(slug)` function**

  ```js
  async function loadStaticPage(slug) {
    // ID mapping: "datenschutz" → "staticPageDatenschutz"
    const id = 'staticPage' + slug.charAt(0).toUpperCase() + slug.slice(1);
    const titleEl = document.getElementById(id + '-title');
    const bodyEl  = document.getElementById(id + '-body');
    if (!titleEl || !bodyEl) return;

    // Show loading
    bodyEl.textContent = '';
    const loading = document.createElement('span');
    loading.className = 'static-page-loading';
    loading.textContent = 'Loading\u2026';
    bodyEl.appendChild(loading);

    const lang = window._currentLang || 'de';
    const page = await window.CMS.fetchStaticPage(slug);

    bodyEl.textContent = ''; // clear loading

    if (!page) {
      const err = document.createElement('p');
      err.style.color = '#999';
      err.textContent = 'Inhalt konnte nicht geladen werden.';
      bodyEl.appendChild(err);
      return;
    }

    titleEl.textContent = (lang === 'de' && page.titleDe) ? page.titleDe : (page.title || '');
    const blocks = (lang === 'de' && page.bodyDe) ? page.bodyDe : (page.body || []);
    bodyEl.appendChild(renderPortableText(blocks));
  }
  ```

- [ ] **Step 3: Hook `loadStaticPage` into the `showPage` function**

  In `showPage(page)`, add at the end of the function body:

  ```js
  // Track previous page for back-button
  window._prevPage    = window._currentPage || 'start';
  window._currentPage = page;

  // Load CMS content for static pages
  if (STATIC_PAGE_SLUGS.includes(page)) {
    loadStaticPage(page);
  }
  ```

- [ ] **Step 4: Wire back buttons inside `DOMContentLoaded`**

  ```js
  document.querySelectorAll('.static-page-back[data-back]').forEach(btn => {
    btn.addEventListener('click', () => {
      showPage(window._prevPage || 'start');
    });
  });
  ```

- [ ] **Step 5: Update burger drawer links in `index.html`**

  Find burger drawer buttons that open About/Contact/Press/Impressum/Datenschutz/AGB modals. Replace them with `data-page` buttons. Example:

  ```html
  <!-- Before -->
  <button class="burger-nav-item" onclick="openModal('aboutModal')">About</button>

  <!-- After -->
  <button class="burger-nav-item" data-page="about" data-i18n="nav.about">About</button>
  ```

  Repeat for: contact, press, impressum, datenschutz, agb.

  Then in `js/app.js` inside `DOMContentLoaded`:
  ```js
  document.querySelectorAll('.burger-nav-item[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      window._closeBurgerDrawer && window._closeBurgerDrawer();
      showPage(btn.dataset.page);
    });
  });
  ```

  > Note: confirm the burger drawer close function name in `app.js` — search for `burgerDrawer` or `closeBurger`. Use whichever exists.

- [ ] **Step 6: Verify**

  Click "About" in footer → About page renders with title and CMS content. "Back" button returns. Language switch reloads the page in the correct language.

- [ ] **Step 7: Commit**

  ```bash
  git add js/app.js index.html
  git commit -m "feat(static-pages): routing, Portable Text DOM renderer, back button, burger menu wiring"
  ```

---

### Task 16: Remove hardcoded modal content for migrated pages

**Files:**
- Modify: `index.html`
- Modify: `js/app.js` (remove modal open calls)

- [ ] **Step 1: Confirm all 6 Sanity documents are published and content verified**

  Open each static page in the app (About, Contact, etc.) and confirm the CMS content renders correctly before deleting the hardcoded content.

- [ ] **Step 2: Remove the old modal elements from `index.html`**

  Delete these elements entirely:
  - `<div id="aboutModal" ...>...</div>`
  - `<div id="contactModal" ...>...</div>`
  - `<div id="pressModal" ...>...</div>`
  - `<div id="impressumModal" ...>...</div>`
  - `<div id="datenschutzModal" ...>...</div>`
  - `<div id="agbModal" ...>...</div>`

- [ ] **Step 3: Remove modal open/close JS for these modals**

  In `js/app.js` (and `js/auth.js` if present), search for references to `aboutModal`, `contactModal`, `pressModal`, `impressumModal`, `datenschutzModal`, `agbModal`. Remove or comment out the code that opened/closed them.

- [ ] **Step 4: Verify no console errors**

  Open devtools Console at `http://localhost:3000`. Confirm no `null` reference errors for removed elements.

- [ ] **Step 5: Commit**

  ```bash
  git add index.html js/app.js
  git commit -m "refactor: remove hardcoded modal content migrated to Sanity CMS"
  ```

---

## Group E — Polish & Deploy

### Task 17: Hero page content section width

**Files:**
- Modify: `css/style.css`

- [ ] **Step 1: Constrain hero content sections to readable width on desktop**

  In `index.html`, check the class names used for the sections below the hero slider. They are likely something like `.start-section`, `.standards-grid`, `.philosophy-grid`. Confirm exact names, then add inside `@media (min-width: 768px)`:

  ```css
  @media (min-width: 768px) {
    /* Center hero content sections — readable width, not edge-to-edge */
    .app-page[data-page="start"] .hero-sections,
    .app-page[data-page="start"] .start-sections {
      max-width: 960px;
      margin: 0 auto;
      padding: 0 32px;
    }
    .app-page[data-page="start"] .start-section {
      padding: 80px 0;
    }
    /* 3-col grid for philosophy/standards cards if they exist */
    .app-page[data-page="start"] .standards-grid,
    .app-page[data-page="start"] .philosophy-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
    }
  }
  ```

  > If the section class names differ, grep `index.html` for the sections below `<div class="hero"` and use the actual class names.

- [ ] **Step 2: Commit**

  ```bash
  git add css/style.css
  git commit -m "feat(desktop): hero content sections centered at 960px"
  ```

---

### Task 18: Final QA and deploy

- [ ] **Step 1: Test at 1280px, 1440px, 1920px viewports**

  - [ ] Hero: full-width slider, content sections centered
  - [ ] News: 4-column grid, scrollable
  - [ ] Map: full height, nearby carousel 6 cards visible, right-fade present, strip always visible
  - [ ] Must Eats: 5-column grid, scrollable
  - [ ] Profile (logged out): auth prompt centered
  - [ ] Profile (logged in): all tabs work — Deck, Gespeichert, Einstellungen
  - [ ] About / Contact / Press / Impressum / Datenschutz / AGB: content from CMS, back button works
  - [ ] Footer: visible on Hero/News/MustEats/Profile pages, hidden on Map, all links work, language toggle works
  - [ ] Mobile 375px: completely unchanged from before

- [ ] **Step 2: Run Playwright E2E tests**

  ```bash
  npx playwright test
  ```

  Expected: All pass. If modal-related tests fail because modal IDs were removed, update the selectors to use the new static page `data-page` attribute:
  ```js
  // Before: await page.click('#aboutModal')
  // After:  await page.click('[data-page="about"]')
  ```

- [ ] **Step 3: Deploy to Firebase Hosting**

  ```bash
  firebase deploy --only hosting
  ```

- [ ] **Step 4: Smoke-test production at `www.eatthisdot.com`**

  Verify on the live site: full-width layout, footer, profile page, and static pages all work.

- [ ] **Step 5: Final commit**

  ```bash
  git add -A
  git commit -m "feat: desktop redesign complete — full viewport, footer, profile, CMS static pages, map carousel"
  ```

---

## Appendix: Self-Review Corrections

### A1 — Saved tab: use existing `favourites.js` renderer

`favourites.js` already has `window._renderProfileFavourites()` which reads `window._favSpots` (Set of IDs) and `window._allSpots` (array of full spot objects set by `app.js`). It expects `#profileFavsGrid` in the DOM.

**Corrections to apply during Task 9 and Task 11:**

1. In Task 9 (Profile HTML), change the saved tab grid element to:
   ```html
   <div class="profile-favs-grid" id="profileFavsGrid"></div>
   ```
   (Use `profileFavsGrid` not `profileSavedGrid` to match `favourites.js`)

2. In Task 10 (Profile CSS), add styles for `favourites.js` card classes:
   ```css
   .profile-fav-card {
     display: flex; align-items: center; gap: 12px; padding: 12px; width: 100%;
     background: var(--gray-50); border: 1px solid var(--gray-100);
     border-radius: 10px; cursor: pointer; text-align: left;
     transition: border-color 0.15s; font-family: inherit;
   }
   .profile-fav-card:hover { border-color: var(--orange); }
   .profile-fav-img {
     width: 52px; height: 52px; border-radius: 8px;
     overflow: hidden; flex-shrink: 0; background: var(--gray-100);
     display: flex; align-items: center; justify-content: center;
   }
   .profile-fav-img img { width: 100%; height: 100%; object-fit: cover; }
   .profile-fav-img--placeholder { font-size: 20px; color: var(--orange); }
   .profile-fav-info { display: flex; flex-direction: column; gap: 2px; }
   .profile-fav-name { font-size: 13px; font-weight: 700; color: var(--black); }
   .profile-fav-district { font-size: 11px; color: var(--gray-400); }
   ```

3. In Task 11 (profile.js), replace the `renderSaved()` function body with:
   ```js
   function renderSaved() {
     // Delegate to existing favourites.js renderer
     window._renderProfileFavourites && window._renderProfileFavourites();
   }
   ```
   Remove `window._favData` references entirely — they do not exist.
