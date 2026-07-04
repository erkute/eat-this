# Eat This Design Foundation Inventory

Date: 2026-06-18
Linear: EAT-14

## Purpose

Create a shared UX map before visual changes. This is not a redesign spec yet.
It names the product surfaces, repeated UI patterns, and current consistency
risks so token and component work can start from evidence.

## UX Surfaces By User Job

### 1. Discover what Eat This is

Primary screens:
- Home hub at `/` and `/en`
- Hub hero, nearby, new-on-map, Must Eats teaser, magazine, categories,
  Bezirke, packs, FAQ
- Navigation and burger drawer

Source areas:
- `nextjs/app/[locale]/(spa)/page.tsx`
- `nextjs/app/components/HubSection.tsx`
- `nextjs/app/components/HubHero.tsx`
- `nextjs/app/components/SiteNav.tsx`
- `nextjs/app/components/BurgerDrawer.tsx`
- `nextjs/app/components/Hub*.tsx`

Role in the product:
- First impression and brand promise
- Sets food-culture tone
- Routes users into map, restaurant detail, packs, news, and static pages

Design notes:
- Strongest brand surface.
- Poster/collage language is intentional and should stay.
- Hub CTA styling is partly centralized through broad selectors in
  `HubSection.module.css`, but this creates high override pressure.

### 2. Find a place to eat

Primary screens:
- Map canvas
- Floating search
- Category/filter header
- Restaurant list
- Locked preview rows and booster upsell
- Empty result state

Source areas:
- `nextjs/app/components/MapSection.tsx`
- `nextjs/app/components/map/MapSectionBody.tsx`
- `nextjs/app/components/map/MapListHeader.tsx`
- `nextjs/app/components/map/RestaurantList.tsx`
- `nextjs/app/components/map/MapListEmpty.tsx`
- `nextjs/app/components/map/map.module.css`

Role in the product:
- Core utility surface
- Lets users browse, search, filter, and understand trial vs paid access

Design notes:
- Map has its own dense visual system.
- The local system is valuable because map UX has different density needs than
  the home hub.
- Risk: hard-coded colors, shadows, radii, and clip paths make it feel like a
  separate app rather than a product mode.

### 3. Inspect a restaurant

Primary screens:
- Restaurant detail sheet
- Gallery and lightbox
- Favorite/heart states
- Opening, distance, price, category, contact, reservation, story, tip
- Inline pack/booster offer

Source areas:
- `nextjs/app/components/map/RestaurantDetail.tsx`
- `nextjs/app/components/map/RestaurantGallery.tsx`
- `nextjs/app/components/map/RestaurantGalleryLightbox.tsx`
- `nextjs/app/components/map/BoosterOfferInline.tsx`
- `nextjs/app/[locale]/restaurant/[slug]/page.tsx`
- `nextjs/app/[locale]/restaurant/[slug]/RestaurantDetail.module.css`

Role in the product:
- Converts map curiosity into confidence
- Gives enough editorial proof to pick a place or unlock more

Design notes:
- This is where utility and editorial voice meet.
- Needs the clearest component contract for sheet, action, image, meta, and
  story blocks.
- Standalone restaurant SEO pages must not be forced into the exact same layout
  as map sheets, but should share typography, meta, and action rules.

### 4. Reveal and collect Must Eats

Primary screens:
- Must Eat detail sheet
- Must Eat reveal overlay
- Locked/unlocked mini cards
- Profile Must Eats
- Hub Must Eats teaser

Source areas:
- `nextjs/app/components/map/MustEatDetail.tsx`
- `nextjs/app/components/map/MustEatDetailMobile.tsx`
- `nextjs/app/components/map/MustEatRevealOverlay.tsx`
- `nextjs/app/components/map/MustEatRevealOverlay.module.css`
- `nextjs/app/components/HubMustEatsTeaser.tsx`
- `nextjs/app/components/HubMustEatsTeaser.module.css`
- `nextjs/app/components/profile/ProfileMustEats.tsx`

Role in the product:
- Ownable game-like layer on top of restaurant discovery
- Main reason for account creation and repeat use

Design notes:
- The physical card metaphor is a distinctive asset.
- Must Eat states need a shared language across hub, map, reveal, and profile.
- Do not flatten the reveal/card system into generic cards.

### 5. Buy access

Primary screens:
- Hub pack cards
- Pack detail pages
- Checkout button and pending/error states
- Checkout success
- All Berlin upsell

Source areas:
- `nextjs/app/components/HubPacks.tsx`
- `nextjs/app/components/HubPacks.module.css`
- `nextjs/app/components/HubPackBuyButton.tsx`
- `nextjs/app/[locale]/pack/[slug]/page.tsx`
- `nextjs/app/[locale]/pack/[slug]/PackBuyButton.tsx`
- `nextjs/app/[locale]/pack/[slug]/PackDetail.module.css`
- `nextjs/app/[locale]/checkout/success/page.tsx`
- `nextjs/app/[locale]/checkout/success/success.module.css`

