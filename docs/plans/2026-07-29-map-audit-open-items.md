# Map audit — open items

Leftovers from the mobile-Safari walkthrough of `/map` on 2026-07-28/29. The
fixes that shipped are in PRs #310, #312 and #313 (all merged to `main` via #311
and #314). This file is what did **not** ship, and why — written so a later
session can pick any item up without the original conversation.

Section 0 is a live regression and the only thing here that is actually broken.
Everything after it is a deliberate trade-off, a scaling risk that has not
bitten yet, or something that needs a real iPhone to judge.

---

## 0. ~~Live regression — search field leaves the viewport on iPhone~~ FIXED

**Reported on-device 2026-07-29. Reproduced, root-caused and fixed the same
day** in an iPhone 16e simulator running iOS 26.3 — real WebKit with the real
software keyboard, which is what the Chromium preview could never show.

### What it actually was

Confirmed by instrumenting the live page and reading the numbers off the device
at the moment the keyboard came up:

```
scrollY 96   innerH 699
vv.h 362     vv.offsetTop 96   vv.pageTop 96
stuck -      snap mid
field toolbar top -82          ← 14 - 96
```

iOS does not shrink the layout viewport when the keyboard opens; it slides the
**visual** viewport down inside it (`visualViewport.offsetTop` 0 → 96) and keeps
the layout viewport at its full height. `position: fixed` anchors to the layout
viewport, so `top: 14px` put the toolbar 82 px **above** the visible area.
`getBoundingClientRect()` is measured against the visual viewport, which is why
the rect reads `-82` rather than `14`.

`data-header-stuck` stayed `"-"` throughout — the earlier preview measurement
was right to rule it out, and the retreat animation is **not** what hides the
field here. Nor is the 204 px `revealListForSearch` jump: in the repro it had
already returned early and `scrollY` moved only by the keyboard's own 96.

### The fix

`MapSection.tsx` publishes `--map-visual-offset-top` from
`visualViewport.offsetTop` (folded into the effect that already maintained
`--map-runtime-bar-overhang`, so there is still one listener set; both writes
are now change-guarded so a plain scroll does not force a style recalc).
`MapControls.module.css` adds it back onto the shared `top` of all three phone
controls, in the same `@media (max-width: 767.98px)` block that makes them
`fixed`.

It had to land on `top`, **not** `transform` — the retreat owns transform, and
`mapCascade.test.ts` pins that.

Verified on-device, same conditions:

| state                          | before              | after                                                         |
| ------------------------------ | ------------------- | ------------------------------------------------------------- |
| keyboard open (`offsetTop 96`) | toolbar top **-82** | toolbar top **14**                                            |
| typing                         | —                   | stays 14, tracks `offsetTop` back to 2 as the keyboard closes |
| `data-header-stuck='true'`     | -110                | **-110** (retreat intact, all three together)                 |

Pinned by a new case in `mapCascade.test.ts` which asserts all three resolve to
the _same_ `top` and that it carries the variable — verified to fail without the
CSS change.

### Where else this bites — swept 2026-07-29, and the answer is: nowhere

The obvious worry after this fix was "how many other surfaces have it". Every
`position: fixed` rule in the codebase with a top-ish anchor was listed, then
cross-referenced against the components that actually contain a text input —
without an input the keyboard never opens and the surface cannot be affected.

That leaves only two candidates, and **both were tested on the device and both
are fine**:

- **Login modal** (`LoginModalOverlay.overlay`, `inset: 0` + `place-items:
center`, contains the e-mail field). Safari scrolls the modal up itself; the
  focused field sits right above the keyboard.
- **Remy chat** (`buddy/BuddyWidget.panel`, on phones `fixed; top: 8px;
bottom: 8px`, with the composer pinned at its bottom edge behind
  `overflow: hidden`). Looked like the worse case on paper. Safari shifts the
  whole panel up; the composer stays visible above the keyboard.

Ruled out without a device test, because they contain no text input at all:
`AvatarPickerModal`, `SiteNav`, `MustEatsOnboarding`, `MapFilters.pickerBackdrop`,
`burger-drawer`. `CategoriesRail` has an e-mail field but is in normal flow.

