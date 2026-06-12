# Mobile Detail-Sheet: Mid Snap with Photo + Pager

**Date:** 2026-06-11
**Status:** Approved (design review with owner via interactive mockup)

## Goal

On mobile, the restaurant detail sheet gets three clearly distinct positions:

1. **Top (`full`)** — unchanged: thin map strip at the top, detail content scrollable.
2. **Middle (bottom anchor)** — the hero photo is fully visible **plus the
   prev/next pager directly below it** (arrow + neighbour name left/right).
   The map is free above the sheet. Paging from here works as today
   (selection swaps in place, camera flies along).
3. **Pulled below the middle stage** — unchanged: the detail dismisses and
   the list sheet returns at `mid` height (readable result set), camera
   flies back to the restaurant.

Additionally: tapping a **map pin** opens the detail at the **middle** stage
(map context stays visible); tapping a **list card** keeps opening at `full`
(user clicked to read content).

Must-eat details approximate the same feel within their existing layout:
their middle stage shows the must-eat card fully (today they fall back to a
static 220 px strip because the measuring attribute is missing). Their pager
sits below the dish-name/price block, not below the photo, so it is **not**
part of the must-eat middle stage — no layout reshuffle in this iteration.

## Background / current state

- The sheet is a custom drag/snap system: `lib/map/useBottomSheet.ts`
  (primitive) + `lib/map/useMapSheet.ts` (per-view config). Detail view uses
  two anchors `['full', 'peek']`; `peek` is already measured live via a
  ResizeObserver on `[data-detail-hero]` (the 4:5 photo block), so the photo
  is already fully visible at peek. **What's missing is only the pager row
  in the visible area.**
- The pager (`styles.rdPager`) already renders directly below the hero in
  `RestaurantDetail.tsx` — no layout reordering needed.
- The dismiss gesture (overshoot well below peek → `onDetailDismiss` →
  list at `mid`) already implements the desired bottom behaviour
  (`MapSection.tsx` `handleRestaurantClose` / `handleMustEatClose`).
- Marker and list-card clicks share one handler (`handleRestaurantClick`),
  which always snaps to `full`.

## Design (approach: extend the peek measurement)

No new dependencies, no changes to the gesture engine, desktop unchanged.

### 1. Measure the pager into the detail peek (`useMapSheet.ts`)

- Tag the pager `<nav>` in `RestaurantDetail.tsx` with `data-detail-pager`.
- Must-eats: add `data-detail-hero` to the card hero in
  `MustEatDetailMobile.tsx` (`.fdHero`) so the existing measurement applies
  and the card is fully visible at the middle stage. Its pager is not
  tagged (see Goal).
- Extend the existing ResizeObserver block to also observe
  `[data-detail-pager]` and keep its measured height in state
  (`detailPagerPx`), analogous to `detailHeroPx`.
- Detail peek becomes
  `HANDLE_PX + detailHeroPx + detailPagerPx + 4 + safeAreaBottom`.
- When the pager is not rendered (only one restaurant in the filtered
  list ⇒ neither prev nor next), `detailPagerPx` stays `0` and the peek
  gracefully degrades to today's photo-only height. The MutationObserver
  re-attach logic already handles the element appearing/disappearing on
  restaurant change; pager observation hooks into the same `attach()`.
- The existing "re-configure + reapply when the measured size changes"
  effect picks the new value up automatically.

### 2. Open-at-middle for map pins (`MapSection.tsx`)

- `handleRestaurantClick(r, origin: 'list' | 'map' = 'list')`.
  `MapCanvasLayer`'s marker click passes `'map'`; list cards, search
  results, deep links and `onRestaurantSlugMatch` keep the default `'list'`.
- `origin === 'map'` ⇒ `setSnap('peek')` (the middle stage) and
  `flyTo` padding computed for `'peek'`; otherwise `setSnap('full')` as
  today. `getFlyPadding` already derives padding from the sheet's visible
  height, so the camera centres on the actually visible map area.
- Same parameter on `handleMustEatClick` for must-eat markers.

### 3. Naming

`peek` (detail) is referred to as the "middle stage" in comments where
touched; no rename of the `SheetSnap` union — `'peek'` stays the technical
anchor name to avoid churn in the gesture engine.

## Explicitly unchanged

- Dismiss gesture, thresholds, and "list returns at `mid`" behaviour.
- Detail opening at `full` from the list, search, and `?r=` deep links.
- Map-tap while detail is at `full` collapses to the bottom anchor (now
  photo + pager instead of photo only) — same code path.
- Horizontal swipe navigation inside the detail.
- Desktop side-panel layout (sheet code is mobile-only).
- No opacity animations (project motion rule) — all motion stays
  translate-based as implemented.

## Error handling / edge cases

- **No pager rendered** → peek = photo only (measured 0), no dead band.
- **Hero/pager size changes** (name wraps, restaurant change, font load) →
  ResizeObserver re-measures; if parked at peek, `reapplySnap('peek')`
  updates the position (existing mechanism).
- **iOS safe area** → already added to the peek calculation; the pager sits
  above the home indicator.
- **ResizeObserver unavailable** → static fallback `DETAIL_PEEK_BASE_PX`
  needs to grow by a pager estimate (~44 px) so the degraded experience
  still shows the pager partially.

## Testing

- Unit: peek computation with/without measured pager height (extract the
  formula or test via hook behaviour where practical).
- Manual smoke on staging (mobile viewport): list-card open → full; pin tap
  → middle with photo + pager fully visible; pager taps at middle page
  prev/next with camera flight; drag below middle → list at mid; must-eat
  detail dragged down shows the card fully at its bottom stage (no 220 px
  cut-off; note: the map renders restaurant markers only — must-eats have
  no pins); iPhone safe-area check (pager not clipped); single-result
  filter → no empty band below photo.
