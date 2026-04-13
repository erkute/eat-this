# Desktop Redesign — Design Spec
**Date:** 2026-04-13  
**Project:** Eat This (www.eatthisdot.com)  
**Scope:** Full-screen desktop layout, footer, profile page

---

## 1. Overview

The existing mobile-first design is constrained to a 480px centered frame on desktop (with a dark `#0f0f0f` background on either side). This redesign removes that constraint and expands every page to fill the full desktop viewport. The page-switching model (Hero → News → Map → Must Eats → Profile, each as a separate full-viewport view) is preserved exactly as-is. Only the width constraint is lifted and desktop-specific layouts are introduced.

---

## 2. What Changes, What Stays

### Stays the same
- Page routing: `data-page` attribute switching via navbar icons
- Navbar icon design (News, Map, Must Eats, Burger)
- Color system: `--black`, `--white`, `--orange: #FF3B00`, grays
- Typography: Inter font family
- Hero slider behavior (auto-rotating, 4s interval)
- Map (Leaflet), category filters, spot cards, nearby carousel
- Modal behavior for spot details, article modals, burger drawer
- All existing content sections within each page
- Mobile behavior (≤767px): unchanged

### Changes
- Remove `max-width: 480px` and centering on `.app-pages` for desktop
- Remove dark background `#0f0f0f` on `body` for the phone-frame effect
- Navbar stretches full viewport width
- Each page fills full viewport width
- Grid columns increase on desktop (News: 4 cols, Must Eats: 5 cols)
- New footer component on all pages
- New Profile page (separate page, accessible via navbar icon)
- Login modal stays as overlay (profile page handles the logged-in view as a full page)

---

## 3. Breakpoint Strategy

Existing mobile breakpoint at `767px` is preserved. All new desktop styles apply at `min-width: 768px`.

| Viewport | Layout |
|----------|--------|
| ≤ 767px | Existing mobile design, unchanged |
| ≥ 768px | Full-width desktop layout (this spec) |

---

## 4. Global Desktop Layout

### 4.1 Body / App Container
- Remove: `max-width: 480px`, `margin: 0 auto`, `box-shadow` on `.app-pages`
- Remove: `background: #0f0f0f` on `body` (or set to `#000` / `#0d0d0d` full bleed)
- `.app-pages` becomes full-width, no centering frame

### 4.2 Navbar (`.navbar`)
- Stretches to full viewport width
- Internal layout: logo left, nav icons right (existing icons + new Profile icon)
- Add **Profile icon** (`👤`) to navbar icon row — triggers `data-page="profile"` page
- Height stays 56–60px
- Padding: `0 32px` on desktop (currently `0 16px`)

### 4.3 Footer (new component)
- Appears at the bottom of all pages **except Map** (map fills full remaining height, no footer)
- Pages with footer scroll vertically to reveal it below content
- Layout: 4-column grid

| Column | Contents |
|--------|----------|
| Brand (1.5fr) | Logo, tagline, Instagram link |
| Company (1fr) | About, Contact, Press |
| Legal (1fr) | Impressum, Datenschutz, AGB |
| Language (1fr) | EN/DE toggle |

- Bottom bar: copyright left, "Made with ❤ in Berlin" right
- All footer links open their respective existing modals (About, Contact, Press, etc.)
- Language toggle calls existing i18n switcher
- Background: `#0a0a0a`, border-top: `1px solid #1a1a1a`

---

## 5. Page-by-Page Desktop Layout

### 5.1 Hero Page (`data-page="start"`)
- Hero slider: full viewport width × full viewport height (existing behavior, just wider)
- Content sections below hero (concept, philosophy, account benefits, standards, curation, next cities): switch from single-column to max-width ~960px centered content — readable, not edge-to-edge text
- Footer at bottom of last section

### 5.2 News Page (`data-page="news"`)
- Grid: **4 columns** on desktop (was 2 on mobile, 2 on desktop in 480px frame)
- Cards: same design, fixed aspect ratio, image + category badge + date + headline
- Section header (title + article count) spans full width
- Footer below grid

### 5.3 Map Page (`data-page="map"`)
- Map fills remaining viewport height (below navbar): `calc(100dvh - 60px)`
- Category filter tabs: horizontally centered above map (existing behavior)
- Nearby carousel: stays at bottom of map view
- Spot card modal: stays as bottom sheet on desktop or consider a side panel — **keep as bottom sheet for now**
- No footer on map page (map fills full remaining height)

### 5.4 Must Eats Page (`data-page="musts"`)
- Grid: **5 columns** on desktop (was 2 on mobile)
- Cards: same design (image, dish name, restaurant, district, price tag)
- Click opens existing lightbox modal
- Footer below grid

### 5.5 Profile Page (`data-page="profile"`) — NEW
Full-page view, accessible via Profile icon in navbar. Three tabs:

#### Tab 1: Mein Deck (default)
- Header: avatar, display name, email
- Main area: Must Eat card grid — **5 columns**, same card design as Must Eats page but slightly smaller
- Cards are the full Must Eats catalog (all cards from Sanity CMS)
- "Booster Pack" teaser banner below deck: static placeholder, no functionality yet
- Future: purchased booster packs unlock additional cards

#### Tab 2: Gespeichert
- List of restaurants the user has favorited (heart icon on map spots)
- Each item: thumbnail, restaurant name, category, district
- Clicking a saved restaurant opens its spot card (navigates to map and opens card)

#### Tab 3: Einstellungen
- Display name (editable)
- Email (read-only)
- Password change link
- Delete account
- Sign out button

#### Not-logged-in State
- Show login/register prompt in place of profile content
- "Sign in to see your profile" message with CTA button
- CTA opens the existing login modal

---

## 6. Login / Register
- On desktop: remains a centered modal overlay (existing behavior is fine for desktop at full width)
- The login modal gets wider on desktop: `max-width: 480px` (already reasonable)
- No changes needed to login modal behavior

---

## 7. Profile Page — Data & Auth

- Profile icon always visible in navbar; clicking when logged out opens the existing login modal; clicking when logged in navigates to `data-page="profile"`
- User data source: Firebase Auth (existing `auth.js`)
- Saved restaurants: existing `favourites.js` and Firestore
- Must Eat cards: fetched from Sanity CMS via existing `cms.js` (same query as Must Eats page)
- Profile page logic: new `profile.js` file (or extend `favourites.js`)

---

## 8. Files to Change

| File | Change |
|------|--------|
| `css/style.css` | Remove 480px desktop constraints; add full-width desktop styles for all pages; add footer styles; add profile page styles |
| `index.html` | Widen navbar padding; add footer HTML; add profile page HTML; add profile nav icon |
| `js/app.js` | Add profile page navigation; wire up tab switching |
| `js/profile.js` | New file: profile page logic (tabs, deck rendering, settings) |

---

## 9. Out of Scope

- Booster Pack purchasing (placeholder only)
- Profile picture upload
- Push notification settings on profile page
- Any changes to mobile (≤767px) layout
- Any CMS schema changes
