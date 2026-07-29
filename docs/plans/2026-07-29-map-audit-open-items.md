# Map audit — open items

Working document for the mobile-Safari audit of `/map` that started 2026-07-28.
**Rewritten 2026-07-29** after everything below the line shipped: the resolved
items are compressed to one line each, the reasoning that is still load-bearing
was kept, and the rest was deleted.

Everything here is either open work or a decision you would otherwise re-derive.

---

## Shipped (all on `main` as of 2026-07-29)

| What                                                                        | PR   |
| --------------------------------------------------------------------------- | ---- |
| iOS keyboard pushed the search field off screen — `--map-visual-offset-top` | #319 |
| Markers held until the basemap paints, then dropped in                      | #319 |
| `aria-haspopup="dialog"` on the filter chips                                | #319 |
| `scripts/audit-css-cascade.mjs` + the MapDetails/MapFilters audit           | #319 |
| Opening search no longer moves the list                                     | #321 |
| Cookie banner no longer covers the filter row                               | #321 |
| MapFilters: 83 dead cascade declarations deleted, 0 computed-style change   | #321 |

Two of those carry reasoning worth keeping, below: the keyboard mechanism
(section 4) and the cascade method (section 3).

---

## 1. Open — needs a device

### Standalone (Home Screen) status bar

The only smoke-test item never exercised, and it **cannot** be checked in a
browser tab: `env(safe-area-inset-top)` measures **0** there — the search
button's client rect reads exactly its `top` value of `14` — so the paper cap
collapses to nothing. Needs a real Add-to-Home-Screen; the Simulator's Safari
toolbar does not accept synthetic taps.

Check both views in one pass: the list should show the paper cap, the detail's
photo hero should have **no** white stripe over it
(`.list[data-view='list'][data-header-stuck='true']::before`,
`MapSheet.module.css`).

**And check it with the keyboard open**, because that cap is
`position: fixed; top: 0` — structurally the same thing that broke the search
field (section 4). It only renders while the header is stuck, so
keyboard-open-while-stuck is the only window. Deliberately not changed blind.

---

## 2. Open — needs a decision from you

### Marker clustering

Four pins overlap within ~70 px in Mitte; the rearmost cannot be tapped.
Declined 2026-07-28 because count bubbles change how the map reads as a brand
surface. **The open question is not whether but what a cluster looks like** — a
design call, not a bug. Re-opened by the user 2026-07-29 and still unanswered.

### Dark mode

Re-opened 2026-07-29. Before anyone starts, the size of it: **564 hardcoded hex
values across 53 CSS files** (65 distinct), plus 18 in TSX inline styles, plus a
dark basemap (the map hardcodes CartoDB Positron, `LIGHT_STYLE` in
`MapCanvas.tsx`), plus the paper-white sheet that then no longer fits. There is
no `prefers-color-scheme` rule anywhere today. This is its own project with its
own design round, not an item on a list.

### Flattening `MapControls.module.css`

Re-opened 2026-07-29, and the recommendation is still **don't** — but the
reasoning has changed. The value was readability _and_ finding dead rules.
`scripts/audit-css-cascade.mjs` now delivers the finding half with zero risk,
while the measured cost is unchanged: a generated flat version broke the
cascade in 96 of 1872 computed-style comparisons. High price, most of the value
already collected elsewhere.

---

## 3. Open — the cascade work, and how to do it safely

`scripts/audit-css-cascade.mjs` reports declarations that a later rule silently
voids. Validated: it independently rediscovers `.mapSearchToolbar { gap }`
10px → 8px, the dead declaration this document already recorded by hand.

```bash
node scripts/audit-css-cascade.mjs app/components/map/MapDetails.module.css
```

| module           | findings | status                                                     |
| ---------------- | -------- | ---------------------------------------------------------- |
| `MapFilters`     | 118      | **done** — 83 declarations deleted, 0 diff in 10 725 cells |
| `MapDetails`     | 104      | open                                                       |
| `MapControls`    | 26       | open — **and it bit, see below**                           |
| `RestaurantList` | 19       | open                                                       |

### The decision, already made: delete, do not resurrect

A dead declaration is evidence of an **older design**, not a bug in the current
one. The values that ship are the ones the design has been iterated against —
`.filterChip` had been restyled at least four times, and the losers included a
9 px chip from a much smaller earlier version. Making losers win would change
small-phone _and_ desktop rendering in dozens of places at once.

### The method — do not skip any of it

1. **Snapshot computed styles first.** Elements × properties × viewports ×
   **states**. For `MapControls` the states are the data attributes the
   stylesheet keys off — drive `data-map-view` / `data-map-snap` /
   `data-header-stuck` / `data-panel-hidden` directly on `[data-map-body]`
   rather than through the UI; that is the 24-state matrix.
2. **Mount probe elements for classes the live DOM never shows.** The filter
   picker is not in the DOM when closed; the status toast auto-dismisses. A
   `<div>` carrying the hashed class name exercises exactly the same rules.
   Without this the sweep silently skips those removals.
3. **Only remove a declaration that is dead for _every_ class and context its
   rule produces.** A grouped selector can be dead for `.filterChip` and still
   live for `.filterChipActive`. Of 113 dead entries in MapFilters only 57
   declarations qualified. **This is precisely what the earlier flattening
   attempt got wrong.**
