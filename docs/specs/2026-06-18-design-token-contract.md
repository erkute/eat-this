# Eat This Design Token Contract

Date: 2026-06-18
Last updated: 2026-07-08
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
the local site at `http://localhost:3000/` as of 2026-07-08 and should guide
small redesign tasks before a larger component-library pass exists.

### Visual North Star

Eat This is a light, print-like food product: white paper, almost-black ink,
yellow action accents, red heat, real food/pack imagery, and Providence type.
The UI should feel like an editorial city-food dossier that happens to be
interactive, not like a generic SaaS dashboard.

Current live signals:

- Home is the main visual source of truth.
- Navigation is ink-black with white sticker-like words.
- Cards are mostly flat; imagery and typography carry the character.
- Desktop pack/category grids use five columns.
- Mobile pack/category sections become swipe rails or tight two-column grids.
- Profile uses a paper dossier layer on top of the same Home tokens.
- Map is the dense utility mode and may be more compact, but it still inherits
  the same ink/paper/yellow/red vocabulary.

### Colors

Use the light-only print palette from `nextjs/app/globals.css`. The live palette
is intentionally narrow.

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Paper | `--et-home-paper` | `#fff` | Main page canvas, modals, profile paper, content surfaces |
| Ink | `--et-home-ink` | `#15120e` | Text, nav background, primary Home CTAs, strong structure |
| Yellow | `--et-home-accent` | `#ffc600` | Login/auth CTA, selected states, small status punch |
| Red | `--et-home-red` | `#d9382a` | Pack purchase CTA, destructive/hover heat, warnings |
| Quiet | `--et-home-quiet` | `#f2f1ef` | Soft controls, inactive cards, profile page background |
| Photo Rest | `--et-home-photo-rest` | `#eceae6` | Image placeholders and restaurant-card beds |
| Rule | `--et-home-rule` | `#e4e1dc` | Rare functional rules on utility surfaces only |
| Muted Text | `--et-home-muted` | `rgba(21, 18, 14, 0.64)` | Helper copy, captions, secondary metadata |
| Line | `--et-home-line` | `rgba(21, 18, 14, 0.2)` | Functional borders only, not decorative lines |
| Warm Panel | `--et-home-panel-warm` | `#fff4cc` | Empty states and gentle explanatory panels |
| Inverse Text | `--et-home-inverse-text` | `#fff` | Text on ink/red buttons |

Rules:

- Keep the app light-only.
- Default to paper and ink. Yellow and red should feel earned.
- Use yellow for selected, friendly, login, and positive action moments.
- Use red for pack purchase, destructive action, warnings, and hover heat.
- Use color for state and hierarchy, not background decoration.
- Avoid decorative divider lines on brand/editorial surfaces; use spacing,
  type scale, image scale, and solid surfaces instead.
- Do not introduce one-off colors when an existing token covers the job.
- Avoid beige/cream drift. The current site is white paper, not a tan paper
  system.

### Fonts

Use a small set of roles instead of choosing fonts per component. The local site
currently reads as Providence-led.

| Role | Token | Use |
| --- | --- | --- |
| Body | `--font-body` / `--font` | Long paragraphs, legal copy, utility descriptions |
| Display | `--et-font-display` | Hero headlines, section titles, card titles, named objects |
| Label | `--et-font-label` | Kicker labels and short UI labels when display rhythm is wanted |
| Mono | `--et-font-mono` | Technical metadata only: IDs, compact stats, timestamps, tiny map/profile labels |
| Condensed | `--et-font-condensed` | Nav stickers, map/menu words, special impact moments only |

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
- Big brand headings can be uppercase with tight line-height and slight negative
  tracking. Compact UI controls should keep `letter-spacing: 0`.
- Condensed type is a spice, not the meal: use it for nav stickers and strong
  menu words, not for ordinary buttons or cards.

### Buttons

Buttons should feel like Home buttons: compact, direct, tactile, and flat.

| Variant | Background | Text | Typical use |
| --- | --- | --- | --- |
| Primary | `--et-home-ink` | `--et-home-inverse-text` | Home/map CTAs, apply, save, continue |
| Accent | `--et-home-accent` | `--et-home-ink` | Login/auth, selected-friendly actions, positive CTAs |
| Commerce/Hot | `--et-home-red` | `--et-home-inverse-text` | Pack purchase, destructive hover, urgent action |
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
- Buttons are borderless by default. Use inset/outline only for inputs, selected
  cards, or accessibility focus.
- Primary Home buttons may be larger in hero contexts (`min-height` around
  52-62px), but ordinary controls should stay compact.

### Shape, Depth, And Surfaces

| Token | Live value | Use |
| --- | --- | --- |
| `--et-radius-control` | `7px` | Buttons, chips, inputs, compact controls |
| `--et-radius-photo` | `10px` | Restaurant photos, saved spots, media cards |
| `--radius-xs` / local `2px` | `2px` | Paper/dossier sheets and physical-print edges |
| `--et-shadow-none` | `none` | Default Home/card depth |
| Physical shadows | local drop-shadows | Cut-out pack art, avatars, physical cards |

Rules:

- Do not put cards inside cards.
- Brand/editorial pages should be mostly flat. Shadows are for physical objects
  like pack art, Polaroids, cut-outs, or dossier paper.