**The rule this establishes — worth more than the sweep itself:** a fixed
surface with an input is _not_ automatically broken. Safari rescues anything it
can reposition. What it cannot rescue is an element that **is itself the fixed
anchor with a hard `top`** — there is nothing around it to scroll. That was
exactly `.mapSearchToolbar`, and it is why the map was the only casualty.

Minor artefact spotted while testing, not fixed: with the Remy keyboard up, the
scrim (`inset: 0`, i.e. the layout viewport) rides up with everything else and
leaves the strip between panel and keyboard untinted. Cosmetic, only while
typing in the chat.

### Still to check on the same mechanism

`.list[data-view='list'][data-header-stuck='true']::before` in
`MapSheet.module.css` — the status-bar cap — is also `position: fixed; top: 0`
and would slide up under the same conditions. It only exists in standalone
(`env(safe-area-inset-top)` is 0 in a browser tab, see section 1), and it only
renders while the header is stuck, so keyboard-open-while-stuck is the only
window. Deliberately **not** changed blind — check it during the standalone
pass rather than guessing, which is how this regression got made.

---

## 1. Needs a device, not a decision

### Smoke-test the shipped map changes on iPhone Safari

Everything below was measured in a Chromium-based preview. These behaviours
cannot be exercised there — and section 0 is what happens when that gap is left
open, so treat this as the reason the regression got out rather than as a
nice-to-have.

**An iPhone simulator closes most of this gap.** `xcrun simctl boot`, then
Safari on `http://localhost:3000/map` — real WebKit, real safe-area behaviour.
The one thing that needs setting up is the software keyboard: the Simulator
attaches the Mac's hardware keyboard by default, so a focused input raises only
the accessory bar and none of the visual-viewport behaviour happens.

```bash
defaults write com.apple.iphonesimulator ConnectHardwareKeyboard -bool false
```

then relaunch Simulator.app (⇧⌘K toggles it live). Without this step section 0
is invisible in the simulator too.

- **Search with the real keyboard.** ~~Not verified.~~ ~~Verified 2026-07-29 and
  broken~~ — **fixed and re-verified on-device 2026-07-29, see section 0.**
  Per-keystroke scrolling stays gone and the field now holds `top: 14` with the
  keyboard up.
- **Location prompt on a device that has never granted.** ✅ Verified
  2026-07-29 on a simulator after `xcrun simctl privacy <udid> reset location`:
  **no dialog on load**, and the deliberate tap on the locate FAB raises both
  the Safari and the per-site prompt as intended. Granting then auto-centres.
  The `hasGeolocationPermission` gate behaves exactly as documented.
