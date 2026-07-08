# Eat This Design Token Contract

Date: 2026-06-18
Linear: EAT-15
Depends on: EAT-14

## Purpose

Define the first design-token contract for Eat This before refactoring CSS or
restyling screens.

This document is intentionally a contract, not an implementation patch. The
next code change should be small: introduce/align tokens first, then migrate
components in visible slices.

## Design System v0

This is the practical source of truth for current Eat This UI work. It reflects
the live Home/Profile direction and should guide small redesign tasks before a
larger component-library pass exists.

### Colors

Use the light-only print palette from `nextjs/app/globals.css`.

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Paper | `--et-home-paper` | `#fff` | Main surfaces, profile paper, modal paper |
| Ink | `--et-home-ink` | `#15120e` | Primary text, black buttons, strong structure |
| Accent | `--et-home-accent` | `#ffc600` | Selected states, secondary/positive CTAs, small punch |
| Red | `--et-home-red` | `#d9382a` | Destructive actions, hover heat, important warnings |
| Quiet | `--et-home-quiet` | `#f2f1ef` | Soft controls, inactive cards, subtle panels |
| Photo Rest | `--et-home-photo-rest` | `#eceae6` | Empty image beds and quiet media backgrounds |
| Muted Text | `--et-home-muted` | `rgba(21, 18, 14, 0.64)` | Helper copy, captions, secondary metadata |
| Line | `--et-home-line` | `rgba(21, 18, 14, 0.2)` | Functional borders only, not decorative lines |
| Warm Panel | `--et-home-panel-warm` | `#fff4cc` | Empty states and gentle explanatory panels |
| Inverse Text | `--et-home-inverse-text` | `#fff` | Text on ink/red buttons |

Rules:

- Keep the app light-only.
- Use color for state and hierarchy, not background decoration.
- Avoid decorative divider lines on brand/editorial surfaces; use spacing,
  type scale, image scale, and solid surfaces instead.
- Do not introduce one-off colors when an existing token covers the job.

### Fonts

Use a small set of roles instead of choosing fonts per component.

| Role | Token | Use |
| --- | --- | --- |
| Display | `--et-font-display` | Headlines, section titles, card titles, named objects |
| Label | `--et-font-label` | Kicker labels and short UI labels when display rhythm is wanted |
| Mono | `--et-font-mono` | Technical metadata only: IDs, compact stats, timestamps, tiny map/profile labels |
| Condensed | `--et-font-condensed` | Special editorial/impact moments only |

Rules:

- Buttons and CTAs use `--et-font-display`, compact size, strong weight, no
  exaggerated letter spacing, and no forced uppercase unless the local component
  already proves it needs that poster treatment.
- Character names, pack names, restaurant names, and other user-facing object
  names should use display type, not mono.
- Mono is for metadata, never for warm user-facing names like `Spot Scout`,
  `Spice Diva`, or `Chef Slice`.
- Body/legal/editorial paragraphs use the body stack when available; do not make
  long text carry the display voice.

### Buttons

Buttons should feel like Home buttons: compact, direct, and tactile.

| Variant | Background | Text | Typical use |
| --- | --- | --- | --- |
| Primary | `--et-home-ink` | `--et-home-inverse-text` | Apply, save, continue, sign out |
| Accent | `--et-home-accent` | `--et-home-ink` | Open, selected-friendly actions, positive CTAs |
| Danger/Hover | `--et-home-red` | `--et-home-inverse-text` | Remove, destructive hover, urgent action |
| Quiet | `--et-home-quiet` | `--et-home-ink` | Close, inactive, low-priority controls |
| Disabled Status | `--et-home-quiet` | muted ink | Non-clickable labels like `opened` |

Button rules:

- Use `border-radius: var(--et-radius-control, 7px)`.
- Use `font-family: var(--et-font-display)` and `font-size: var(--et-type-button, 13px)`.
- Keep `letter-spacing: 0`; do not use Mono, Moonblossom/Poster, or wide
  uppercase for buttons.
- Hover/press may translate upward slightly and change color; do not animate
  opacity for entry/exit motion.
- Icon-only controls should be compact symbols with accessible labels, not text
  pills pretending to be icons.

## Canonical Token Source

### Decision

`nextjs/app/globals.css` should own the canonical design tokens.

Reasons:

- It is imported by `nextjs/app/layout.tsx`, so it reaches all route groups.
- It already contains the most complete token set and theme overrides.
- It is the right place for pre-hydration-safe values such as page background,
  focus rings, theme colors, and critical overlay defaults.
- Several routes still load `nextjs/public/css/style.min.css`, generated from
  `nextjs/css/style.css`, but that file should not become the design authority.

