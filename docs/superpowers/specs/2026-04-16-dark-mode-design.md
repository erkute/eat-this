# Dark / Light Mode — Design Spec
**Date:** 2026-04-16  
**Project:** Eat This Berlin (`www.eatthisdot.com`)  
**Status:** Approved by user

---

## Summary

Add a full dark/light mode to the app. The user can switch via an iOS-style toggle in two places: the burger menu drawer and the site footer. The first-visit default follows the device's system preference (`prefers-color-scheme`). The chosen mode is persisted in `localStorage`.

---

## Decisions

| Question | Decision |
|---|---|
| Toggle placement | Burger menu drawer **+** site footer |
| Toggle design | iOS-style sliding pill (☀️ / 🌙) |
| Default on first visit | System preference (`prefers-color-scheme: dark`) |
| Persistence | `localStorage` key `theme` → `'light'` \| `'dark'` |

---

## Architecture

### 1. CSS Custom Properties (tokens)

Extend `:root` in `style.css` with semantic color tokens. Add a `[data-theme="dark"]` block that overrides them.

```css
:root {
  --bg:        #ffffff;
  --bg-2:      #fafafa;
  --bg-3:      #f5f5f5;
  --surface:   #ffffff;
  --surface-2: #f5f5f5;
  --border:    #e8e8e8;
  --text:      #000000;
  --text-2:    #555555;
  --text-3:    #888888;
  /* brand stays fixed */
  --orange:    #FF3B00;
}

[data-theme="dark"] {
  --bg:        #0d0d0d;
  --bg-2:      #111111;
  --bg-3:      #1a1a1a;
  --surface:   #141414;
  --surface-2: #1c1c1c;
  --border:    rgba(255,255,255,0.08);
  --text:      #ffffff;
  --text-2:    rgba(255,255,255,0.55);
  --text-3:    rgba(255,255,255,0.30);
}
```

All existing hardcoded color values in `style.css` (navbar, cards, footer, news section, etc.) are migrated to use these tokens.

**Exception:** The map bottom sheet already has its own hardcoded dark styles under `.app-page[data-page="map"] .map-nearby`. These are removed and replaced with token-based rules that work in both modes — with the dark map-sheet look preserved only when `[data-theme="dark"]` is active.

### 2. No-Flash Init Script

A small inline `<script>` in `<head>` (before any CSS renders) reads `localStorage` and sets `data-theme` on `<html>` immediately, preventing a white flash on dark-mode page loads.

```html
<script>
  (function() {
    var saved = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  })();
</script>
```

### 3. Toggle Component HTML

The same toggle markup is used in both locations. Each gets a unique `id` so JS can wire them independently but keep them in sync.

**Burger drawer** (inside `.burger-lang-row` or as new `.burger-theme-row`):
```html
<div class="burger-theme-row">
  <span class="burger-theme-label" data-i18n="theme.darkMode">Dark Mode</span>
  <label class="theme-toggle" id="themeToggleBurger" aria-label="Toggle dark mode">
    <span class="theme-toggle-track">
      <span class="theme-toggle-thumb"></span>
    </span>
  </label>
</div>
```

**Footer** (inside `.site-footer-meta`):
```html
<label class="theme-toggle" id="themeToggleFooter" aria-label="Toggle dark mode">
  <span class="theme-toggle-track">
    <span class="theme-toggle-thumb"></span>
  </span>
</label>
```

### 4. Toggle CSS

The iOS-style toggle is purely CSS — no images, no emoji in DOM. The sun/moon icons are CSS `content` pseudo-elements on the thumb.

```css
.theme-toggle { cursor: pointer; display: inline-flex; align-items: center; }
.theme-toggle-track {
  width: 40px; height: 24px;
  background: #ddd;
  border-radius: 999px;
  position: relative;
  transition: background 0.2s;
}
.theme-toggle-thumb {
  width: 20px; height: 20px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  top: 2px; left: 2px;
  transition: left 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.25);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px;
}
.theme-toggle-thumb::after { content: '☀️'; }

[data-theme="dark"] .theme-toggle-track { background: #FF3B00; }
[data-theme="dark"] .theme-toggle-thumb { left: 18px; }
[data-theme="dark"] .theme-toggle-thumb::after { content: '🌙'; }
```

### 5. JS Logic (in `app.js`)

A single `initTheme()` function handles everything:

- Reads current theme from `<html data-theme>` (already set by the no-flash script)
- Wires `click` handlers on both toggles
- On toggle: flips `data-theme`, saves to `localStorage`, syncs both toggle visual states
- Listens to `window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ...)` to react if the user changes system preference while the page is open (only if no explicit `localStorage` preference is saved)

```javascript
function initTheme() {
  const root = document.documentElement;
  const toggles = ['themeToggleBurger', 'themeToggleFooter']
    .map(id => document.getElementById(id))
    .filter(Boolean);

  function setTheme(dark, persist) {
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (persist) localStorage.setItem('theme', dark ? 'dark' : 'light');
  }

  toggles.forEach(t => t.addEventListener('click', () => {
    const isDark = root.getAttribute('data-theme') === 'dark';
    setTheme(!isDark, true);
  }));

  // React to OS preference change (only if user hasn't made an explicit choice)
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', e => {
      if (!localStorage.getItem('theme')) setTheme(e.matches, false);
    });
}
```

### 6. i18n

Add translation keys for the toggle label:

```javascript
// en
theme: { darkMode: 'Dark Mode' }

// de
theme: { darkMode: 'Dark Mode' }  // same in German (industry standard)
```

---

## Scope

### In scope
- Navbar background, logo, icon buttons
- Body / page background
- All card components (food news cards, map grid cards, map list rows)
- Section headers, labels, meta text
- Footer (background, links, lang switcher)
- Burger drawer (background, text, dividers)
- Map bottom sheet (refactor existing dark overrides to use tokens)
- iOS-style toggle in burger drawer + footer

### Out of scope
- Spot detail overlay (complex, separate task)
- Custom map tile style (Leaflet tiles stay the same)
- Images (naturally unaffected)

---

## File Changes

| File | Change |
|---|---|
| `index.html` | No-flash `<script>` in `<head>`; toggle HTML in burger drawer + footer template |
| `css/style.css` | New token definitions in `:root` + `[data-theme="dark"]`; migrate hardcoded colors to tokens; replace map-sheet dark overrides with token-based rules |
| `js/app.js` | Add `initTheme()` function, call it on `DOMContentLoaded` |
| `js/i18n.js` | Add `theme.darkMode` key |

---

## Rollout

1. Implement and test locally (`firebase serve --only hosting`)
2. User tests on iPhone Safari (dark + light)
3. `git push` + `firebase deploy --only hosting`
