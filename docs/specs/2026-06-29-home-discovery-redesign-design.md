# Home / Discovery Redesign — Design Spec

Date: 2026-06-29
Scope: **Home page only** (`/` DE, `/en` EN). Other surfaces (map, restaurant,
profile, login) come later, one at a time. This spec defines a coherent
"aus einem Guss" design language for the home and applies it to every home
section.

Related: [`2026-06-22-login-home-profile-redesign-design.md`](2026-06-22-login-home-profile-redesign-design.md),
[`2026-06-18-design-token-contract.md`](2026-06-18-design-token-contract.md),
[`2026-06-18-component-contracts.md`](2026-06-18-component-contracts.md).

## 1. Problem

The current home is a stack of ~12 sections, each with its own visual
treatment (red panels, food strips, district lists, magazine rows, pack
blocks). It reads as inconsistent and "not from one mould" — no shared element
language, no rhythm, weak brand communication. The owner wants the home to
function as a **discovery surface** (what's around me, which Must Eats exist,
fast routes onto the map) that feels **like an app to use**, cohesive across
desktop and mobile.

## 2. Design language (locked)

The reference set: **Slice Society** (uniform white, one accent, photo-forward,
borderless), with **Our Legacy / Sofi Bakery / Bar Basta** editorial calm.

### Colour

- **White `#FFFFFF`** — the single, continuous page background. No per-section
  colour bands. No cream.
- **Ink `#15120E`** — all type, hairlines, and dark fills (e.g. locked Must-Eat
  cards, footer block, primary button).
- **Yellow `#FFC600`** — the one accent colour, used consistently and sparingly:
  primary action button, section markers (the small ▪ square), Remy, key
  highlights.
- **Red is OUT.** The existing `cassette` red (`#D9382A`) is not used on the new
  home. (It may still live in tokens for other surfaces; the home simply doesn't
  reference it.)
- Neutral photo/placeholder greys: `#ECEAE6` (image rest state), `#F2F1EF`
  (search field / quiet chips), `#E4E1DC` (hairlines), `#8a857d` (muted caption).

### Typography

- **FF Providence Sans Pro** via Adobe Fonts (Typekit kit `kgb1lmh`).
  - Family stack: `"ff-providence-sans-web-pro-1","ff-providence-sans-web-pro-2",sans-serif`
  - Available weights: **400 (regular)** and **700 (bold)**, each with italic.
    No 500/600/800/900 — design must hold with 400 + 700 only.
  - Headlines: 700, **UPPERCASE**, tight tracking (~-0.02em), tight leading
    (~0.9). Body / captions: 400–700.
- **Silkscreen** (pixel) stays as the recognisable brand detail: wordmark logo,
  micro-labels / kickers, ticket-style numbers. Small sizes only, never body.

### Layout principles

- **Borderless.** Photos sit directly on white. Structure comes from whitespace
  - type, not boxes/frames. (Hairlines allowed only for list dividers, e.g.
    Bezirke.)
- **Photo-forward.** Real food/restaurant photography is the richness. Captions
  sit below images (name, then muted meta).
- **One element vocabulary, reused everywhere:** a photo card (image block +
  caption), a section header (yellow ▪ marker + UPPERCASE bold title + Silkscreen
  "→" link), a primary button (ink fill / white text, or yellow fill / ink text
  for the single "unlock" CTA).
- **Rails bleed off the right edge** (a partial next card at ~40% opacity) to
  signal horizontal swipe — the app affordance.
- Corner radius: modest (~8–10px on photos, ~6–7px on buttons). Not pills, not
  sharp-zero. Consistent across all elements.
- **Remy floats** persistently bottom-right as a yellow circular button on every
  scroll position.

### Motion (per project rule — no opacity fades for entry/exit)

- Entry/reveal motion uses translate (rails slide, cards rise from Y), never
  opacity fades on brand-facing motion. Hover/state tint via opacity is fine.
  See CLAUDE.md "Animation — no opacity fades".

## 3. Section structure (consolidated to ~8 content sections + header/footer chrome, from ~12)

Order, top to bottom. Every section uses the shared header pattern and element
vocabulary. All restaurant/category/district links route onto the **map**
(`/map?...`) via `MapIntentLink`; articles route to `/news/...`.

1. **Header** — Silkscreen wordmark, nav (Spots · Must Eats · Map), Login.
   Logged-in: Login → account affordance.
