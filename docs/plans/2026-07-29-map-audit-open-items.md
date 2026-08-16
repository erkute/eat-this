# Map audit — open items

Working document for the mobile-Safari audit of `/map` that started 2026-07-28.
**Rewritten 2026-07-29** after everything below the line shipped: the resolved
items are compressed to one line each, the reasoning that is still load-bearing
was kept, and the rest was deleted. **Updated 2026-07-30**: the MapControls
measurement contradiction in section 3 is resolved, all four modules are pruned,
and the harness now lives in `nextjs/scripts/cascade/`. The cascade sweep is
finished — section 3 is history now, not a task list.

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

| module           | findings | status                                                                            |
| ---------------- | -------- | --------------------------------------------------------------------------------- |
| `MapFilters`     | 118      | **done** (#321) — 83 deleted; **re-verified 2026-07-30**, 0 diff in 393 120 cells |
| `MapControls`    | 26       | **done 2026-07-30** — 19 deleted, 0 diff in 223 560 cells; 7 kept, see below      |
| `RestaurantList` | 19       | **done 2026-07-30** — all 19 deleted, 0 diff in 579 360 cells                     |
| `MapDetails`     | 104      | **done 2026-07-30** — 90 deleted, 0 diff in 622 548 cells; 5 kept, 4 unmeasurable |

The harness is now in the repo: `nextjs/scripts/cascade/` (sweep + hover pass +
diff + a README that is mostly a list of ways the measurement lies). It does not
need rebuilding, and rebuilding it from scratch is how the contradiction below
happened.

**The audit still reports findings on three of these modules, and that is the
finished state, not leftovers.** Run `triage.mjs` before believing otherwise:
MapFilters' 10 remaining findings are 4 declarations that are all dead in one
context and live in another (`.filterChipRow > .filterChip` vs
`.filterChipWrap .filterChip`) — **0 removable**, so #321 was exhaustive.
MapControls' 4 are the 2 keeps below, MapDetails' 13 are its 5 keeps plus the 4
`.fdProximity` declarations nothing can measure. RestaurantList is at 0.

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

Rule 3 is not theoretical: it saved two live declarations in MapControls. The
audit reports per _class_, so a grouped declaration reads as dead the moment it
is dead for one of them. `filter: drop-shadow(...)` is declared for
`.mapSearchBtn, .mapBurger, .fab, .panelToggle` at once and reset for the first
three — `.panelToggle` has no other `filter` in the file, so deleting it takes
the shadow off the desktop panel handle. The 2px `@media (hover: hover)` lift is
re-declared as 1px for `.mapSearchBtn` only, so it stays live for `.mapBurger`
and `.fab`. Both are pinned in `mapCascade.test.ts`, and both fail that test when
mutated.

Add a step 5: **pseudo-classes and pseudo-elements need their own coverage.**
The viewport sweep never hovers anything, so a `:hover`-gated declaration is
invisible to it — `hover.js` forces `:hover`/`:focus-visible` over CDP, and one
of MapControls' 19 removals was only justifiable that way. And
`getComputedStyle(el)` says nothing about `::before`/`::after`; the sweep now
takes both (skipping `content: none`, or every class collects a screenful of
empty rows). Without that, RestaurantList's dead `.rcard::after` gradient would
have been deleted unmeasured.

And a step 6, from MapDetails — the module where all of this actually got
tested: **the triage is a tool now, not a judgement call.**
`scripts/cascade/triage.mjs` answers rule 3 mechanically, splitting the audit's
findings into "dead for every class and context" and "keep, still live for X".
It reproduces the MapControls (19 / 2) and RestaurantList (19 / 0) hand triage
exactly, which is why its MapDetails verdict — 94 removable, **5 keeps** — was
trustworthy enough to apply with `scripts/cascade/prune.mjs` instead of 90 hand
edits. All 5 keeps are pinned in `mapCascade.test.ts` and mutation-tested.

Three things MapDetails needed that no earlier module did:

- **Both viewport axes.** It is the only map module with height-gated rules
  (`max-height: 740px`, `min-height: 741px`,
  `min-width: 1024px and max-height: 760px`), so a width-only sweep would have
  measured nothing at all in six of its blocks.
- **Scenarios instead of probes.** Half the module exists only in the must-eat
  sheet, half only in the restaurant sheet, and 78 of the 104 findings sit on
  must-eat classes. Those findings are `height` / `max-height` /
  `grid-template-rows` — geometry a stub div gets wrong — so the sweep renders
  both for real (`?r=crapulix`, a restaurant that HAS must-eats and therefore
  mounts `rdMustSection` + the pack promo, and `?me=<id>`). Probes are for a
  modifier class, not for half a component.
- **Joined cells.** 94 property names repeated per class per state per viewport
  is too large to hand back through CDP. Cells are U+0001-joined value lists;
  `diff-details.mjs` maps an index to a name, and `selftest-diff.mjs` proves
  that diff can still fail.

**`.fdProximity` is the one thing left undeleted.** Its 4 dead declarations are
real, but the class only renders while a must-eat is still _covered_
(`!open` in `MustEatDetailMobile.tsx`) and every must-eat is revealed for anon
sessions locally — so the sweep cannot reach it, so it stays. `--exclude-class`
in `prune.mjs` is how that was enforced rather than remembered.

### ✅ RESOLVED 2026-07-30: the MapControls contradiction was the measurement

**Candidate B, confirmed, with the mechanism reproduced.** At a settled 320 px
the two toasts read `translateY(-166.08px)` / `-130px` — exactly
`-100% - 70px` against each probe's own height (96 px and 60 px; the earlier
`-162` was a 92 px probe). `translateY(0)` is the **≥768 px** value and cannot
occur at a settled 320 px in any of the 24 states, so the _baseline_ was the
broken side. The old "24 differences" number matches exactly: at 320 px only 12
of the 24 states show the toast at all (phone + detail is `display: none`), and
12 states × 2 classes = 24 cells.

