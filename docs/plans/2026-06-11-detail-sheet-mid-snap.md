# Mobile Detail-Sheet Mid Snap (Photo + Pager) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The mobile restaurant-detail sheet's bottom anchor ("middle stage") shows the hero photo **plus the prev/next pager**; tapping a map pin opens the detail at that middle stage instead of full.

**Architecture:** The sheet's bottom anchor for detail views is the existing `peek` snap whose height `useMapSheet` already measures live from `[data-detail-hero]`. We add a second measured element (`[data-detail-pager]`), extract the height formula plus a pre-mount estimate into a new pure module `lib/map/detailSnap.ts` (unit-tested), and make `MapSection`'s open-detail snap logic origin-aware (`'map'` → peek, `'list'`/default → full) via a pending-snap ref that also fixes paging-at-peek jumping to `mid`.

**Tech Stack:** Next.js 15 App Router, React 19, CSS Modules, custom pointer/touch sheet engine (`lib/map/useBottomSheet.ts`), vitest.

**Spec:** `docs/specs/2026-06-11-detail-sheet-mid-snap-design.md`

**Repo ground rules (from CLAUDE.md / memory — read before starting):**
- Parallel agent sessions share this working tree. `git status` before every commit; stage ONLY the files this plan touches (never `git add .`/`-A`/`-u`). There are currently unrelated uncommitted changes (OG images, SEO meta) — leave them alone.
- Run tests unpiped (`npm test`), never `npm test | tail` — piping swallows the exit code.
- No opacity animations for motion. (This plan adds no animations.)
- Push flow: feature branch → PR into `staging`. Never push to `main`. Run `npm run build` manually before pushing (pre-push hook gaps on new-branch pushes).

---

### Task 0: Feature branch

**Files:** none

- [ ] **Step 1: Verify state and branch off**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu"
git status   # expect: on main, unrelated unstaged changes (OG/SEO files) — do not touch them
git checkout -b feat/detail-sheet-mid-snap
```

Expected: new branch `feat/detail-sheet-mid-snap` containing the spec commit `6dcdc7c` (docs: spec for mobile detail-sheet mid snap).

---

### Task 1: Pure module `detailSnap.ts` — height formula + pre-mount estimate (TDD)

**Files:**
- Create: `nextjs/lib/map/detailSnap.ts`
- Create: `nextjs/lib/map/detailSnap.test.ts`

Why a module: `useMapSheet` needs the formula for the measured path, and `MapSection` needs a pre-mount **estimate** for `flyTo` padding when a pin-tap opens the detail at peek (the hero isn't mounted/measured yet at that moment). One source of truth, unit-testable without DOM.

- [ ] **Step 1: Write the failing test**

`nextjs/lib/map/detailSnap.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  DETAIL_HANDLE_PX,
  DETAIL_PEEK_BUFFER_PX,
  DETAIL_PAGER_ESTIMATE_PX,
  detailMidVisiblePx,
  estimateDetailMidVisiblePx,
} from './detailSnap'

describe('detailMidVisiblePx', () => {
  it('sums handle + hero + pager + buffer + safe area', () => {
    expect(detailMidVisiblePx(453, 41, 34)).toBe(DETAIL_HANDLE_PX + 453 + 41 + DETAIL_PEEK_BUFFER_PX + 34)
  })

  it('degrades to photo-only when no pager is rendered (pagerPx 0)', () => {
    expect(detailMidVisiblePx(453, 0, 0)).toBe(DETAIL_HANDLE_PX + 453 + DETAIL_PEEK_BUFFER_PX)
  })
})

