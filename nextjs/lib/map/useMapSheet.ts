import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBottomSheet, type SheetSnap } from './useBottomSheet';
import { detailMidVisiblePx, estimateDetailMidVisiblePx } from './detailSnap';

export type SheetView = 'list' | 'detail';

/* Read the iOS safe-area-inset-bottom (~34 px on iPhones with home
   indicator, 0 on Android / desktop) so the peek snap accounts for it.
   Without this, the bottom of the visible peek strip falls behind the
   home indicator and content there appears cut off. */
export function readSafeAreaBottom(): number {
  if (typeof document === 'undefined') return 0;
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;left:0;bottom:0;visibility:hidden;pointer-events:none;' +
    'padding-bottom:env(safe-area-inset-bottom,0px);';
  document.body.appendChild(probe);
  const px = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  document.body.removeChild(probe);
  return px;
}

/* Base content heights (above any iOS safe-area). Per-view peek sizes
   reflect what's actually rendered at the top of the sheet:
   - detail ("middle stage" / bottom anchor): everything from the sheet's
     top down to the bottom of the last element visible there — the
     prev/next pager for a restaurant (photo + pager), or the dish-name
     block for a must-eat (card + name). That bottom edge is measured live
     via ResizeObservers on the [data-detail-hero] / [data-detail-pager]
     elements (see effect below). Before the first measurement lands a
     viewport-width estimate (estimateDetailMidVisiblePx) stands in so the
     sheet doesn't visibly jump; DETAIL_PEEK_BASE_PX is only the SSR-safe
     last resort.
   - list: handle + listHeaderRow + filterChipRow = 120 */
const DETAIL_PEEK_BASE_PX = 220;
/* List peek = handle (~24) + filter chip row (padding 24+10 + chip ~24 ≈ 58)
   ≈ 82, plus a little buffer. After map-v2 the listHeaderRow is gone, so
   the old 120 left empty sheet-bg between the chip row and the visible
   bottom of the sheet at peek. */
const LIST_PEEK_BASE_PX = 90;

/**
 * Owns the map-sheet state machine: combines the generic `useBottomSheet`
 * primitive with the `sheetView` ('list' vs 'detail') flag and per-view drag
 * config (peek size, drag mode).
 *
 * `setSheetView` calls `configure` synchronously so callers can do
 *   setSheetView('list'); setSnap('peek'); reapplySnap('peek')
 * without a one-frame race where reapplySnap reads the previous view's peek
 * size and parks the sheet at the wrong height.
 */
