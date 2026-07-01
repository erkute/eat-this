# Eat This Component Contracts

Date: 2026-06-18
Linear: EAT-16
Depends on: EAT-14, EAT-15

## Purpose

Turn the design-token foundation into product UI rules.

Eat This should not become visually flat. These contracts are meant to preserve
the brand's physical, editorial, food-culture energy while making repeated
controls predictable across Home, Map, Packs, Login, Profile, and editorial
surfaces.

## Global Principles

### Coherence, Not Sameness

Home can be loud, Map can be dense, Packs can be sales-forward, and Profile can
be quieter. The shared contract is behavior, hierarchy, state, accessibility,
and token usage.

### Component Tokens First

New component styling should reach for:

- `--button-*`
- `--card-*`
- `--chip-*`
- `--sheet-*`
- `--input-*`
- `--color-*`
- `--radius-*`
- `--space-*`
- `--shadow-*`
- `--motion-*`

Screen CSS may override these only by declaring an intentional mode, for
example Home, Map, Conversion, or Editorial.

### Touch Targets

Interactive controls should be at least 44px tall on mobile unless the visible
control is paired with a larger invisible hit area.

### Motion

Entry/exit motion on brand-facing surfaces must not animate opacity. Use
translate, rotate, scale-and-translate, clip-path, mask, or repositioning.

Opacity is allowed for non-motion state changes: disabled states, hover tint,
loading overlays, modal backdrops.

## CTA Contract

### Variants

#### Primary CTA

Use for:
- Buy pack
- Sign up / send magic link
- Main map/pack conversion
- Unlock/reveal action

Rules:
- Strongest fill on the surface
- Uses `--button-primary-*`
- Minimum height: 52-56px
- Uses label/display type only when label is short
- May use hard poster shadow in Pack/Map modes
- Hover/press uses transform, not opacity

States:
- default
- hover
- active/pressed
- focus-visible
- loading
- disabled
- error-adjacent

#### Secondary CTA

Use for:
- Back to map
- Alternative auth action
- Learn more
- Non-primary navigation

Rules:
- Uses `--button-secondary-*`
- Can be outlined or surface-filled
- Lower contrast than primary, but still clearly interactive

#### Text Link CTA

Use for:
- Restaurant article link
- Legal links
- Secondary navigation
- Inline explanatory actions

Rules:
- Underline or clear arrow affordance
- Must have visible focus state
- Should not look like a chip unless it behaves like a chip/filter

#### Destructive Or Dismissive CTA

Use for:
- Decline cookies
- Close/remove style actions

Rules:
- Must not compete visually with purchase/signup primary CTA
- Avoid red if red is already the brand-positive action on that surface

### Current Migration Targets

- Home `homeCta` blanket rules in `HubSection.module.css`
- Pack `.cta` in `PackDetail.module.css`
- Login `.ctaPrimary` and `.ctaGoogle`
- Map `.btnPrimary`, `.btnPackPromo`, `.btnPromo`
- Cookie consent accept/decline buttons

## Card Contract

### Variants

#### Editorial Card

Use for:
- News
- Magazine
- Static page teasers

Rules:
- Image/content hierarchy first
- Less physical tilt than product cards
- Body type must remain readable

#### Product/Pack Card

Use for:
- Booster packs
- All Berlin
- Pack detail
- Purchase surfaces

Rules:
- Physical, collectible, sales-forward
- Can use hard shadows and poster layout
- Price and entitlement metadata must be clearly separated from CTA

#### Restaurant Card

Use for:
- Map list
- Category/Bezirk SEO pages
- Nearby/new-on-map modules

Rules:
- Image, name, district/category, opening/distance status
- Status labels should map to `--color-success`, `--color-danger`, or neutral
- Tap area is the whole card when card opens detail
- Locked restaurant card must remain legible as locked, not just blurred

#### Must Eat Card

Use for:
- Must Eat reveal
- Must Eat mini cards
- Hub teaser
- Profile collection

Rules:
- Physical-card metaphor is intentional
- Face-down/face-up states must be shared across Map, Hub, Profile
- Reveal/collect behavior can be more theatrical than ordinary cards

#### Sheet Card

Use for:
- Content blocks inside map detail sheets
- Inline booster blocks
- Login/profile content blocks