describe('estimateDetailMidVisiblePx', () => {
  it('estimates the hero as a 4:5 photo with 14px side margins', () => {
    // 390px viewport: hero width 390-28=362 → height 362*5/4=452.5 → round 453
    const expected = detailMidVisiblePx(453, DETAIL_PAGER_ESTIMATE_PX, 34)
    expect(estimateDetailMidVisiblePx(390, true, 34)).toBe(expected)
  })

  it('omits the pager estimate when hasPager is false', () => {
    const expected = detailMidVisiblePx(453, 0, 0)
    expect(estimateDetailMidVisiblePx(390, false, 0)).toBe(expected)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu/nextjs"
npx vitest run lib/map/detailSnap.test.ts
```

Expected: FAIL — `Cannot find module './detailSnap'` (or equivalent resolve error).

- [ ] **Step 3: Write the implementation**

`nextjs/lib/map/detailSnap.ts`:

```ts
/* Height math for the mobile detail sheet's bottom anchor (the "middle
   stage"): handle pip + full hero photo + prev/next pager + buffer + iOS
   safe area. The measured path (useMapSheet's ResizeObservers) feeds real
   element heights into `detailMidVisiblePx`; `estimateDetailMidVisiblePx`
   approximates the same value BEFORE the detail has mounted — used as the
   pre-measurement fallback peek and for flyTo padding on pin-tap, where the
   hero of the newly selected restaurant doesn't exist in the DOM yet. */

/** Grab-handle zone height above the hero (matches HANDLE_PX in useMapSheet). */
export const DETAIL_HANDLE_PX = 44
/** Sub-pixel rounding buffer below the pager (matches the +4 in useMapSheet). */
export const DETAIL_PEEK_BUFFER_PX = 4
/** Pager row estimate: 2×10px padding + ~21px content line (map.module.css .rdPager). */
export const DETAIL_PAGER_ESTIMATE_PX = 41
/** Hero horizontal margins: 14px each side (map.module.css .rdHero). */
const HERO_SIDE_MARGINS_PX = 28
/** Hero aspect ratio is 4/5 (portrait) → height = width × 5/4. */
const HERO_HEIGHT_RATIO = 5 / 4

export function detailMidVisiblePx(heroPx: number, pagerPx: number, safeAreaBottom: number): number {
  return DETAIL_HANDLE_PX + heroPx + pagerPx + DETAIL_PEEK_BUFFER_PX + safeAreaBottom
}

export function estimateDetailMidVisiblePx(viewportW: number, hasPager: boolean, safeAreaBottom: number): number {
  const heroPx = Math.round((viewportW - HERO_SIDE_MARGINS_PX) * HERO_HEIGHT_RATIO)
  return detailMidVisiblePx(heroPx, hasPager ? DETAIL_PAGER_ESTIMATE_PX : 0, safeAreaBottom)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run lib/map/detailSnap.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu"
git status   # confirm only the two new files below are being staged
git add nextjs/lib/map/detailSnap.ts nextjs/lib/map/detailSnap.test.ts
git commit -m "feat(map): detail mid-stage height formula + pre-mount estimate"
```

---

### Task 2: Tag the measured elements (`data-detail-pager`, must-eat hero)

**Files:**
- Modify: `nextjs/app/components/map/RestaurantDetail.tsx:299` (pager `<nav>`)
- Modify: `nextjs/app/components/map/MustEatDetailMobile.tsx:81,87` (both `.fdHero` button variants)

- [ ] **Step 1: Tag the restaurant pager**

In `RestaurantDetail.tsx`, the pager nav (line ~299):

```tsx
<nav className={styles.rdPager} data-detail-pager aria-label="Restaurant pager">
```

- [ ] **Step 2: Tag both must-eat hero buttons**

In `MustEatDetailMobile.tsx` there are two conditionally rendered hero buttons (unlocked ~line 81, locked ~line 87). Add `data-detail-hero` to **both**:

```tsx
<button type="button" className={styles.fdHero} data-detail-hero onClick={handleCardZoom} aria-label={t('map.zoomCard')}>
```

```tsx
<button
  type="button"
  data-detail-hero
  className={`${styles.fdHero} ${styles.fdHeroLocked} ${canUnlock ? styles.mustEatCardCanUnlock : ''} ${tapping ? styles.mustEatCardTapping : ''}`}
```

(Keep all existing props/handlers unchanged — only the attribute is added.)

This makes `useMapSheet`'s existing ResizeObserver measure the must-eat card, so its bottom stage shows the card fully instead of the static 220px fallback. The must-eat pager is deliberately NOT tagged (it sits below the dish-name block, not below the photo — see spec).

- [ ] **Step 3: Type-check**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu/nextjs"
npx tsc --noEmit
```

Expected: exit 0 (attribute-only change).

- [ ] **Step 4: Commit**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu"
git status
git add nextjs/app/components/map/RestaurantDetail.tsx nextjs/app/components/map/MustEatDetailMobile.tsx
git commit -m "feat(map): tag detail pager + must-eat hero for sheet measurement"
```

---

### Task 3: Measure the pager into the detail peek (`useMapSheet.ts`)

**Files:**
- Modify: `nextjs/lib/map/useMapSheet.ts`

- [ ] **Step 1: Import the new module and add pager state**

At the top of `useMapSheet.ts`:

```ts
import { detailMidVisiblePx, estimateDetailMidVisiblePx } from './detailSnap'
```

Below the `detailHeroPx` state (line ~54), add:

```ts
  /* Measured pager height — part of the detail middle stage. 0 when the
     pager isn't rendered (single-result filter, or must-eat detail whose
     pager is not tagged). */
  const [detailPagerPx, setDetailPagerPx] = useState(0)
```

- [ ] **Step 2: Use the formula in `viewConfig`**

Replace the `detailPeek` computation (lines ~64-66):

```ts
    const detailPeek = detailHeroPx != null
      ? detailMidVisiblePx(detailHeroPx, detailPagerPx, safeAreaBottom)
      : typeof window !== 'undefined'
        ? estimateDetailMidVisiblePx(window.innerWidth, true, safeAreaBottom)
        : DETAIL_PEEK_BASE_PX + safeAreaBottom
```

Add `detailPagerPx` to the `useMemo` dependency array:

```ts
  }, [detailHeroPx, detailPagerPx, onDetailDismiss])
```

Update the constant comment block (lines ~22-30): `DETAIL_PEEK_BASE_PX` is now only the SSR-safe last-resort fallback; the pre-measurement client fallback is the viewport-width estimate (no visible jump when the measurement lands). Keep `DETAIL_PEEK_BASE_PX = 220` — it still guards the `typeof window === 'undefined'` branch. Note: `HANDLE_PX` (44) must stay equal to `DETAIL_HANDLE_PX` in `detailSnap.ts`; the formula's `+4` buffer replaces the inline `+ 4`.

`HANDLE_PX` keeps its one remaining use in the measured path via `detailMidVisiblePx` — if the linter flags `HANDLE_PX` as unused after this change, delete the local constant (the value lives in `detailSnap.ts` now).

- [ ] **Step 3: Observe the pager element**

Extend the ResizeObserver effect (lines ~97-138). Replace the `attach` function and observer wiring:

```ts
    let observedHero: Element | null = null
    let observedPager: Element | null = null
    let roHero: ResizeObserver | null = null
    let roPager: ResizeObserver | null = null

    const readHeight = (entry: ResizeObserverEntry): number | null => {
      /* borderBoxSize includes padding so the measurement matches what's
         rendered; contentRect would under-measure. Fallback to
         getBoundingClientRect for older browsers. */
      const h = entry?.borderBoxSize?.[0]?.blockSize
        ?? entry?.target?.getBoundingClientRect()?.height
      return typeof h === 'number' && h > 0 ? Math.ceil(h) : null
    }

    const attach = () => {
      const heroEl = root.querySelector('[data-detail-hero]')
      if (heroEl && heroEl !== observedHero) {
        if (roHero) roHero.disconnect()
        observedHero = heroEl
        roHero = new ResizeObserver(entries => {
          const h = readHeight(entries[0])
          if (h != null) setDetailHeroPx(h)
        })
        roHero.observe(heroEl)
      }

      const pagerEl = root.querySelector('[data-detail-pager]')
      if (!pagerEl) {
        /* Pager unmounted (single-result filter, must-eat detail) → the
           middle stage degrades to photo-only. */
        if (observedPager) { roPager?.disconnect(); roPager = null; observedPager = null }
        setDetailPagerPx(0)
      } else if (pagerEl !== observedPager) {
        if (roPager) roPager.disconnect()
        observedPager = pagerEl
        roPager = new ResizeObserver(entries => {
          const h = readHeight(entries[0])
          if (h != null) setDetailPagerPx(h)
        })
        roPager.observe(pagerEl)
      }
    }
    attach()
    /* The hero/pager elements are conditionally rendered (per restaurant
       change). A MutationObserver on the sheet root re-attaches whenever
       the DOM swaps. */
    const mo = new MutationObserver(attach)
    mo.observe(root, { childList: true, subtree: true })

    return () => {
      mo.disconnect()
      roHero?.disconnect()
      roPager?.disconnect()
      observedHero = null
      observedPager = null
      roHero = null
      roPager = null
    }
```

And in the `sheetView !== 'detail'` early-return at the top of that effect, reset both:

```ts
    if (sheetView !== 'detail') {
      setDetailHeroPx(null)
      setDetailPagerPx(0)
      return
    }
```

(The existing follow-up effect at lines ~143-147 — re-configure + `reapplySnap('peek')` when parked at peek — picks up the new heights automatically because `viewConfig` now depends on `detailPagerPx`.)

- [ ] **Step 4: Run tests + type-check**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu/nextjs"
npm test
npx tsc --noEmit
```

Expected: both exit 0 (check the exit code directly — do not pipe).

- [ ] **Step 5: Commit**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu"
git status
git add nextjs/lib/map/useMapSheet.ts
git commit -m "feat(map): include pager in measured detail middle stage"
```

---

### Task 4: Handle-tap at peek expands to the correct snap (`useBottomSheet.ts`)

Today a tap on the grab handle at `peek` always does `setSnap('mid')` (line ~412-414). For the detail view `mid` (420px visible) is *smaller* than the new middle stage (~530px) and isn't in its allowed snaps — the sheet would jump DOWN. Expand to the next-larger allowed snap instead.

**Files:**
- Modify: `nextjs/lib/map/useBottomSheet.ts:412-416`

- [ ] **Step 1: Fix the tap-to-expand branch**

Replace:

```ts
      // Tap on handle when peeking → expand to mid
      if (displacement < 6 && snapRef.current === 'peek') {
        setSnap('mid')
        return
      }
```

with:

```ts
      // Tap on handle when peeking → expand to the next-larger allowed snap
      // ('mid' for the list, 'full' for the detail view whose snaps are
      // ['full','peek'] — its peek is taller than mid, so 'mid' would move
      // the sheet DOWN).
      if (displacement < 6 && snapRef.current === 'peek') {
        const allowedSnaps = configRef.current.snaps ?? (maxSnap ? ['mid', 'peek'] : ['full', 'mid', 'peek'])
        setSnap(allowedSnaps.includes('mid') ? 'mid' : 'full')
        return
      }
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu/nextjs"
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu"
git status
git add nextjs/lib/map/useBottomSheet.ts
git commit -m "fix(map): handle-tap at detail peek expands to full, not mid"
```

---

### Task 5: Origin-aware open snap + paging keeps the middle stage (`MapSection.tsx`, `MapSectionBody.tsx`)

**Files:**
- Modify: `nextjs/app/components/MapSection.tsx` (pending-snap ref, layout effect ~142-149, `handleRestaurantClick` ~246-273, `handleMustEatClick` ~326-365, `getFlyPadding` ~207-244)
- Modify: `nextjs/app/components/map/MapSectionBody.tsx:89,169` (prop type + marker wrap)

- [ ] **Step 1: Add imports and the pending-snap ref**

In `MapSection.tsx`, add to the imports (alongside the existing `lib/map` imports):

```ts
import { estimateDetailMidVisiblePx } from '@/lib/map/detailSnap'
```

Near the `snapRef` declaration (line ~140), add:

```ts
  /* Snap explicitly requested by an open-detail handler (pin-tap → 'peek',
     list/search/deep-link → 'full'). Consumed once by the layout effect
     below; null for selection changes that arrive WITHOUT a handler call
     (prev/next paging), which keep the current position. */
  const pendingDetailSnapRef = useRef<'full' | 'peek' | null>(null)
```

- [ ] **Step 2: Rewrite the snap-on-detail-entry layout effect**

Replace the effect at lines ~142-149:

```ts
  useLayoutEffect(() => {
    if (sheetView !== 'detail') return
    if (typeof window === 'undefined') return
    if (!window.matchMedia('(max-width: 1023.98px)').matches) return
    const requested = pendingDetailSnapRef.current
    pendingDetailSnapRef.current = null
    /* No explicit request = pager-driven selection swap → keep the user's
       position: stay at the middle stage when paging from there, stay at
       full when paging from full. ('mid' can only be a transient leftover
       from the list view — normalize it to full like before.) */
    const target = requested ?? (snapRef.current === 'peek' ? 'peek' : 'full')
    setSnap(target)
    reapplySnap(target)
  }, [sheetView, selectedRestaurant?._id, selectedMustEat?._id, setSnap, reapplySnap])
```

- [ ] **Step 3: Add the origin parameter to `handleRestaurantClick`**

Replace the handler (lines ~246-273):

```ts
  const handleRestaurantClick = useCallback((r: MapRestaurant, origin: 'list' | 'map' = 'list') => {
    userInteractedRef.current = true
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023.98px)').matches
    // Capture the list scroll *before* the view switches and the content
    // element unmounts — useLayoutEffect on return restores it.
    if (sheetView === 'list' && contentRef.current) {
      listScrollRef.current = contentRef.current.scrollTop
    }
    // Selecting a search result implicitly accepts it — clear the query so
    // when the user later goes back to "alle Must Eats" or the list, they
    // see the full data set, not the still-filtered subset.
    setSearch('')
    setSearchOpen(false)
    setSelectedRestaurant(r)
    setSelectedMustEat(null)
    // Both mobile sheet AND desktop sidebar render the detail inline now —
    // desktop no longer uses a centered floating modal that hid the marker.
    setSheetView('detail')
    // List/search/deep-link → open fully (the user clicked to read content).
    // Pin-tap on the map → open at the middle stage (photo + pager) so the
    // map context stays visible; pull up for the full detail.
    const openAtPeek = isMobile && origin === 'map'
    const target = openAtPeek ? 'peek' : 'full'
    pendingDetailSnapRef.current = target
    setSnap(target)
    mapRef.current?.flyTo({
      center: [r.lng, r.lat],
      zoom: 15,
      duration: 500,
      padding: openAtPeek
        ? getFlyPadding('peek', estimateDetailMidVisiblePx(window.innerWidth, displayedRestaurants.length > 1, safeAreaBottomRef.current))
        : getFlyPadding(isMobile ? 'full' : undefined),
    })
  }, [getFlyPadding, setSearch, setSheetView, setSnap, sheetView, contentRef, displayedRestaurants.length])
```

For `safeAreaBottomRef`: export `readSafeAreaBottom` from `useMapSheet.ts` (change `function readSafeAreaBottom` to `export function readSafeAreaBottom`), and in `MapSection.tsx` add near `pendingDetailSnapRef`:

```ts
import { readSafeAreaBottom } from '@/lib/map/useMapSheet'
```

```ts
  /* iOS safe-area inset, read once — feeds the pin-tap flyTo padding estimate. */
  const safeAreaBottomRef = useRef<number | null>(null)
  if (safeAreaBottomRef.current === null) {
    safeAreaBottomRef.current = typeof document !== 'undefined' ? readSafeAreaBottom() : 0
  }
```

(`safeAreaBottomRef.current` is then always a number; the `estimateDetailMidVisiblePx` call can use `safeAreaBottomRef.current ?? 0` if TypeScript complains about `number | null`.)

- [ ] **Step 4: Set the pending snap in the other open paths**

`handleMustEatClick` (lines ~326-365) opens at full in both branches (`if (isMobile) setSnap('full')`). Directly before EACH of the two `if (isMobile) setSnap('full')` lines, add:

```ts
      pendingDetailSnapRef.current = 'full'
```

(There are no must-eat markers on the map — must-eats open from the list or from a restaurant detail, so no origin parameter is needed here.)

Also check `handleViewRestaurantFromMustEat` (line ~386): it delegates to `handleRestaurantClick(restaurant)` → default `'list'` → full. No change needed.

- [ ] **Step 5: Add the `visiblePx` override to `getFlyPadding`**

Replace the signature and the `if (targetSnap)` branch (lines ~207-232):

```ts
  const getFlyPadding = useCallback((targetSnap?: 'peek' | 'mid' | 'full', visiblePxOverride?: number) => {
    if (typeof window === 'undefined') return { top: 60, bottom: 60, left: 40, right: 40 }
    const isMobile = window.matchMedia('(max-width: 1023.98px)').matches
    if (!isMobile) {
      // Desktop: the map canvas IS the left grid cell — the side panel is
      // outside the canvas. Reserve a bit of room at top (toolbar) and bottom
      // (zoom controls + FAB); horizontal stays symmetric so the marker lands
      // at the column's geometric center.
      return { top: 80, bottom: 100, left: 24, right: 24 }
    }
    // When the caller specifies a target snap, use known pixel heights for
    // that snap (or an explicit visible-height override — the detail middle
    // stage is content-sized, not a fixed constant). Otherwise read the
    // *actual* current sheet height from the CSS var the bottom-sheet hook
    // sets — the only source of truth that handles drag in-progress AND the
    // content-fit detail snap.
    let visible: number
    if (visiblePxOverride != null) {
      visible = visiblePxOverride
    } else if (targetSnap) {
      visible = targetSnap === 'peek' ? 28
        : targetSnap === 'mid' ? 440
        : Math.round(window.innerHeight * 0.58)
    } else {
```

(The rest of the function — CSS-var fallback, overhang correction, return — is unchanged.)

- [ ] **Step 6: Wrap the marker click with origin `'map'` in `MapSectionBody.tsx`**

Widen the prop type (line ~89):

```ts
  onRestaurantClick: (r: MapRestaurant, origin?: 'list' | 'map') => void
```

And at the `MapCanvasLayer` usage (line ~169), pass a wrapped callback (the `RestaurantList` usage at line ~332 stays as-is — its calls default to `'list'`):

```tsx
              onRestaurantClick={(r) => onRestaurantClick(r, 'map')}
```

`MapCanvasLayer`'s own prop type (`(r: MapRestaurant) => void`) is satisfied by the wrapper — no change there.

- [ ] **Step 7: Run tests + type-check**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu/nextjs"
npm test
npx tsc --noEmit
```

Expected: both exit 0.

- [ ] **Step 8: Commit**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu"
git status
git add nextjs/app/components/MapSection.tsx nextjs/app/components/map/MapSectionBody.tsx nextjs/lib/map/useMapSheet.ts
git commit -m "feat(map): pin-tap opens detail at middle stage; paging keeps position"
```

(`useMapSheet.ts` is in this commit only for the `export` keyword on `readSafeAreaBottom` — if you exported it already in Task 3, drop it from the `git add`.)

---

### Task 6: Manual smoke test (dev server, mobile viewport)

**Files:** none

- [ ] **Step 1: Start dev** (make sure no `npm run build` runs in parallel — it corrupts `.next/` for the dev server)

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu/nextjs"
npm run dev
```

- [ ] **Step 2: Verify in a mobile viewport (390×844, touch emulation) on `http://localhost:3000`**

Checklist (all on the map page):
1. List card tap → detail opens FULL (thin map strip on top) — unchanged.
2. Map pin tap → detail opens at the MIDDLE stage: photo fully visible, pager row below it, both within the sheet; map visible above. No jump after the photo loads (estimate ≈ measurement).
3. At the middle stage, tap the pager arrows → prev/next restaurant swaps in place, camera flies, sheet STAYS at the middle stage (the photo height may differ slightly per name wrap — it should settle without a visible fight).
4. Drag the sheet between full ↔ middle; a tap on the grab handle at the middle stage expands to FULL (not downward).
5. Drag well below the middle stage → detail dismisses, list returns at mid height, camera flies back — unchanged behavior.
6. Map tap while detail is at full → collapses to the middle stage with photo + pager visible.
7. Filter so only ONE restaurant matches (e.g. search) → open it via pin → middle stage is photo-only, no dead band where the pager would be.
8. Open a must-eat from the list → detail opens full; drag down → the bottom stage shows the must-eat card fully (not a 220px slice).
9. Desktop viewport (≥1024px) → side panel behavior unchanged; pin click opens the detail in the panel as before.

- [ ] **Step 3: Stop the dev server** (frees `.next/` for the build in Task 7)

---

### Task 7: Full build + push + PR to staging

**Files:** none

- [ ] **Step 1: Full verification**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu/nextjs"
npm test
npm run build
```

Expected: both exit 0. (Run `npm run build` even though the pre-push hook exists — the hook skips the build on new-branch pushes. If the build fails with `UND_ERR_CONNECT_TIMEOUT`, that's a Sanity CDN flake — retry once.)

- [ ] **Step 2: Push and open PR against `staging`**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu"
git log origin/main..HEAD --stat   # verify ONLY this feature's commits (+ the spec commit)
git push -u origin feat/detail-sheet-mid-snap
gh pr create --base staging --title "Mobile detail sheet: middle stage with photo + pager" --body "$(cat <<'EOF'
On mobile, the restaurant-detail sheet's bottom anchor now shows the hero photo plus the prev/next pager (middle stage). Tapping a map pin opens the detail at this stage so the map stays visible; list/search/deep-link still open full. Paging keeps the current stage. Must-eat details now measure their card for the bottom stage instead of the static 220px fallback.

Spec: docs/specs/2026-06-11-detail-sheet-mid-snap-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Note (public repo): keep the PR body to the feature description above — no internal details beyond that.

- [ ] **Step 3: Smoke on the staging URL after the PR merges** (Basic-Auth-gated; mobile viewport, same checklist as Task 6 items 2-6).

---

## Self-Review Notes

- **Spec coverage:** middle stage measurement (Tasks 1-3), pin-tap origin (Task 5), paging keeps position (Task 5 Step 2), must-eat hero tagging (Task 2), handle-tap fix surfaced by the new geometry (Task 4), dismiss/list-return explicitly unchanged (verified by smoke items 5), edge cases: no-pager → 0 (Task 3 Step 3 + smoke item 7), SSR fallback kept (Task 3 Step 2).
- **Naming consistency:** `detailMidVisiblePx` / `estimateDetailMidVisiblePx` / `DETAIL_PAGER_ESTIMATE_PX` used identically in Tasks 1, 3, 5. `readSafeAreaBottom` export introduced in Task 5 Step 3.
- **Spec deviation (corrected in spec):** there are no must-eat map pins (`MapCanvasLayer` renders restaurant markers only) — the must-eat middle stage is reached by dragging down, not by pin-tap.