Reproduced directly — resize to 320 px, measure with no settle:

| step           | innerWidth | phone MQ | transform                   |
| -------------- | ---------- | -------- | --------------------------- |
| settled 1440   | 1440       | false    | `matrix(…, -180, 0)`        |
| 320 imme­diate | **320**    | **true** | `matrix(…, -144, 0)`        |
| 320 settled    | 320        | true     | `matrix(…, -144, -166.078)` |

The sting is the middle row: `innerWidth` was already 320 and
`matchMedia('(max-width: 767.98px)')` already `true`, and even the X translate
had re-resolved against the new box — while the phone block's `transform` had
not been applied. **The style engine re-matches `@media` rules a frame after the
matchMedia API reports the change**, so a guard on `innerWidth`/`matchMedia`
still accepts the bad snapshot. Only waiting a frame or two fixes it.

Two more ways the same harness lies, both found the same way and both now
guarded:

- **Transitions.** These controls transition `transform` for up to 280 ms, so a
  read one frame after a state change returns the interpolated _start_ value.
  This made `.mapBurger:hover` look like it had lost its 2px lift — i.e. it
  invites deleting a live declaration. CDP's own matched-rules list settled it.
- **Used-value drift.** `top/bottom/left/right/inset` on an absolutely
  positioned element resolve against the surrounding layout and differ between
  two runs of _identical_ code: 160 of 198 720 cells, all `bottom`/`inset` on
  the two toasts, ~12 px. Diff two same-code runs first and subtract that floor.

Consequences: the pruner was never wrong, and **MapFilters (#321) was
re-verified** from its pre-merge stylesheet with the hardened harness — 0
differences in 393 120 cells, this time with all 15 DOM-absent classes probed
and the filter picker mounted on `document.body` where it actually portals.

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

- ~~**Publish the Sanity draft** for restaurant
  `5310ecbd-4c43-43ab-ba69-a805c983550a`: `"Kolo Coffee "` → `"Kolo Coffee"`.~~
  **Published 2026-07-30.** The draft was byte-identical to the published
  document apart from that one trailing space, so nothing else rode along with
  it. Whether other restaurant names still carry stray whitespace is **not
  checked** — `string::trim` does not exist in this dataset's GROQ version and
  `name match "* "` tokenises, so it matches everything and proves nothing. If
  it matters, trim on import rather than sweeping the dataset by hand.
- **`git config core.hooksPath .githooks`** on your other machines. Set on this
  one. Without it git runs the un-patched copy in `.git/hooks/` and skips the
  build on the first push of every new branch.