Rules:
- Must not feel like a nested card inside another card
- Use spacing, divider, or background contrast before adding more borders

### Current Migration Targets

- Map `.rcard`
- Hub pack cards
- Hub nearby/new-on-map cards
- Must Eat teaser cards
- Profile saved cards
- Category/Bezirk SEO cards

## Chip And Tag Contract

### Types

#### Filter Chip

Use for:
- Category
- Bezirk
- Cuisine
- Open now

Rules:
- Interactive
- Has selected, focus, hover, disabled states
- Must be distinguishable from passive tags

#### Status Chip

Use for:
- Open/closed
- Locked/unlocked
- Payment/status states

Rules:
- Passive unless it changes a filter
- Color must map to semantic state
- Do not rely on color alone

#### Meta Tag

Use for:
- District
- Cuisine
- Price
- Pack labels

Rules:
- Passive
- Lower visual weight than filter chips

## Sheet And Modal Contract

### Sheet

Use for:
- Map list bottom sheet
- Map detail side/bottom sheet
- Must Eat detail

Rules:
- Drag handle visible on mobile when draggable
- Back vs close behavior must be clear
- Sheet movement uses `--ease-snap`
- Content scroll area is distinct from sheet drag area
- Desktop side panel and mobile bottom sheet share content hierarchy even when
  layout differs

### Modal

Use for:
- Login modal
- Cookie/legal modal
- Image lightbox
- Welcome modal

Rules:
- One clear dismiss affordance
- Focus should stay inside modal
- Backdrop tint may use opacity
- Modal content should not fight fixed nav or cookie consent
- Legal modal from signup should feel inline and state-preserving

### Overlay Priority

Observed issue:
- Cookie consent can block Home content and Map list content.

Priority order:
1. Critical auth/payment modal
2. Image/reveal lightbox
3. Map detail/list sheet
4. Cookie consent
5. Toasts

Cookie consent should avoid covering primary CTAs or active map/list controls
when possible.

## Form Contract

### Controls

Applies to:
- Login email
- Magic-link flow
- Welcome/signup
- Pack inline signup
- Map search
- Filters

Rules:
- Minimum 44px height on mobile
- Clear placeholder contrast
- Visible focus ring using `--input-focus-ring`
- Error copy appears close to the field
- Disabled/loading states do not collapse layout
- Keyboard type/autocomplete should match input purpose

### States

Required:
- default
- focus-visible
- filled
- invalid/error
- disabled
- loading/submitting
- success/sent

## Accessibility Contract

Every migration should check:

- Keyboard focus is visible
- Icon-only controls have labels
- Color-coded status has text
- Touch targets are large enough
- Dialogs/sheets do not trap scroll unexpectedly
- Motion has reduced-motion fallback
- Loading and error states are perceivable

Screenshot audits are not enough for accessibility signoff; keyboard and
screen-reader behavior need interactive QA.

## Dark Mode Contract

Dark mode should override semantic tokens, not duplicate whole component
systems.

Rules:
- Component structure stays the same
- Contrast stays readable
- Red remains action/brand energy
- Cream/ink remain text/surface anchors
- Do not create separate dark-only variants unless a surface truly needs it

## First Implementation Order

### 1. CTA And Form Slice

Why:
- Highest reuse across Home, Map, Login, Packs, Cookie, Profile
- Small enough to verify visually

Scope:
- Create shared token-backed CTA/form rules where low-risk
- Avoid changing layout or copy
- Remove only obviously redundant local values

### 2. Card Slice

Why:
- Cards drive Home, Map, Packs, Profile, SEO pages

Scope:
- Start with one card family, preferably Hub/Pack or Map list
- Preserve physical variation

### 3. Sheet/Modal Slice

Why:
- Map, Login, Cookie, Welcome, and lightboxes need clearer overlay priority

Scope:
- Define shared overlay z-index/placement behavior
- Revisit cookie consent placement after Map/Home verification

## Done Criteria For EAT-16

- CTA variants are defined
- Card variants are defined
- Chip/tag variants are defined
- Sheet/modal behavior is defined
- Form states are defined
- Accessibility and dark-mode expectations are included
- First implementation order is named

This document satisfies the contract step. The next practical ticket should be
a scoped implementation of CTA/form tokens across one or two surfaces.