- Avoid gray framed boxes around repeated objects. Let image scale, spacing, and
  type do the work.
- Real media should be visible and inspectable; do not hide product/food/pack
  imagery behind decorative treatments.

### Layout Rules

- Page max width: use `--et-wrap-max` and `--et-wrap-pad`.
- Home desktop sections use wide grids and rails; mobile uses swipe rails or
  dense two-column grids depending on the object.
- Category and pack grids: desktop five columns; mobile swipe rail or two
  columns when the user is comparing owned objects.
- Saved spots: mobile two columns, desktop four columns.
- Profile packs: desktop five columns, mobile two columns.
- Fixed-format elements need stable dimensions through aspect-ratio, explicit
  grid rows, or fixed control sizes so labels and hover states do not shift
  layout.

### Component Rules

Navigation:

- Site nav is ink-black with white wordmarks/stickers.
- `MAP` and `MENÜ` may use condensed impact type.
- Drawer items use Providence, large uppercase, and yellow for the login CTA.

Cards:

- Restaurant/media cards use real images, `--et-radius-photo`, and white text
  over image overlays when needed.
- Pack cards are freestanding art objects. Do not put pack artwork on a
  rectangular backing unless a specific screen intentionally does that.
- Profile dossier cards may use paper texture/noise, but not decorative border
  rules.

Toasts:

- Toasts should match the compact locked-location style: small, black, direct,
  and not visually louder than the action that triggered them.

Profile:

- Profile is an editorial dossier mode grounded in Home tokens.
- Avatar/character selection uses display type for names.
- User-facing names should not be clipped with ellipses unless space is truly
  impossible.
- `All Berlin` is not shown in the profile pack grid; ownership still unlocks
  category packs logically.

Map:

- Map is the utility mode. It can be denser, use panels/sheets, and keep compact
  controls, but it should still inherit paper/ink/yellow/red.
- Map-only colors or shadows must point back to a named map token, not hard-code
  a parallel brand system.

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

Canonical live palette:

```css
--et-poster-red: #d9382a;
--et-print-black: #15120e;
--et-program-paper: #fff;
--et-ticket-grey: #15120e;
--et-offset-grey: #15120e;
--et-pressed-red: #15120e;

--et-home-paper: #fff;
--et-home-ink: #15120e;
--et-home-accent: #ffc600;
--et-home-red: #d9382a;
--et-home-quiet: #f2f1ef;
--et-home-photo-rest: #eceae6;
```

Compatibility:

- Keep existing `--et-red`, `--et-yellow`, `--et-cream`, `--et-black`, etc. as
  aliases during migration.
- Historical `program-paper`, `ticket-grey`, and `offset-grey` names now resolve
  into the current white/ink system. Do not revive the old grey/beige palette
  unless there is a deliberate redesign.
- New component work should prefer semantic tokens, not raw colors.

### 1a. Brand Color Roles

Raw colors are not enough for consistent UI/UX. Eat This colors need defined
jobs so every screen can use the brand palette for orientation, recognition,
and usability instead of decoration.

```css
--brand-stage;        /* white paper: readable UI canvas */
--brand-stage-bright; /* red/yellow emphasis by local mode */
--brand-action;       /* red for commerce/heat, ink for primary Home buttons */
--brand-action-hot;   /* red hover heat without adding another brand color */
--brand-action-deep;  /* ink/pressed states and depth */
--brand-paper;        /* white paper surface */
--brand-ink;          /* print black: structure, contrast, trust */
--brand-night;        /* print black: inverse surface */
--brand-rule;         /* functional rules, usually ink with low opacity */
--brand-muted;        /* muted ink for captions and secondary hierarchy */
```

Usage:

- Use ink for default primary Home/profile actions.
- Use yellow for selected, login, positive, and friendly action states.
- Use red when the interface asks for heat: buy, remove, warn, or hover into a
  stronger state.
- Use white paper for reading comfort, list surfaces, forms, and editorial calm.
- Use print black for structure, borders, text, and confidence.
- Use low-opacity ink for rules and muted metadata; avoid full grey systems.
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

Existing role split should resolve to the live Providence-led system:

```css
--font-body: var(--font-dm-sans), 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
--font-providence: 'ff-providence-sans-web-pro-1', 'ff-providence-sans-web-pro-2', sans-serif;
--et-font-display: var(--font-providence, var(--font-display));
--et-font-label: var(--font-providence, var(--font-display));
--et-font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
--et-font-condensed: 'chauncy-pro-1', 'chauncy-pro-2', var(--font-anton), sans-serif;
```

Rules:

- Body copy, legal copy, and long-form content use body.
- Brand headlines, section heads, pack names, restaurant names, and character
  names use display.
- Labels, badges, and CTA text use label/display only when the text is short.
- Long button labels should not use oversized display type if it hurts fit.
- Mono is only for technical/meta labeling, never for warm object names.

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
- Strong ink/white/yellow/red contrast
- Real restaurant and pack imagery

Not allowed:
- Broad `!important` catch-all rules as the long-term system
- CTA variants that do not map back to primary/secondary/text contracts
- Beige/cream drift away from the current white-paper page

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