### Rule

`nextjs/css/style.css` may mirror canonical tokens for SPA/global legacy CSS,
but it should not define competing token values.

When a shared token changes:

1. Change the canonical token in `nextjs/app/globals.css`.
2. Mirror only required aliases in `nextjs/css/style.css`.
3. Run `npm run build:css`.
4. Bump `CSS_VERSION` only if `nextjs/css/style.css` changed.

## Token Layers

Use four layers. This keeps brand vocabulary expressive while giving UI code
stable semantic handles.

### 1. Raw Brand Colors

Raw brand tokens describe the Eat This world. They should be few and stable.

Canonical six-color palette:

```css
--et-poster-red: #EF3528;
--et-print-black: #171A17;
--et-program-paper: #F1F1EC;
--et-ticket-grey: #B9BBB4;
--et-offset-grey: #6E716A;
--et-pressed-red: #B92820;
```

Compatibility:

- Keep existing `--et-red`, `--et-yellow`, `--et-cream`, `--et-black`, etc. as
  aliases during migration. The old yellow/cream names now point into the
  red-black-program-paper print system.
- New component work should prefer semantic tokens, not raw colors.

### 1a. Brand Color Roles

Raw colors are not enough for consistent UI/UX. Eat This colors need defined
jobs so every screen can use the brand palette for orientation, recognition,
and usability instead of decoration.

```css
--brand-stage;        /* program paper: readable UI canvas */
--brand-stage-bright; /* poster red: selected/active emphasis */
--brand-action;       /* poster red: primary action and brand punch */
--brand-action-hot;   /* poster red: hover heat without adding a 7th color */
--brand-action-deep;  /* pressed red: pressed states and depth */
--brand-paper;        /* program paper: warm readable surface */
--brand-ink;          /* print black: structure, contrast, trust */
--brand-night;        /* print black: inverse surface */
--brand-rule;         /* ticket grey: dividers and table rules */
--brand-muted;        /* offset grey: meta text and quieter hierarchy */
```

Usage:

- Use poster red when the interface asks for intent: buy, open, save,
  continue, or look here.
- Use program paper for reading comfort, list surfaces, forms, and editorial
  calm.
- Use print black for structure, borders, text, and confidence.
- Use ticket grey for rules and layout structure; use offset grey for metadata,
  timestamps, secondary labels, and less urgent helper text.
- Do not introduce new one-off brand colors unless they map to a named role or
  solve a documented accessibility problem.

### 2. Semantic Product Colors

Semantic tokens describe product roles, not brand names.

Proposed names:

```css
--color-page;
--color-surface;
--color-surface-raised;
--color-surface-inverse;
--color-text;
--color-text-muted;
--color-text-subtle;
--color-border;
--color-border-strong;
--color-action;
--color-action-hover;
--color-action-text;
--color-warning;
--color-success;
--color-danger;
```

Notes:

- Existing `--surface-*`, `--text-*`, `--border-*`, and `--accent-*` are close
  to this layer and should be rationalized, not discarded.
- Map-specific names may exist only when the map needs a genuine variant, not
  when it is merely repeating product colors.

### 3. Component Tokens

Component tokens translate semantic tokens into reusable UI contracts.

Proposed groups:

```css
--button-primary-bg;
--button-primary-text;
--button-primary-border;
--button-primary-shadow;
--button-secondary-bg;
--button-secondary-text;
--button-disabled-bg;
--button-disabled-text;

--card-bg;
--card-text;
--card-border;
--card-shadow;
--card-physical-shadow;

--chip-bg;
--chip-text;
--chip-border;
--chip-active-bg;
--chip-active-text;

--sheet-bg;
--sheet-text;
--sheet-border;
--sheet-handle;

--input-bg;
--input-text;
--input-border;
--input-placeholder;
--input-focus-ring;
--input-error;
```

Rule:

- Component CSS should use component tokens first.
- Screen CSS may override component tokens locally when the variation is
  intentional and named, for example a `pack` or `map` mode.

### 4. Motion, Shape, Space, And Type Tokens

These should be named because visual drift currently appears in radius, shadow,
font, and motion values.

#### Radius

Proposed scale:

```css
--radius-none: 0;
--radius-xs: 2px;
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 14px;
--radius-xl: 18px;
--radius-pill: 999px;
--radius-circle: 50%;
```

Usage:

- `none`: poster/sticker edges, physical pack cards, map cards when intentionally sharp
- `md`: compact UI cards
- `lg`: soft panels, modals, floating controls
- `pill`: CTAs and chips
- `circle`: icon-only circular controls