Role in the product:
- Paid conversion path
- Must communicate trust without losing the Eat This attitude

Design notes:
- Pack surfaces already have a coherent physical/card direction.
- Checkout success appears quieter and should still feel connected to the pack
  purchase journey.
- Button states should be standardized before screen-level polish.

### 6. Sign in and return

Primary screens:
- Login page
- Login modal
- Welcome modal
- Magic-link sent state
- Google login state
- Legal links inside auth flow
- Profile auth guard

Source areas:
- `nextjs/app/[locale]/login/page.tsx`
- `nextjs/app/components/LoginPanel.tsx`
- `nextjs/app/[locale]/(spa)/BridgeAuth.tsx`
- `nextjs/app/components/CookieConsent.tsx`
- `nextjs/app/components/profile/ProfileAuthGuard.tsx`
- `nextjs/app/components/profile/ProfileShell.tsx`

Role in the product:
- Trust and identity
- Saves revealed Must Eats and entitlements

Design notes:
- Login uses a distinctive framed panel and conversion illustration.
- It should share form, CTA, loading, legal-link, and error language with packs
  and profile.
- Legal links need to feel inline with signup, not like leaving the flow.

### 7. Read and trust

Primary screens:
- News/article pages
- Static pages: about, contact, press, impressum, datenschutz, agb
- Footer
- Breadcrumbs
- Not found/error surfaces

Source areas:
- `nextjs/app/components/NewsArticleShell.tsx`
- `nextjs/app/components/StaticPages.tsx`
- `nextjs/app/components/SiteFooter.tsx`
- `nextjs/app/components/Breadcrumbs.tsx`
- `nextjs/app/not-found.tsx`
- `nextjs/app/global-error.tsx`

Role in the product:
- SEO, trust, legal, and editorial depth

Design notes:
- These surfaces should be calmer than the hub.
- They still need shared page, type, link, card, and footer rules.
- Static pages must keep unique SSR content per route.

## Repeated UI Patterns To Standardize

### Navigation

Patterns:
- Fixed site nav
- Map-specific floating nav/chips
- Burger drawer
- Skip link

Needed contract:
- Active state
- Mobile map exception
- Hit target minimums
- Focus state
- Light-only behavior

### CTA

Patterns:
- Home CTA pills
- Pack purchase CTA
- Login primary CTA
- Map booster CTA
- Text link CTA
- Disabled/loading/error CTA

Needed contract:
- Primary, secondary, text, destructive, disabled, loading
- Icon direction and placement
- Motion on hover/press
- One button height scale
- One accessible focus style

Current risk:
- Hub CTAs are normalized through broad class-name selectors and many
  `!important` rules.

### Cards

Patterns:
- Hub restaurant/story cards
- Pack cards
- Restaurant list cards
- Must Eat cards
- Profile saved-item cards
- Static/editorial cards

Needed contract:
- Editorial card
- Utility/list card
- Product/pack card
- Physical card
- Locked/blurred card
- Empty/loading card

Current risk:
- Radius, shadow, background, border, and image behavior vary by local CSS.

### Chips And Tags

Patterns:
- Map filters
- Open/closed status
- District/category/price meta
- Pack badges
- Login/checkout labels

Needed contract:
- Filter chip
- Status chip
- Meta tag
- Price/pack tag
- Locked/access tag

Current risk:
- Some tags are real controls and some are labels, but visual treatment often
  overlaps.

### Sheets And Modals

Patterns:
- Map bottom sheet
- Desktop side panel
- Restaurant detail
- Must Eat detail
- Login modal
- Cookie/legal modals
- Image lightboxes

Needed contract:
- Sheet chrome
- Dismiss affordance
- Drag/swipe affordance
- Scroll behavior
- Back vs close semantics
- Overlay and focus trapping expectations

Current risk:
- Similar containers use different visual rules and close affordances.

### Forms

Patterns:
- Login email input
- Signup inputs in pack/welcome flows
- Search input
- Filter controls

Needed contract:
- Default, focus, error, disabled, loading
- Placeholder style
- Helper/error copy placement
- Keyboard and mobile tap behavior

Current risk:
- Form controls are styled locally and do not yet share one conversion UX.

### Motion

Patterns:
- Hero copy entry
- CTA hover/press
- Drawer open/close
- Map sheet movement
- Must Eat reveal
- Card hover

Needed contract:
- Brand entry uses translate/rotate/clip/reposition, not opacity fades
- Product-state transitions can use opacity when not acting as entry/exit
  motion