- **Standalone (Home Screen) status bar.** Still open, and it genuinely cannot
  be checked in a browser tab: `env(safe-area-inset-top)` measures **0** there
  (the search button's client rect reads exactly `14`, its full `top` value), so
  the cap collapses to nothing — precisely what the comment in
  `MapSheet.module.css` claims. Needs a real Add-to-Home-Screen; the Simulator's
  Safari toolbar does not accept synthetic taps, so it is a manual one-off.
  Check both views in the same pass: list should show the paper cap, the
  detail's photo hero should have no white stripe. And see the note at the end
  of section 0 about that cap and the keyboard.
- **Scroll fades elsewhere.** ✅ Nothing left. Every stylesheet that ships was
  parsed for bottom-anchored gradient overlays and for `mask-image`; the six
  hits are all photo scrims on cards (`.sibCard::after`, `.inlineSpot::after`,
  `.spotCard::after`, `.photo::after`, `.ph::after`, plus one must-eat reveal),
  and the only `mask-image` occurrences are a comment and an explicit `none`.
  That covers News, Profile and Packs without needing to open them.

If something looks wrong, start from the git log of `MapSection.tsx` and
`MapControls.module.css` around 2026-07-28.

---

## 2. Deliberately declined — do not "fix" without re-deciding

### Marker clustering

Four pins overlap within ~70 px in Mitte; the rearmost cannot be tapped.
**User decided to leave it** (2026-07-28) — turning pins into count bubbles
changes how the map reads as a brand surface. Revisit only as a design call,
not as a bug.

### Infinite reveal animations — re-opened 2026-07-29, and there is nothing to win

`fdCardWiggle` and `fdRevealReadyShake` (`MapDetails.module.css`) run
`infinite` with `will-change: transform` on a large 3D-transformed card. They
are deliberate "tap me" affordances that have been iterated on. They sit on the
compositor, so the cost is smaller than it first looks. Capping them would
weaken a designed cue — a product decision, not a cleanup.

Re-examined on the theory that the real cost was the `will-change` rather than
the `infinite`, and that it could therefore be dropped with no visual change.
**That theory is wrong.** Both declarations sit on the _same element that is
already animating forever_ — a running transform animation promotes the element
to its own compositor layer regardless, so the `will-change` is redundant, not
expensive. Removing it would change nothing measurable.

The one genuine instance of the classic misuse is `.fdTopCard` (line ~332):
`will-change: transform` with `transform: translateX(0)` and no animation at
all. But it is the swipe-pager's card, transformed by JS on drag, which is
precisely the case `will-change` exists for — hinting _before_ the change. Left
alone: there is no measurement showing it costs anything, and removing it could
cost a frame at drag start. **Deliberately not changed on a hunch.**

### ~~Cookie banner covering the filter row~~ FIXED

Reproduced on-device first, and the old description understated it: the banner
did not "bisect" the chips, it hid **the entire filter row** — on a phone the
sheet rests at 28 dvh and the bar is fixed to `bottom: 0`, so it covered the
whole resting sheet.

Fixed 2026-07-29 **without touching consent behaviour** — no scrim, no
modality, no consent state wired into the map. `CookieConsent` publishes its own
measured height as `--consent-bar-h` on `<html>` while the bar is up (via
`ResizeObserver`, so expanding "Mehr erfahren" keeps it in step) and removes it
on dismiss. `MapLayout` adds it to `--phone-list-sheet-visible`, which lifts the
sheet's resting stop — and with it the chips, the locate FAB, the status toast
and the MapLibre attribution, all of which key off that one variable.

Two things that make this safe rather than clever:

- **The drag stops follow automatically.** `useHandleScrollDrag` feeds
  `snapOffsets` a _measured_ sheet top; `LIST_REST_VISIBLE_DVH` is only the
  fallback estimate. The one consumer that does not follow is the flyTo padding
  estimate (`phoneListPeek` in `MapSection`), off by the bar height while the
  bar is up — first-load cosmetic.
- **The base stays pinned.** `MapArchitecture.styles.test.ts` now asserts the
  resting stop still _starts_ at `calc(28dvh` — the number that has to stay in
  step with `LIST_REST_VISIBLE_DVH` — and that the banner term is still there.

Capped at 34 dvh so an expanded banner cannot yank the sheet across the screen.
Verified on-device: chips fully visible above the bar, and the sheet returns to
exactly its normal rest after accepting.

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

### ~~Basemap paints after the markers~~ DONE

The pins are DOM and the basemap is WebGL, so the DOM won the first frame and
the yellow markers hung on white until the tiles arrived — longer over mobile
data.

**Decision (2026-07-29): hold the markers**, rather than putting a neutral
placeholder underneath them. `MapCanvasLayer` now gates every marker on
MapLibre's `load`, which is defined as "all necessary resources downloaded and
the first visually complete rendering has occurred" — exactly the moment the
pins may appear without floating.

Because they now have to _arrive_, they drop in: `translateY(-56px)
rotate(-13deg)` → the resting `rotate(-4deg)`, 420 ms, staggered 22 ms and
capped at 14 steps so the premium tier's ~700 spots land together instead of
cascading. No opacity anywhere — that rule is now pinned by a test in
`MapArchitecture.styles.test.ts` that fails if any marker keyframe animates
`opacity`.

Three things that are easy to get wrong here, all deliberate:

- **A fallback reveals the pins after 2500 ms regardless.** A dead tile CDN
  would otherwise leave a permanently empty map, which is worse than the
  problem being fixed. `error` triggers the reveal too.
- **The animation is on `.pinLogo`, not `.markerRoot`.** MapLibre owns the
  root's `transform` to position the marker; animating it fights the map.
- **`animation-fill-mode: backwards`, not `both`.** A forwards fill would leave
  every pin stuck at `rotate(-4deg)` and override `.pinLogoActive`'s own
  `rotate(3deg)` on a deep-linked selection. And the entering class comes off
  after the window closes, so markers that mount later — a filter change — do
  **not** re-animate; otherwise every chip tap would re-drop the whole map.

Verified on the iPhone 16e simulator by forcing the fallback-only path: tiles
fully painted with zero markers 8 s in, then the pins dropping in when the
timer fired.

### Marker set is not viewport-culled

`useMapFilters.displayedRestaurants` returns every match; there is no bounds
filter. Fine today (29 markers for the anon tier). At the premium tier — ~700
unlocked spots — that is 700 DOM markers MapLibre transforms every pan frame.
Not a bug yet; a wall to hit later.

### Dead cascade declarations — `MapFilters` cleared 2026-07-29

**Decision: delete, do not resurrect.** A dead declaration is evidence of an
older design, not of a bug in the current one — the values that ship are the
ones the design has been iterated against. Making the losers win would change
small-phone _and_ desktop rendering in dozens of places at once.

`MapFilters.module.css`: **94 lines / 83 declarations removed, 1126 → 1032.**
`.filterChip` had been restyled at least four times (blocks around 280, 300,
400, 456, 477, 490, 676, 713) and every round left the previous responsive
tuning in place, dead — including a 9 px chip from a much smaller older design.

Two things made this safe rather than brave:

1. **A declaration was only removed when it is dead for _every_ class and
   context its rule produces.** A grouped selector can be dead for
   `.filterChip` and still live for `.filterChipActive`; dropping it then is a
   real change. Of 113 dead entries only 57 declarations qualified — that
   distinction is exactly what the earlier flattening attempt got wrong.
2. **Computed-style diff, before vs after: 0 differences in 10 725
   comparisons.** 13 elements × 75 properties × 8 viewports (320/360/400/430/
   600/767/900/1280) for the chip rail, plus 39 elements × 75 properties with
   the filter picker open — the picker is not in the DOM otherwise, so the
   sweep would have missed every `.pickerSheet` / `.pickerItem` change.

Confirmed en route: the two `.filterChipLabelLong` shrink attempts this
document already records as doing nothing were among the removals, and
`mapCascade.test.ts` still passes — the long-label rule that actually works is
untouched.

Still to do, same method, each needing its own baseline because their elements
only exist in other states: **`MapDetails` (104)**, **`MapControls` (26)**,
**`RestaurantList` (19)**.

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

### ~~Search reveal still jumps once~~ REMOVED

The re-check this section asked for happened, and the answer was: get rid of it.

Opening search used to scroll the phone list up ~204 px instantly (and snap a
tablet sheet peek→mid). The rationale was that typing into a hidden result list
is worse than a jump. That held while the field _also_ vanished — the jump was
masked by the bigger bug. With the field now staying put (section 0), the jump
is the only thing left moving, and it reads as the page lurching under your
thumb.

**Removed 2026-07-29 on the user's call.** `revealListForSearch` is gone;
`revealPanelForSearch` keeps only the desktop panel reveal, because there the
side panel _is_ the result list and searching with it collapsed would filter
into something invisible. That is not the list moving.

Per-keystroke scrolling had already been removed earlier and must stay gone —
it is a separate, worse bug (~200 px per character, and on iOS it fought
Safari's own caret-visibility scroll).

The trade this accepts: on a phone at rest only ~28 dvh of list is visible, so
the first results land below the fold. If that turns out to be the wrong call,
the middle option never tried is a _smooth_ scroll rather than an instant one —
`'instant'` was chosen because "smooth would still be animating when the next
character lands", and that reasoning died with the per-keystroke scrolling.

---

## 4. Small, unowned

- **`aria-expanded` without `aria-haspopup`** on the filter chips. ✅ Fixed
  2026-07-29 — `FilterChip` now carries `aria-haspopup="dialog"`, which is what
  `MapFilterPickerSheet` actually is (`role="dialog" aria-modal="true"`). The
  "Geöffnet" chip beside them is a real toggle and correctly keeps
  `aria-pressed`.

### `MapDetails.module.css` — audited 2026-07-29, and yes, same trap class

`scripts/audit-css-cascade.mjs` was written for this. It reports, per class and
property, declarations that a later rule silently voids — grouping by selector
context and state and comparing specificity first, because without that the
output is drowned in false positives (`:global([data-map-body]…) .x` outranks a
later plain `.x`; `.x:hover` never competes with `.x`).

It is validated against the known case: it independently rediscovers
`.mapSearchToolbar { gap }` 10px → 8px, the exact declaration this document
already records as dead.

```bash
node scripts/audit-css-cascade.mjs app/components/map/MapDetails.module.css
```

| module                                                                                                     | classes | findings |
| ---------------------------------------------------------------------------------------------------------- | ------- | -------- |
| `MapFilters.module.css`                                                                                    | 20      | **118**  |
| `MapDetails.module.css`                                                                                    | 118     | **104**  |
| `MapControls.module.css`                                                                                   | 15      | 26       |
| `RestaurantList.module.css`                                                                                | 27      | 19       |
| `RestaurantGalleryLightbox`                                                                                | 12      | 1        |
| `MapSheet` / `MapLayout` / `MapMarkers` / `MapListEmpty` / `MustEatImageLightbox` / `MustEatRevealOverlay` | —       | 0        |

So the assumption in the old wording was right, and **`MapFilters.module.css` is
worse than `MapDetails`** — `.filterChip` alone carries six competing
`font-size` declarations across media queries, every one of them beaten by a
media-less `12px` at line 727. That is the same shape as the
`filterChipLabelLong` bug already pinned in `mapCascade.test.ts`.

Two findings were confirmed by reading the source, as samples:

- `.detailV13MustEat .fdText` — `@media (max-height: 740px)` sets
  `-webkit-line-clamp: 2` (line 653), a later media-less block at line 3160 sets
  `3` at equal specificity. Short screens get 3 lines, not the intended 2.
- `.rdActBtn` — `@media (max-width: 380px)` sets `font-size: 15px` (line 1502),
  a later media-less group sets `11px` (line 2281). Small phones get 11px.

**Do not bulk-fix this.** Most of `MapDetails`' findings cluster in one late
block (~4440–4850) that appears to be a deliberate later redesign superseding
the earlier responsive tuning — deleting the losers is safe, but "fixing" them
by making them win would change the layout on every small phone. Each finding is
a lead, not a verdict: confirm against computed styles, then pin the effective
value in `mapCascade.test.ts`. Flattening is still not the answer (section 2).

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
halo, the active-chip colour, and the long-label font size. All four are
pinned by `mapCascade.test.ts`, which asserts effective values rather than
individual blocks. There are now **222 more candidates** across `MapFilters`
and `MapDetails` (section 4) — `scripts/audit-css-cascade.mjs` finds them, and
`mapCascade.test.ts` is still where a confirmed one gets nailed down.

**Not every phone bug is a cascade bug.** The section 0 regression looked
exactly like one — three controls leaving the top edge together is the
signature of the `data-header-stuck` retreat — and it was not. It was the iOS
visual viewport. Reading `data-header-stuck` live on the device settled it in
one screenshot; reasoning about the stylesheet would not have.

**The Chromium preview cannot see anything the software keyboard causes**, and
that is not a small class: `visualViewport.offsetTop`, `position: fixed`
anchoring, and `env(safe-area-inset-top)` all behave differently. An iPhone
simulator is cheap and is real WebKit — see the setup note in section 1,
including the hardware-keyboard default that silently disables the whole
effect.

**Instrument, then screenshot.** The fastest way to get numbers off a simulator
is a temporary fixed overlay in the page printing `scrollY`, `innerHeight`,
`visualViewport.height/offsetTop/pageTop`, the relevant data attribute and the
element's `getBoundingClientRect().top`, gated behind a query param. Put it at
`top: 38%` — at `bottom: 0` the keyboard covers the very readout you need.

**Measuring in the preview browser has a trap.** The tab intermittently runs
with `visibilityState: "hidden"`, where `requestAnimationFrame` does not tick
and IntersectionObserver delivers no callbacks. That looks exactly like a
broken observer. Take a screenshot first to front the pane, then measure.
