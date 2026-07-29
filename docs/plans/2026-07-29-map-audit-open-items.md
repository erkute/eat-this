# Map audit — open items

Leftovers from the mobile-Safari walkthrough of `/map` on 2026-07-28/29. The
fixes that shipped are in PRs #310, #312 and #313 (all merged to `main` via #311
and #314). This file is what did **not** ship, and why — written so a later
session can pick any item up without the original conversation.

Section 0 is a live regression and the only thing here that is actually broken.
Everything after it is a deliberate trade-off, a scaling risk that has not
bitten yet, or something that needs a real iPhone to judge.

---

## 0. Live regression — search field leaves the viewport on iPhone

**Reported on-device 2026-07-29, after #310–#315 shipped. Not reproducible in
the Chromium preview.**

Tap the magnifier on `/map` → the expanded search field scrolls up out of the
visible area, so you cannot see what you are typing.

### Already ruled out

`data-header-stuck` is **not** the cause. Opening search was measured in the
preview: `scrollY 0 → 204`, `stuck` stays `"-"`, toolbar sits at `top: 14` and
is fully in-viewport. The one-off 204 px jump from `revealListForSearch` does
not trigger the stuck state on any plausible iPhone height either — the
`scrollListToAnchor('mid')` target is `max(40, innerHeight - 440)`, which
always leaves the sentinel (~26 px below the sheet's top edge) below the
viewport top.

### Main suspect

`.mapSearchToolbar` was switched from `position: absolute` to
`position: fixed` on 2026-07-28 (`MapControls.module.css`, the
`@media (max-width: 767.98px)` block, together with `.mapBurger` and
`.mapSearchBtn`).

On iOS the layout viewport does not shrink when the keyboard opens — only the
visual viewport does, and Safari scrolls internally to keep the focused element
visible. Elements pinned to the top of the _layout_ viewport ride along and end
up above the visible area. That matches the symptom exactly, and it is
invisible in a desktop browser because there is no real keyboard.

So this is most likely a regression introduced by that change. The change
itself had a real reason — the magnifier and the burger drifted apart during
scroll because only two of the three were `fixed` — so reverting it alone
re-opens that bug.

### Constraints for the fix

- Magnifier, burger and toolbar must keep moving together. `mapCascade.test.ts`
  asserts they share a transform transition and retreat on the same
  `data-header-stuck` trigger; keep that true.
- The `visualViewport` API (`offsetTop`, `height`) is the usual lever: follow it
  with a transform rather than un-pinning the elements.
- Verify on a device. A desktop viewport cannot show this either way.

---

## 1. Needs a device, not a decision

### Smoke-test the shipped map changes on iPhone Safari

Everything below was measured in a Chromium-based preview. These behaviours
cannot be exercised there — and section 0 is what happens when that gap is left
open, so treat this as the reason the regression got out rather than as a
nice-to-have.

- **Search with the real keyboard.** ~~Not verified.~~ Verified on-device
  2026-07-29 and **it is broken** — see section 0. The per-keystroke scrolling
  is genuinely gone (field stays at `y=14` while typing), but the field itself
  leaves the viewport when the keyboard opens.
- **Location prompt on a device that has never granted.** Should show _no_
  dialog on load (`hasGeolocationPermission` gate). The preview reported
  `permissionState: "denied"`, i.e. only the returning-user path was exercised.
- **Standalone (Home Screen) status bar.** The paper-coloured cap is
  deliberately scoped to `data-view='list'` so the detail's photo hero has no
  white stripe over it (`MapSheet.module.css`). Never seen on-device.

If something looks wrong, start from the git log of `MapSection.tsx` and
`MapControls.module.css` around 2026-07-28.

---

## 2. Deliberately declined — do not "fix" without re-deciding

### Marker clustering

Four pins overlap within ~70 px in Mitte; the rearmost cannot be tapped.
**User decided to leave it** (2026-07-28) — turning pins into count bubbles
changes how the map reads as a brand surface. Revisit only as a design call,
not as a bug.

### Infinite reveal animations

`fdCardWiggle` and `fdRevealReadyShake` (`MapDetails.module.css`) run
`infinite` with `will-change: transform` on a large 3D-transformed card. They
are deliberate "tap me" affordances that have been iterated on. They sit on the
compositor, so the cost is smaller than it first looks. Capping them would
weaken a designed cue — a product decision, not a cleanup.

### Cookie banner covering the filter row

The consent bar bisects the filter chips on first load. Every fix either
changes consent behaviour (adding a scrim makes it more modal than intended —
a non-blocking banner is a deliberate GDPR posture) or requires wiring consent
state into the map. Cosmetic, one-time.

### Flattening `MapControls.module.css`

**Measured and rejected.** A generated flat version (117 blocks → 85) broke the
cascade: `.mapSearchToolbar { gap }` flipped 8px → 10px, because
`@media (max-width: 520px)` sits _before_ the media-less block in source order
and loses the tie until a merge moves it. Caught by diffing computed styles
across 24 states × 13 elements × 3 viewports — 96 of 1872 comparisons drifted.

Also: only **one** genuinely dead declaration exists, not the ~40 a first pass
suggested. That pass split grouped selectors without noticing a declaration can
be dead for `.mapSearchBtn` and still live for `.panelToggle` in the same
block. The duplication is mostly load-bearing.

The safety net instead is `mapCascade.test.ts`, which asserts _effective_
values across every block. If you do attempt the flatten anyway, the approach
that makes it tractable is: flatten, diff computed styles, fix each cascade
break, repeat until 0/1872.

### Dark mode

There is no `prefers-color-scheme` rule anywhere in `globals.css` or
`css/style.css` — the app is light-only, and the map hardcodes CartoDB Positron
(`LIGHT_STYLE` in `MapCanvas.tsx`) to match. Adding a dark basemap alone would
look broken: dark map under a paper-white sheet. This is a whole-app decision.
(`CLAUDE.md` gotcha #2 used to claim theme-aware backgrounds; corrected in
#312.)

---

## 3. Open work, no blocker

### Basemap paints after the markers

On first load the pins render as DOM before the vector tiles arrive — yellow
pins floating on white for a moment. Longer over mobile data. Wants either a
neutral placeholder or holding the markers until the first tile paints. Design
input needed on which.

### Marker set is not viewport-culled

`useMapFilters.displayedRestaurants` returns every match; there is no bounds
filter. Fine today (29 markers for the anon tier). At the premium tier — ~700
unlocked spots — that is 700 DOM markers MapLibre transforms every pan frame.
Not a bug yet; a wall to hit later.

### `/map` first-load JS is 327 kB

Heaviest route by a wide margin (next is 270 kB); shared baseline is 188 kB.
Not absurd for a MapLibre app, but it is the number to attack if mobile TTI
becomes a concern.

### Two touch targets below 44 px

Both are the _same_ trade, made knowingly:

- **Sheet handle** — grab zone widened from 26 px to ~31 px effective via a
  pseudo-element (`MapSheet.module.css`). Padding was rejected because it
  pushes the whole sheet down, the "top-heavy" look the tight chrome exists to
  avoid. Bounded downward by the filter header.
- **Filter chip clear ×** — ~31×40, flush right so it cannot steal the
  neighbouring chip's taps (it did, before #312: hit area ran 8 px into
  "Bezirk").

The real constraint: an 84×44 chip cannot hold two 44 px targets. The clean fix
is a flex chip layout where label and × split the width — rejected because the
label would drop to ~52 px, and "Kreuzberg" already wraps at 84.

### Search reveal still jumps once

Opening search scrolls the list up ~204 px, once, instantly, before the input
takes focus. Intentional (typing into a hidden result list is worse), and the
per-keystroke scrolling is gone — but it is still a jump at the moment the
keyboard appears.

Measured as **not** the cause of the section 0 regression, but it happens at the
same moment, so re-check it once that fix lands: with the field staying put,
the jump may read differently than it does now.

---

## 4. Small, unowned

- **`aria-expanded` without `aria-haspopup`** on the filter chips
  (`MapListHeader.tsx`). They open a dialog; the relationship is not announced.
- **`MapDetails.module.css` is 4700+ lines.** Not audited. Given what
  `MapControls.module.css` turned out to contain, assume similar traps —
  and note that flattening is not the answer there either (see above).

---

## 5. Not code — waiting on a human

- **Publish the Sanity draft** for restaurant `5310ecbd-4c43-43ab-ba69-a805c983550a`:
  `"Kolo Coffee "` → `"Kolo Coffee"` (trailing space). Corrected in the draft on
  2026-07-29, not published.
- **`git config core.hooksPath .githooks`** once per clone / machine. The
  pre-push hook is versioned now, but git only looks there when told. Without
  it, the old un-patched copy in `.git/hooks/` runs and skips the build on the
  first push of every new branch.

---

## Context worth keeping

**The recurring failure mode in this codebase is a later CSS rule silently
voiding an earlier one.** It happened four times in one session — the
transition shorthand dropping `transform`, `filter: none` erasing the icon
halo, the active-chip colour, and the long-label font size. All four are now
pinned by `mapCascade.test.ts`, which asserts effective values rather than
individual blocks. **Add a case there when you find the fifth.**

**Measuring in the preview browser has a trap.** The tab intermittently runs
with `visibilityState: "hidden"`, where `requestAnimationFrame` does not tick
and IntersectionObserver delivers no callbacks. That looks exactly like a
broken observer. Take a screenshot first to front the pane, then measure.