#### Shadow

Proposed scale:

```css
--shadow-none: none;
--shadow-soft: 0 10px 24px rgba(16, 13, 15, .12);
--shadow-lifted: 0 18px 38px rgba(43, 33, 28, .16);
--shadow-hard-sm: 2px 2px 0 currentColor;
--shadow-hard-md: 4px 4px 0 currentColor;
--shadow-physical-card: 10px 16px 16px rgba(70, 23, 16, .24);
```

Usage:

- Soft shadows for elevated surfaces
- Hard shadows for poster/card controls
- Physical-card shadow for Must Eat and pack art

#### Spacing

Proposed scale:

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

Usage:

- Components use fixed steps.
- Sections may use `clamp()` but should map to named ranges in comments or
  local custom properties.

#### Type

Existing role split is directionally right:

```css
--font-body: var(--font-dm-sans), 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
--font-display: var(--font-chewy, 'moonblossom'), sans-serif;
--font-label: var(--font-poster, var(--font-display));
```

Rules:

- Body copy, meta copy, legal copy, and long-form content use body.
- Brand headlines and expressive section heads use display.
- Labels, badges, and CTA text use label/display only when the text is short.
- Long button labels should not use oversized display type if it hurts fit.

#### Motion

Proposed tokens:

```css
--motion-fast: 120ms;
--motion-base: 180ms;
--motion-slow: 320ms;
--motion-reveal: 700ms;
--ease-standard: cubic-bezier(.2, .8, .2, 1);
--ease-out: cubic-bezier(.16, 1, .3, 1);
--ease-snap: cubic-bezier(.22, .61, .36, 1);
```

Rules:

- Brand-facing entry/exit motion must not animate opacity.
- Use translate, rotate, scale-and-translate, clip-path, mask, or
  repositioning for movement.
- Opacity is acceptable for non-motion state changes such as hover tint,
  disabled controls, modal backdrops, and loading overlays.
- Keep `prefers-reduced-motion` global override in `globals.css`.

## Mode Tokens

Some surfaces need controlled variation. Define modes by overriding component
tokens, not by inventing unrelated one-off values.

### Home Mode

Purpose:
- Expressive, editorial, poster/collage

Allowed:
- Larger display type
- Physical/rotated cards
- More expressive CTAs
- Strong red/yellow/cream contrast

Not allowed:
- Broad `!important` catch-all rules as the long-term system
- CTA variants that do not map back to primary/secondary/text contracts

### Map Mode

Purpose:
- Dense, useful, map-first

Allowed:
- Sharper cards
- Compact filter controls
- Map marker art and physical Must Eat card peeks
- Bottom-sheet-specific movement

Not allowed:
- A separate ungoverned palette
- Status colors that do not map to success/danger/warning/action roles
- Overlay behavior that hides primary map/list actions without priority rules

### Conversion Mode

Purpose:
- Login, pack purchase, checkout success, welcome

Allowed:
- Strong illustration/art
- Direct CTA hierarchy
- Trust and legal copy

Not allowed:
- Separate form/error/loading visual language per route

### Editorial Mode

Purpose:
- News, static pages, legal, SEO pages

Allowed:
- Calmer surfaces
- More body-text-led hierarchy

Not allowed:
- Looking like a separate site or generic document template

## Migration Order

### Phase 1: Declare aliases

Add the new canonical token names to `globals.css` as aliases to existing
values. Do not change visual output.

Goal:
- Make future component work readable without visual risk.

### Phase 2: Replace local hard-coded values in one slice

Start with CTAs and inputs because they cross Home, Map, Login, Pack, and
Profile.

Goal:
- Reduce drift in high-frequency controls.

### Phase 3: Align cards and sheets

Move restaurant list cards, pack cards, Must Eat cards, and sheets onto
component tokens.

Goal:
- Preserve intentional surface differences while making shared behavior obvious.

## First Implementation Slice

Recommended first code PR:

1. Add token aliases in `nextjs/app/globals.css`.
2. Mirror only necessary aliases in `nextjs/css/style.css`.
3. Do not migrate component CSS yet.
4. Run `npm run build:css`.
5. Verify screenshots show no intentional visual change.

This gives the project a stable vocabulary before we touch visible UI.

## Open Questions

- Should the product keep both `--surface-*` and new `--color-*` names, or
  should `--surface-*` remain the semantic layer to reduce churn?
- Should Map marker/status colors use the global semantic `success/danger`
  roles or keep map-prefixed aliases that point to those roles?
- Should `--font-poster`, `--font-ranchers`, and `--font-display` be collapsed
  further, or kept as compatibility aliases until component migration is done?
