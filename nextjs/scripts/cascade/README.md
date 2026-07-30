# Cascade measurement harness

`scripts/audit-css-cascade.mjs` finds declarations a later rule voids. It
produces **leads**. This directory is what turns a lead into a verdict: a
computed-style sweep over viewports × the 24 `[data-map-body]` states × every
class a module ships, so a prune can be shown to change nothing.

## Run it

Dev server up (`npm run dev`), then through the Playwright MCP:

```
browser_run_code_unsafe { filename: "nextjs/scripts/cascade/sweep-controls.js" }
browser_evaluate { function: "() => JSON.stringify(window.__snaps)",
                   filename: ".playwright-mcp/cascade/snapshot-A.json" }
```

Then make the CSS change and repeat into `snapshot-B.json`. Compare:

```bash
node nextjs/scripts/cascade/diff.mjs snapshot-A.json snapshot-B.json
```

`browser_run_code_unsafe` has no filesystem and no `require`, which is why the
sweep parks its result on `window.__snaps` and `browser_evaluate` writes the
file. Note that the file it writes is JSON-in-JSON; `diff.mjs` unwraps it.

## Two runs of the SAME code first

`top/right/bottom/left/inset` on an absolutely positioned element are _used_
values that track the surrounding layout, so they drift between identical runs
— measured at 160 of 198 720 cells, all of them `bottom`/`inset` on the two
status toasts. Diff two same-code runs to get that noise floor, pass it as
`diff.mjs A.json B.json noise.json`, and only then trust a before/after.

## The rule that makes a prune safe

A declaration is removable only when it is dead for **every class its selector
list produces**. The audit reports per class, so a grouped declaration reads as
dead as soon as it is dead for one of them. Two live declarations in
`MapControls.module.css` are flagged for exactly that reason and are pinned in
`mapCascade.test.ts` — the `drop-shadow` shared with `.panelToggle`, and the 2px
hover lift that only `.mapSearchBtn` overrides.

## Probes

Classes the DOM never shows still have to be measured, or the sweep silently
skips those removals — 15 of MapFilters' 20 classes are in that group, and both
status toasts in MapControls. A probe carries the hashed class name, mirrors the
real markup (percentage lengths resolve against the element's own box: the
toast's `-100% - 70px` is meaningless on an empty div), and mounts **where the
real element lives** — inside `[data-map-body]` for the toasts, on
`document.body` for the portalled filter picker.

## Timing, or: how the harness lies

Three failure modes, each of which has produced a "difference" that no CSS
change caused. `sweep-controls.js`'s header documents all three; the short
version:

1. **Media queries re-match a frame late.** `innerWidth` and `matchMedia()`
   report the new width before the style engine re-matches `@media` rules. This
   is what recorded a 320 px baseline holding the ≥768 px value and turned a
   no-op prune into 24 phantom differences. Guarding on `innerWidth` is not
   enough — the double `requestAnimationFrame` is the fix.
2. **Transitions.** Up to 280 ms here; a read one frame after a state change
   returns the interpolated start value, which looks exactly like a rule that
   did not apply.
3. **Used-value drift.** See the noise floor above.

## Coverage

The viewport sweep does not exercise pseudo-**classes**: `hover.js` covers
`:hover`/`:focus-visible` via CDP `CSS.forcePseudoState`. Pseudo-**elements** are
in the sweep — `::before`/`::after` are measured alongside each element, skipping
those whose `content` is `none`. Anything neither pass covers stays; do not
delete what the diff does not cover.

One sweep per module, because the property list and the probes are
module-specific: `sweep-controls.js` (MapControls), `sweep-filters.js`
(MapFilters), `sweep-list.js` (RestaurantList). Copy the closest one for the
next module, swap `PREFIX`, regenerate `PROPS` from the stylesheet, and set
`WIDTHS` to both sides of every breakpoint the file actually uses.