4. **Diff must be 0.** Then pin what matters in `mapCascade.test.ts`.

A one-off pruner implementing 3 lives in the session scratchpad, not in the
repo — it is too sharp to leave lying around. Rebuild it from
`audit-css-cascade.mjs`; the logic is the same minus the reporting.

### ⚠ MapControls: the net caught something — resolve this first

A bulk prune of MapControls' 19 removable declarations produced **24
computed-style differences at 320 px**: `.mapStatusLayer` and
`.mapStatusLayerError` moved from `translateY(0)` to `translateY(-162px)` /
`-130px`, across every one of the 24 states.

Reverted immediately, unresolved. Two candidate explanations, and it matters
which:

- **A real cascade change** the pruner caused. None of the 19 removals touches
  `transform`, so this would have to be an ordering or empty-rule-cleanup
  effect — worth understanding before trusting the pruner on MapDetails.
- **A measurement artefact.** The _after_ value is what the stylesheet says
  should apply at 320 px (the phone block at ~861 sets
  `translate(-50%, calc(-100% - 70px))` and sits after the media-less
  `translateX(-50%)` at ~791). So the suspicious number is the **baseline**,
  which suggests the 320 px baseline was captured before the browser
  re-evaluated media queries after `resize_window`.

Settle it by re-capturing the MapControls baseline with a settle delay after
each resize, and by verifying the baseline value against the stylesheet before
trusting it. **Do not prune MapDetails until this is understood** — the same
harness produced the MapFilters result and its credibility rests on this.

---

## 4. Context worth keeping

**A fixed surface with an input is not automatically broken by the iOS
keyboard.** iOS does not shrink the layout viewport; it slides the _visual_
viewport down inside it (`visualViewport.offsetTop`). Safari rescues anything
it can reposition — the login modal and the Remy chat were both tested on
device and are fine. What it cannot rescue is an element that **is itself the
fixed anchor with a hard `top`**: there is nothing around it to scroll. That
was `.mapSearchToolbar`, and it is why the map was the only casualty.

**The recurring failure mode is a later CSS rule silently voiding an earlier
one.** Four instances are pinned in `mapCascade.test.ts` (transition shorthand
dropping `transform`, `filter: none` erasing the icon halo, the active-chip
colour, the long-label font size). Section 3 is the industrialised version of
the same problem.

**Not every phone bug is a cascade bug.** The keyboard regression looked exactly
like one — three controls leaving the top edge together is the signature of the
`data-header-stuck` retreat — and it was not. Reading the attribute live on the
device settled it in one screenshot; reasoning about the stylesheet would not
have.

**The Chromium preview cannot see anything the software keyboard causes.**
`visualViewport.offsetTop`, `position: fixed` anchoring and
`env(safe-area-inset-top)` all behave differently. An iPhone simulator is real
WebKit and cheap:

```bash
xcrun simctl boot <udid>
defaults write com.apple.iphonesimulator ConnectHardwareKeyboard -bool false
open -a Simulator          # then Safari → http://localhost:3000/map
```

**That `defaults write` is not optional.** The Simulator attaches the Mac's
hardware keyboard by default, a focused input then raises only the accessory
bar, and the entire bug class is invisible. Set it back to `true` afterwards.

**Instrument, then screenshot.** The fastest way to get numbers off a simulator
is a temporary fixed overlay printing `scrollY`, `innerHeight`,
`visualViewport.height/offsetTop/pageTop`, the relevant data attribute and the
element's `getBoundingClientRect().top`, behind a query param. Put it at
`top: 38%` — at `bottom: 0` the keyboard covers the readout you need.

**Measuring in the preview browser has a trap.** The tab intermittently runs
with `visibilityState: "hidden"`, where `requestAnimationFrame` does not tick
and IntersectionObserver delivers no callbacks. That looks exactly like a broken
observer. Screenshot first to front the pane, then measure.

---

## 5. Still open, no blocker, no decision needed

- **Marker set is not viewport-culled.** `useMapFilters.displayedRestaurants`
  returns every match. Fine at 29 markers; ~700 at the premium tier is the wall.
  The first-load drop-in already caps its stagger at 14 steps for this reason.
- **`/map` first-load JS is 327 kB.** Heaviest route (next is 270 kB, shared
  baseline 188 kB). Not absurd for MapLibre; the number to attack if mobile TTI
  becomes a concern.
- **Two touch targets below 44 px** — sheet handle (~31 px effective) and the
  filter chip clear × (~31×40). Both are the same knowing trade: an 84×44 chip
  cannot hold two 44 px targets, and the clean flex fix drops the label to
  ~52 px where "Kreuzberg" already wraps. Only revisit as a design call.
- **Remy chat scrim leaves a gap.** With the keyboard up the scrim (`inset: 0`,
  i.e. the layout viewport) rides up and leaves the strip between panel and
  keyboard untinted. Cosmetic, only while typing.

---

## 6. Not code — waiting on a human

- **Publish the Sanity draft** for restaurant
  `5310ecbd-4c43-43ab-ba69-a805c983550a`: `"Kolo Coffee "` → `"Kolo Coffee"`.
  Corrected in the draft 2026-07-29, not published.
- **`git config core.hooksPath .githooks`** on your other machines. Set on this
  one. Without it git runs the un-patched copy in `.git/hooks/` and skips the
  build on the first push of every new branch.
