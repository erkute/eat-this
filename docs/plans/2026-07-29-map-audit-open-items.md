# Map audit — open items

Working document for the mobile-Safari audit of `/map` that started 2026-07-28.

**Rewritten 2026-08-17.** The cascade sweep and the CLS budget are finished, so
they are compressed to their results and the reasoning that is still
load-bearing; everything else about them was deleted. Same rule as the last
rewrite: what is left is either open work or a decision you would otherwise
re-derive from scratch.

Read sections 1–4 to know what is left. Section 5 is history, section 6 is the
knowledge that outlives it.

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
field (section 6). It only renders while the header is stuck, so
keyboard-open-while-stuck is the only window. Deliberately not changed blind.

### iOS URL-bar frosting on the phone restaurant detail

Shipped 2026-08-17 (#330/#332) and verified only in Chromium, which **cannot**
reproduce the effect it fixes — the frosting is WebKit-specific and was
bisected on-device. What was verified here is the mechanism: entering the
detail hides the live GL layer and swaps in a frozen `<img>`, leaving it
restores both, and no `visibility: hidden` leaks. The frosting itself still
wants one look on a real iPhone.

---

## 2. Open — needs a decision from you

### Marker clustering

Four pins overlap within ~70 px in Mitte; the rearmost cannot be tapped.
Declined 2026-07-28 because count bubbles change how the map reads as a brand
surface. **The open question is not whether but what a cluster looks like** — a
design call, not a bug. Re-opened 2026-07-29 and still unanswered.

### Flattening `MapControls.module.css`

The recommendation is still **don't**, and it is now stronger than before. The
value was readability _and_ finding dead rules; `scripts/cascade/triage.mjs`
delivers the finding half with zero risk, and the sweep has already collected
everything there was to collect. The measured cost is unchanged: a generated
flat version broke the cascade in 96 of 1872 computed-style comparisons.

### Two touch targets below 44 px

Sheet handle (~31 px effective) and the filter chip clear × (~31×40). Both are
the same knowing trade: an 84×44 chip cannot hold two 44 px targets, and the
clean flex fix drops the label to ~52 px where "Kreuzberg" already wraps. Only
revisit as a design call.

---

## 3. Open — no blocker, no decision needed

- **`.fdProximity` keeps 4 dead declarations.** They are genuinely dead, but the
  class only renders while a must-eat is still _covered_ (`!open` in
  `MustEatDetailMobile.tsx`), and every must-eat is revealed for anon sessions
  locally — so no sweep here can cover them, so they stay. `prune.mjs
  --exclude-class=fdProximity` enforces that rather than trusting memory. Delete
  them the day a covered must-eat is reachable locally, not before.
- **Marker set is not viewport-culled.** `useMapFilters.displayedRestaurants`
  returns every match. Fine at 29 markers; ~700 at the premium tier is the wall.
  The first-load drop-in already caps its stagger at 14 steps for this reason.
- **`/map` first-load JS is 327 kB.** Heaviest route (next is 270 kB, shared
  baseline 188 kB). Not absurd for MapLibre; the number to attack if mobile TTI
  becomes a concern.
- **Remy chat scrim leaves a gap.** With the keyboard up the scrim (`inset: 0`,
  i.e. the layout viewport) rides up and leaves the strip between panel and
  keyboard untinted. Cosmetic, only while typing.

---

## 4. Not code — waiting on a human

- **`git config core.hooksPath .githooks`** on your other machines. Set on this
  one. Without it git runs the un-patched copy in `.git/hooks/` and skips the
  build on the first push of every new branch.
- **Restaurant names may still carry stray whitespace.** `"Kolo Coffee "` was
  fixed and published 2026-07-30, but whether others have the same problem is
  **not** checked: this dataset's GROQ has no `string::trim`, and
  `name match "* "` tokenises, so it matches every document and proves nothing.
  If it matters, trim on import rather than sweeping ~330 documents by hand.

---

## 5. Shipped

| What                                                                       | PR        |
| -------------------------------------------------------------------------- | --------- |
| iOS keyboard pushed the search field off screen — `--map-visual-offset-top` | #319      |
| Markers held until the basemap paints, then dropped in                     | #319      |
| `aria-haspopup="dialog"` on the filter chips                               | #319      |
| Opening search no longer moves the list                                    | #321      |
| Cookie banner no longer covers the filter row                              | #321      |
| Cascade sweep: all four map modules pruned                                 | #321/#324 |
| Map preload survives a failed chunk fetch and retries                      | #325      |
| iOS URL-bar frosting on the phone restaurant detail (map snapshot)         | #330      |
| `/map` CLS 0.1084 → 0.00037 — consent moved to a cookie                    | #329      |

### The cascade sweep is finished

All four modules are pruned and the harness lives in `nextjs/scripts/cascade/`
(sweeps, hover pass, `triage.mjs`, `prune.mjs`, diffs, a diff self-test, and a
README that is mostly the list of ways the measurement lies). ~1.8 million
computed-style cells compared across the four, **0 changed**.

| module           | findings | deleted | kept |
| ---------------- | -------- | ------- | ---- |
| `MapFilters`     | 118      | 83      | 4    |
| `MapControls`    | 26       | 19      | 2    |
| `RestaurantList` | 19       | 19      | 0    |
| `MapDetails`     | 104      | 90      | 5    |

**The audit still reports findings on three of these, and that is the finished
state, not leftovers.** Run `triage.mjs` before believing otherwise: it asks
per _declaration_ whether it is dead for every class **and** context its rule
produces, which is the question `audit-css-cascade.mjs` does not answer because
it reports per class. Every survivor is a grouped declaration that is dead for
some classes and live for others — deleting them would have taken the shadow
off `.panelToggle`, the hover lift off `.mapBurger`/`.fab`, the 36 px box off
`.rdCloseGlass`, and more. All pinned in `mapCascade.test.ts`, all
mutation-tested.

### CLS on `/map`

Lighthouse CI asserts CLS ≤ 0.1 as an _error_ against production; `/map` sat at
**0.1084**, all of it one shift. The cookie banner is 175 px tall, its height
reached layout through `--consent-bar-h` only after hydration, and
`--phone-list-sheet-visible` subtracts it — so the sheet, the FAB, the toast and
the map attribution jumped up 175 px together, ~4.3 s in. The answer lived in
`localStorage`, unreadable before paint, so the space could never be reserved in
time. Consent moved to a **cookie** (`lib/consent.ts`), the pre-paint bootstrap
reserves the height behind `[data-consent='pending']`, and one CSS variable both
reserves the space and floors the bar (`min-height`) so the two cannot drift.
CI green since 2026-08-17.

The metric was always worse than the experience: only first-time visitors ever
saw the jump, but Lighthouse starts with a fresh profile every run — which is
also why it failed every single time.

---

## 6. Closed — dark mode is not coming

**Decided 2026-07-30. The app is light-only, permanently.** Not a backlog item;
do not re-open it as a cleanup, and do not add a `prefers-color-scheme` block
"just for this one surface".

There was never anything to remove: no `prefers-color-scheme` rule, no
`data-theme`, no `.dark` class, no `--dark-*` token, no `darkMode` flag exists
anywhere in `app/`, `css/` or `lib/`. What does exist, and **must stay**, is
`color-scheme: light` (twice in `globals.css`). That is the opposite of a
leftover — it tells the browser the page is light so it stops applying its own
dark heuristics to form controls and scrollbars. Deleting it would let dark-mode
rendering back in through the side door.

What it would have cost, for the record: 564 hardcoded hex values across 53 CSS
files (65 distinct), 18 more in TSX inline styles, a dark basemap (the map
hardcodes CartoDB Positron, `LIGHT_STYLE` in `MapCanvas.tsx`), and a
paper-white sheet that no longer fits over it.

---

## 7. Context worth keeping

**A fixed surface with an input is not automatically broken by the iOS
keyboard.** iOS does not shrink the layout viewport; it slides the _visual_
viewport down inside it (`visualViewport.offsetTop`). Safari rescues anything it
can reposition — the login modal and the Remy chat were both tested on device
and are fine. What it cannot rescue is an element that **is itself the fixed
anchor with a hard `top`**: there is nothing around it to scroll. That was
`.mapSearchToolbar`, and it is why the map was the only casualty.

**The recurring failure mode is a later CSS rule silently voiding an earlier
one.** Pinned in `mapCascade.test.ts` — the transition shorthand dropping
`transform`, `filter: none` erasing the icon halo, the active-chip colour, the
long-label font size, plus every grouped declaration the sweep had to keep.

**Not every phone bug is a cascade bug.** The keyboard regression looked exactly
like one — three controls leaving the top edge together is the signature of the
`data-header-stuck` retreat — and it was not. Reading the attribute live on the
device settled it in one screenshot.

### Three ways a computed-style measurement lies

All three produced a "difference" that no CSS change caused. All three are
guarded in the harness; the README has the long version.

1. **Media queries re-match a frame late.** After a resize, `innerWidth` and
   `matchMedia()` already report the new width while the style engine has not
   re-matched `@media` rules yet — so a snapshot there carries the previous
   width's values. This is what recorded a 320 px baseline holding the ≥768 px
   value and turned a no-op prune into 24 phantom differences. **Guarding on
   `innerWidth`/`matchMedia` is not enough**; the double `requestAnimationFrame`
   is what fixes it.
2. **Transitions.** These controls transition `transform` for up to 280 ms, so a
   read one frame after a state change returns the interpolated _start_ value —
   indistinguishable from "the rule did not apply", and an invitation to delete
   a live declaration.
3. **Used-value drift.** `top/right/bottom/left/inset` on an absolutely
   positioned element resolve against the surrounding layout and differ between
   two runs of _identical_ code — measured at 160 of 198 720 cells. Diff two
   same-code runs to get that noise floor before trusting any before/after.

### Measuring on a phone

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