export function useMapSheet(onDetailDismiss?: () => void) {
  const sheet = useBottomSheet('mid');
  const [sheetView, setSheetViewState] = useState<SheetView>('list');
  /* Measured bottom-edge offset (relative to the sheet's top) of the last
     element visible at the detail middle stage — the pager when rendered
     (restaurant), otherwise the hero/dish-name (must-eat). Measuring the
     offset instead of summing element heights keeps margins/gaps included,
     and the same code serves both detail kinds (the rendered DOM differs,
     the formula doesn't). Initialized null so the first config uses the
     estimate fallback; flips to the measured value once the ResizeObservers
     below fire. */
  const [detailContentBottomPx, setDetailContentBottomPx] = useState<number | null>(null);

  /* Per-view config rebuilds whenever the measured hero height changes so the
     bottom-sheet's peek snap reflects the live content. iOS safe-area is read
     once at mount. */
  const viewConfig = useMemo(() => {
    const safeAreaBottom = readSafeAreaBottom();
    /* Middle stage = sheet top → pager bottom (restaurant) or dish-name
       bottom (must-eat), +4px sub-pixel buffer, + safe area — the formula
       lives in detailSnap.ts. Pre-measurement the viewport-width estimate
       stands in (assumes a restaurant photo + pager; the measurement
       corrects within a frame of the detail mounting, must-eat included). */
    const detailPeek =
      detailContentBottomPx != null
        ? detailMidVisiblePx(detailContentBottomPx, safeAreaBottom)
        : typeof window !== 'undefined'
          ? estimateDetailMidVisiblePx(window.innerWidth, true, safeAreaBottom)
          : DETAIL_PEEK_BASE_PX + safeAreaBottom;
    const detailSnaps: SheetSnap[] = ['full', 'peek'];
    // Detail: TWO anchors — 'full' at the top (minimal map strip) and 'peek'
    // lower down (restaurant: photo + pager; must-eat: card + dish name ≈
    // half height). No 'mid'. A downward swipe settles at peek; only a swipe
    // well BELOW peek dismisses (back to the list) via onDismiss. List:
    // full/mid/peek (snaps undefined = default), no dismiss. Both keys set
    // explicitly so configure()'s merge clears the other view's value when
    // switching.
    return {
      // Detail keeps the fixed drag-sheet on every viewport (inflow: false).
      detail: {
        maxSnap: null,
        snaps: detailSnaps,
        dragMode: 'all' as const,
        peekVisiblePx: detailPeek,
        onDismiss: onDetailDismiss,
        inflow: false,
      },
      // List view is window-scrolled in-flow on phones (≤767.98px) so the rows
      // frost through iOS Safari's bottom URL bar — useBottomSheet goes fully
      // inert there (no drag, no --sheet-y). Tablets keep the drag-sheet.
      list: {
        maxSnap: null,
        snaps: undefined,
        dragMode: 'all' as const,
        peekVisiblePx: LIST_PEEK_BASE_PX + safeAreaBottom,
        onDismiss: undefined,
        inflow: true,
      },
    };
  }, [detailContentBottomPx, onDetailDismiss]);

  const sheetElRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = sheet.sheetRef;
  const configure = sheet.configure;
  const reapplySnap = sheet.reapplySnap;
  const currentSnap = sheet.snap;
  const setSheetRef = useCallback(
    (el: HTMLDivElement | null) => {
      sheetElRef.current = el;
      sheetRef(el);
    },
    [sheetRef]
  );

  // Initial configure on mount so the first applyY (in the sheet ref-callback)
  // already has the right list peek size.
  if (!sheetElRef.current) configure(viewConfig.list);

  /* Observe the [data-detail-hero] block whenever the detail view is mounted.
     Re-targets the observer if the element swaps (e.g. restaurant change).
     Cleans up when the view goes back to 'list'. */
  useEffect(() => {
    if (sheetView !== 'detail') {
      setDetailContentBottomPx(null);
      return;
    }
    const root = sheetElRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;

    let observedHero: Element | null = null;
    let observedPager: Element | null = null;
    let roHero: ResizeObserver | null = null;
    let roPager: ResizeObserver | null = null;

    /* Bottom edge of the last middle-stage element (pager, else hero)
       relative to the sheet's top. Both rects live inside the same
       translated sheet, so the difference is invariant under the sheet's
       transform — safe to read mid-animation. */
    const measure = () => {
      const heroEl = root.querySelector('[data-detail-hero]');
      if (!heroEl) return;
      const pagerEl = root.querySelector('[data-detail-pager]');
      const last = pagerEl ?? heroEl;
      const bottom = last.getBoundingClientRect().bottom - root.getBoundingClientRect().top;
      if (bottom > 0) setDetailContentBottomPx(Math.ceil(bottom));
    };

    const attach = () => {
      const heroEl = root.querySelector('[data-detail-hero]');
      if (heroEl && heroEl !== observedHero) {
        if (roHero) roHero.disconnect();
        observedHero = heroEl;
        roHero = new ResizeObserver(measure);
        roHero.observe(heroEl);
      }

      const pagerEl = root.querySelector('[data-detail-pager]');
      if (!pagerEl) {
        /* Pager unmounted (single-result filter, or must-eat detail which
           has no pager) → the middle stage measures down to the hero/
           dish-name instead. */
        if (observedPager) {
          roPager?.disconnect();
          roPager = null;
          observedPager = null;
          measure();
        }
      } else if (pagerEl !== observedPager) {
        if (roPager) roPager.disconnect();
        observedPager = pagerEl;
        roPager = new ResizeObserver(measure);
        roPager.observe(pagerEl);
      }
    };
    attach();
    measure();
    /* The hero/pager elements are conditionally rendered (per restaurant
       change). A MutationObserver on the sheet root re-attaches whenever
       the DOM swaps. */
    const mo = new MutationObserver(attach);
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      roHero?.disconnect();
      roPager?.disconnect();
      observedHero = null;
      observedPager = null;
      roHero = null;
      roPager = null;
    };
  }, [sheetView]);

  /* When the detail peek size changes (different restaurant or name wrap
     change), re-configure the sheet so subsequent snaps use the new value.
     If currently parked at peek, reapply so the visual updates immediately. */
  useEffect(() => {
    if (sheetView !== 'detail') return;
    configure(viewConfig.detail);
    if (currentSnap === 'peek') reapplySnap('peek');
  }, [sheetView, viewConfig, configure, reapplySnap, currentSnap]);

  /* Re-konfigurieren wenn sich die List-View-Config ändert während die
     Liste offen ist; bei peek-Snap sofort reapply. */
  useEffect(() => {
    if (sheetView !== 'list') return;
    configure(viewConfig.list);
    if (currentSnap === 'peek') reapplySnap('peek');
  }, [sheetView, viewConfig, configure, reapplySnap, currentSnap]);

  const setSheetView = useCallback(
    (view: SheetView) => {
      /* Configure synchronously BEFORE the state update so any reapplySnap that
       follows in the same handler reads this view's peek size, not the previous
       view's. Otherwise the sheet briefly parks at the old peek height (white
       space gap) until the next render's effect catches up. */
      configure(view === 'list' ? viewConfig.list : viewConfig.detail);
      setSheetViewState(view);
    },
    [configure, viewConfig]
  );

  return {
    ...sheet,
    sheetView,
    setSheetView,
    sheetElRef,
    setSheetRef,
  };
}