- Reduced-motion fallback
- Motion duration/easing scale

## Intentional Brand Variation

Keep these differences:

- Home can be louder and more editorial than profile or checkout.
- Map can be denser and more utilitarian than home.
- Must Eat cards can be more physical/game-like than ordinary cards.
- Pack pages can be sales-forward and poster-like.
- Static/legal pages can be calmer and more text-led.
- Dark mode can be moody, but it should not invent separate component rules.

## Accidental Drift

These look like system drift rather than purposeful variation:

- Token definitions are duplicated between `app/globals.css` and
  `css/style.css`.
- Many shared visual values are hard-coded inside feature CSS modules.
- Radius language mixes sharp, 8px cards, 14px controls, pills, circles, and
  ad hoc values without a named scale.
- Home CTA unification currently depends on broad selectors and `!important`.
- Map UI repeats a separate palette/shadow/radius system that partially matches
  the brand but is not token-aligned.
- Form, disabled, loading, and error states do not yet have one product-wide
  contract.
- Checkout success is visually quieter than the pack purchase journey and needs
  a deliberate bridge.
- Static/editorial pages likely share fewer component contracts than Hub/Map.

## Initial CSS Inventory Signal

Code-level inventory from CSS files:

- CSS files reviewed: 49
- Frequent hard-coded colors include `#0a0a0a`, `#f0e8d0`, `#fff`,
  `#14100c`, `#fbf8ee`, `#100d0f`, `#f2dfb8`, `#e43d18`
- Frequent radii include `0`, `8px`, `999px`, `50%`, `14px`, `6px`, `4px`,
  `10px`, `12px`
- Frequent font tokens include `--font`, `--font-poster`,
  `--font-ranchers`, `--font-chewy`, `--font-display`
- `clip-path` declarations: 40
- `!important` declarations: 260

Interpretation:
- The brand language is real, not absent.
- The design system should reduce accidental local decisions, not sterilize the
  app.
- Token and component work should focus first on repeated controls and
  containers, then screen polish.

## Visual Evidence Pass

Screenshots captured from local dev server on 2026-06-18:

- `/tmp/eat-this-design-audit/01-home-desktop.png`
- `/tmp/eat-this-design-audit/02-home-mobile.png`
- `/tmp/eat-this-design-audit/03-map-desktop.png`
- `/tmp/eat-this-design-audit/04-map-mobile.png`
- `/tmp/eat-this-design-audit/05-login-mobile.png`
- `/tmp/eat-this-design-audit/06-pack-mobile.png`

Notes:

- Home desktop has strong brand presence and clear top-level navigation. The
  cookie consent appears early and blocks the next content section, so overlays
  need a product-wide priority and placement contract.
- Home mobile confirms the brand direction is rich and distinctive. It also
  shows the strongest component drift: many cards, chips, CTAs, labels, and
  section treatments appear in quick succession.
- Map desktop loaded the list and controls, but the map canvas rendered as a
  flat yellow field during the screenshot window. This is either timing,
  MapLibre, tile, or local dev data behavior and should be tracked as an audit
  limit until reproduced interactively.
- Map mobile loaded correctly and shows the core tension well: useful map
  density plus highly expressive markers/cards. The cookie consent overlaps the
  restaurant list, again proving overlay priority is a real UX issue.
- Login mobile is already cohesive: strong conversion illustration, clear
  headline, form, Google option, and legal copy. The design task here is
  alignment of form/button/legal states with pack and welcome flows, not a full
  redesign.
- Pack mobile is visually strong and close to the desired system language. It
  should become one of the reference surfaces for product cards, price blocks,
  purchase CTA, trust text, and footer contrast.

Evidence limits:

- Screenshots were captured with the cookie consent visible. That is useful for
  overlay analysis but means some underlying content is partially blocked.
- Screenshots are a first pass only; they do not verify keyboard focus,
  screen-reader behavior, gesture physics, or live checkout/auth state changes.
- The map desktop canvas issue needs a focused reproduction pass before being
  treated as a design defect.

## Recommended Next Work

1. Start EAT-15 by defining the canonical token source and naming the core
   semantic tokens.
2. Start EAT-16 only after token names are accepted, so component contracts do
   not encode temporary colors or spacing.
3. Use Hub and Map as the first two implementation targets because they expose
   the most visible design-system tension.
4. Run a focused visual QA pass for map desktop canvas rendering and overlay
   priority once tokens/components are being applied.

## Definition Of Done For The Foundation

Eat This should feel like one product with different modes:

- Home: expressive and editorial
- Map: dense and usable
- Restaurant detail: confident and informative
- Must Eats: physical and collectible
- Packs/checkout: conversion-focused and trustworthy
- Login/profile: clear, calm, and still recognizably Eat This

The goal is coherence, not sameness.