2. **Hero** — Silkscreen kicker ("BERLIN — WAS DU ESSEN SOLLST"), big UPPERCASE
   headline **"WE TELL YOU WHAT TO EAT"** (the English brand line, used on both
   DE and EN as the brand statement), primary "Zur Map" button + a
   yellow-underlined "Was ist um mich" link, and the **Spot des Tages** as a
   large photo. Below the hero: a **discovery search field** ("Worauf hast du
   Lust?") that opens a **category quick-picker**, which then routes onto the map
   (`/map?cat=<slug>`).
   - **Logged-in variant:** kicker becomes "HEY {Name}", headline/sub shift to
     "DEINE MAP WARTET" with shortcuts to saved spots + open Must Eats (folds in
     today's `HubDeineWelt` purpose). Photo slot can show a saved/face-up spot.
3. **Kategorien** — "WORAUF HAST DU LUST?" rail of category photo cards →
   `/map?cat=<slug>`. Source: the **full category list** (`categoryNames` / all
   `category` docs), not the curated weekly `homeWeek` set.
4. **Um dich herum (Nearby)** — live-location rail of nearby spots with distance
   meta → `/map?r=<slug>`. Reuses the anon/live map dataset (as `HubNearby` does
   today). Absorbs the old standalone "Neu auf der Map".
5. **Must Eats** — the signature mechanic. Short copy + a row of face-down (ink)
   / one open (photo) cards, and the **single commerce CTA** "All Berlin
   freischalten" (yellow fill). **Consolidates** today's separate `HubMustEatsTeaser`,
   `HubPacks`, `HubWelcomePack`, and `HubAllBerlin` into one block. Per-pack
   purchase pages still exist at `/pack/<slug>`; the home stops listing them as
   separate sections.
6. **Frag Remy** — KI buddy. Header + Remy avatar (yellow) + quick-ask chips
   (quiet `#F2F1EF` chips). Re-skinned from the old yellow band into the uniform
   white language (yellow now lives in the avatar/accents, not a full band).
   Behaviour unchanged (opens BuddyWidget via existing `dispatchBuddyAsk`).
7. **Nach Bezirk** — hairline list (district name UPPERCASE + count "→") →
   `/map?bezirk=<slug>`. Source: `districts`.
8. **Auf den Teller (Magazin)** — lead story + two secondary photo cards →
   `/news/<slug>`. Source: `magazine`.
9. **Footer** — Silkscreen wordmark + legal links, ink-on-light, single top
   hairline. (`SiteFooter`.)

Plus the persistent floating **Remy** button.

### Removed / folded

- Standalone "Neu auf der Map" → folded into Nearby (4).
- `HubPacks`, `HubWelcomePack`, `HubAllBerlin` (separate pack blocks + fan visual)
  → folded into Must Eats (5) as one "All Berlin" CTA.
- The old red `indexBlock` "Auf dem Teller" food strip → its purpose (dish →
  map) is covered by Kategorien (3) + Must Eats (5); the standalone strip is
  dropped.
- `HubFaq` → kept but moved to just above the footer (or folded into footer
  area); low priority on a discovery-first home. **Open question (§6).**

## 4. Responsive behaviour

Same element vocabulary, two layouts:

- **Desktop:** hero is two-column (headline left, Spot-des-Tages photo right),
  search field full-width below. Rails show ~4–5 cards. Magazin is lead + 2-up.
- **Mobile (~360–390px):** everything stacks single-column. Hero = kicker →
  headline → full-width Spot photo → search field. Rails scroll horizontally
  with a bleeding partial card. Bezirke = full-width hairline rows. Remy = 52px
  floating button bottom-right (above the system bar).
- Breakpoint strategy follows the existing CSS (`nextjs/css/`), mobile-first.

## 5. Implementation approach

- **Font integration:** add the Typekit kit to `app/[locale]/layout.tsx`
  `<head>` (the bootstrap layout owns `<head>`). Options: `<link rel="stylesheet"
href="https://use.typekit.net/kgb1lmh.css">` + `rel="preconnect"` to
  `use.typekit.net`, or `next/font` Adobe loader. Pick the lowest-CLS path;
  Silkscreen continues to load as today. Self-hosting Providence is not licensed
  — Typekit CDN only.
- **CSS:** source in `nextjs/css/`, build with `npm run build:css`, bump the
  `?v=NN` cache-bust on the stylesheet `<link>` in `app/[locale]/(spa)/layout.tsx`.
  Introduce home design tokens (the colours/spacing above) aligned with
  `2026-06-18-design-token-contract.md` rather than ad-hoc values.
- **Components:** refactor `HubSection.tsx` (currently holds hero, latest,
  index/food-strip, districts, magazine inline) into the new section set, reusing
  `HubNearby`, `HubMustEatsTeaser` (restyled), `HubFragRemy` (restyled),
  `HubFaq`, `SiteFooter`, `MapIntentLink`. Delete `HubPacks`, `HubWelcomePack`,
  `HubAllBerlin` usage from the home (and the files if unused elsewhere — repo
  rule: rip out dead code). Keep `HubDeineWelt`'s logged-in purpose, merged into
  the hero's logged-in variant.
- **Data:** no new Sanity fields required — `getHomeData` already provides
  spotOfDay, newOnMap, districts (+spots), magazine, categoryNames; nearby reuses
  `getInitialAnonMapData`.
- **Images:** any new static assets that ship under `nextjs/public/` must be
  WebP (project rule); Sanity images keep `?auto=format` via
  `lib/sanityImageLoader.ts`.
- **i18n:** DE default, EN at `/en`. Copy lives in
  `lib/i18n/translations.ts` (next-intl). UPPERCASE is a CSS `text-transform`,
  not baked into source strings, so translations stay clean.
- **SEO:** preserve existing home metadata, hreflang, and the WebPage + FAQPage
  JSON-LD in `app/[locale]/(spa)/page.tsx`. If `HubFaq` moves/folds, keep the FAQ
  entries in DOM so the FAQPage schema still has matching content.

## 6. Resolved decisions (were open questions)

1. **FAQ** — keep a slim FAQ section on the home (above the footer) for the
   FAQPage schema + SEO, **restyled** into the new language.
2. **Hero headline** — **"WE TELL YOU WHAT TO EAT"** (English brand line, used on
   both DE and EN).
3. **Search field behaviour** — "Worauf hast du Lust?" opens a **category
   quick-picker**, which then routes onto the map (`/map?cat=<slug>`). It is a
   button/trigger, not a free-text input.
4. **Category source** — the **full category list** (all `category` docs /
   `categoryNames`), not the curated weekly `homeWeek` set.

## 7. Out of scope

- Map, restaurant, profile, login surfaces (handled in later, separate specs).
- New Sanity schema/content.
- Changing the Must Eats unlock/commerce logic itself (only its presentation on
  the home is consolidated).
