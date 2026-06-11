import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useBottomSheet, type SheetSnap } from './useBottomSheet'

export type SheetView = 'list' | 'detail'
export type DetailKind = 'restaurant' | 'mustEat'

/* Read the iOS safe-area-inset-bottom (~34 px on iPhones with home
   indicator, 0 on Android / desktop) so the peek snap accounts for it.
   Without this, the bottom of the visible peek strip falls behind the
   home indicator and content there appears cut off. */
function readSafeAreaBottom(): number {
  if (typeof document === 'undefined') return 0
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;left:0;bottom:0;visibility:hidden;pointer-events:none;' +
    'padding-bottom:env(safe-area-inset-bottom,0px);'
  document.body.appendChild(probe)
  const px = parseFloat(getComputedStyle(probe).paddingBottom) || 0
  document.body.removeChild(probe)
  return px
}

/* Base content heights (above any iOS safe-area). Per-view peek sizes
   reflect what's actually rendered at the top of the sheet:
   - restaurant detail: handle (~24) + coral hero block. Die Höhe variiert
             mit dem Namens-Umbruch (1 vs 2 Zeilen) und wird zur Laufzeit
             per ResizeObserver am [data-detail-hero]-Element gemessen
             (see effect below). DETAIL_PEEK_BASE_PX is the fallback used
             before the first measurement lands.
   - must-eat detail: unterer Snap = Karte + Gerichtsname sichtbar
             (≈ halbe Höhe, User 2026-06-11). Handle + Card-Block +
             gemessener Name ([data-detail-hero] = .fdName). Die
             Card-Geometrie spiegelt .detailV13MustEat .fdHero in
             map.module.css: clamp(180px, 36dvh, 340px) + 26px oben /
             12px unten — zusammen ändern.
   - list: handle + listHeaderRow + filterChipRow = 120 */
const DETAIL_PEEK_BASE_PX = 220
const MUST_EAT_NAME_BASE_PX = 60
const MUST_EAT_CARD_MARGINS_PX = 26 + 12
const HANDLE_PX = 44

function mustEatCardPx(): number {
  if (typeof window === 'undefined') return 300
  return Math.min(340, Math.max(180, window.innerHeight * 0.36))
}
/* List peek = handle (~24) + filter chip row (padding 24+10 + chip ~24 ≈ 58)
   ≈ 82, plus a little buffer. After map-v2 the listHeaderRow is gone, so
   the old 120 left empty sheet-bg between the chip row and the visible
   bottom of the sheet at peek. */
const LIST_PEEK_BASE_PX            = 90

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
  const sheet = useBottomSheet('mid')
  const [sheetView, setSheetViewState] = useState<SheetView>('list')
  const [detailKind, setDetailKindState] = useState<DetailKind>('restaurant')
  /* Measured hero-block height drives the detail peek. Initialized null so
     the first config uses the static fallback; flips to the measured value
     once the ResizeObserver below fires. */
  const [detailHeroPx, setDetailHeroPx] = useState<number | null>(null)

  /* Per-view config rebuilds whenever the measured hero height changes so the
     bottom-sheet's peek snap reflects the live content. iOS safe-area is read
     once at mount. */
  const viewConfig = useMemo(() => {
    const safeAreaBottom = readSafeAreaBottom()
    /* +4 px buffer below the hero — just enough to keep fractional
       sub-pixel rounding from clipping the last meta-row pixel, while
       avoiding a visible band of the photo underneath. */
    const restaurantPeek = detailHeroPx != null
      ? HANDLE_PX + detailHeroPx + 4 + safeAreaBottom
      : DETAIL_PEEK_BASE_PX + safeAreaBottom
    /* Must-Eat: Handle + Card-Block + Name — der gemessene [data-detail-hero]
       ist hier der Gerichtsname (.fdName, padding inklusive). Kein safe-area
       Aufschlag: die Messlinie endet unter dem Namen, nicht an einer
       Interaktionszeile. */
    const mustEatPeek = HANDLE_PX + MUST_EAT_CARD_MARGINS_PX + mustEatCardPx()
      + (detailHeroPx ?? MUST_EAT_NAME_BASE_PX)
    const detailSnaps: SheetSnap[] = ['full', 'peek']
    // Detail: TWO anchors — 'full' at the top (minimal map strip) and 'peek'
    // lower down (restaurant: hero strip; must-eat: Karte + Name ≈ halbe
    // Höhe). No 'mid'. A downward swipe settles at peek; only a swipe well
    // BELOW peek dismisses (back to the list) via onDismiss. List:
    // full/mid/peek (snaps undefined = default), no dismiss. All keys set
    // explicitly so configure()'s merge clears the other view's value when
    // switching.
    const detailBase = { maxSnap: null, snaps: detailSnaps, dragMode: 'all' as const, onDismiss: onDetailDismiss }
    return {
      detailRestaurant: { ...detailBase, peekVisiblePx: restaurantPeek },
      detailMustEat:    { ...detailBase, peekVisiblePx: mustEatPeek },
      list: { maxSnap: null, snaps: undefined, dragMode: 'all' as const, peekVisiblePx: LIST_PEEK_BASE_PX + safeAreaBottom, onDismiss: undefined },
    }
  }, [detailHeroPx, onDetailDismiss])

  const sheetElRef = useRef<HTMLDivElement | null>(null)
  const sheetRef = sheet.sheetRef
  const configure = sheet.configure
  const reapplySnap = sheet.reapplySnap
  const currentSnap = sheet.snap
  const setSheetRef = useCallback((el: HTMLDivElement | null) => {
    sheetElRef.current = el
    sheetRef(el)
  }, [sheetRef])

  // Initial configure on mount so the first applyY (in the sheet ref-callback)
  // already has the right list peek size.
  if (!sheetElRef.current) configure(viewConfig.list)

  /* Observe the [data-detail-hero] block whenever the detail view is mounted.
     Re-targets the observer if the element swaps (e.g. restaurant change).
     Cleans up when the view goes back to 'list'. */
  useEffect(() => {
    if (sheetView !== 'detail') {
      setDetailHeroPx(null)
      return
    }
    const root = sheetElRef.current
    if (!root || typeof ResizeObserver === 'undefined') return

    let observed: Element | null = null
    let ro: ResizeObserver | null = null
    const attach = () => {
      const el = root.querySelector('[data-detail-hero]')
      if (!el) {
        /* Detail-Inhalt (noch) ohne [data-detail-hero] → statischer
           Peek-Fallback statt der zuletzt gemessenen Höhe des VORHERIGEN
           Inhalts — sonst peekt das Sheet je nach Herkunft unterschiedlich
           hoch (z. B. beim Wechsel Restaurant-Detail → Must-Eat). */
        if (observed) {
          ro?.disconnect()
          ro = null
          observed = null
          setDetailHeroPx(null)
        }
        return
      }
      if (el === observed) return
      if (ro) ro.disconnect()
      observed = el
      ro = new ResizeObserver(entries => {
        /* borderBoxSize includes the hero's padding (14px top/bottom) so
           the measurement matches what's actually rendered. contentRect
           is content-box and would under-measure by ~28px — enough to
           clip the meta-line (district/category/price) at peek. Fallback
           to getBoundingClientRect for older browsers without
           borderBoxSize. */
        const entry = entries[0]
        const h = entry?.borderBoxSize?.[0]?.blockSize
          ?? entry?.target?.getBoundingClientRect()?.height
        if (typeof h === 'number' && h > 0) setDetailHeroPx(Math.ceil(h))
      })
      ro.observe(el)
    }
    attach()
    /* The hero element is conditionally rendered (per restaurant change). A
       MutationObserver on the sheet root re-attaches whenever the DOM swaps. */
    const mo = new MutationObserver(attach)
    mo.observe(root, { childList: true, subtree: true })

    return () => {
      mo.disconnect()
      ro?.disconnect()
      observed = null
      ro = null
    }
  }, [sheetView])

  /* When the detail peek size changes (different restaurant or name wrap
     change), re-configure the sheet so subsequent snaps use the new value.
     If currently parked at peek, reapply so the visual updates immediately. */
  useEffect(() => {
    if (sheetView !== 'detail') return
    configure(detailKind === 'mustEat' ? viewConfig.detailMustEat : viewConfig.detailRestaurant)
    if (currentSnap === 'peek') reapplySnap('peek')
  }, [sheetView, detailKind, viewConfig, configure, reapplySnap, currentSnap])

  /* Re-konfigurieren wenn sich die List-View-Config ändert während die
     Liste offen ist; bei peek-Snap sofort reapply. */
  useEffect(() => {
    if (sheetView !== 'list') return
    configure(viewConfig.list)
    if (currentSnap === 'peek') reapplySnap('peek')
  }, [sheetView, viewConfig, configure, reapplySnap, currentSnap])

  const setSheetView = useCallback((view: SheetView, kind: DetailKind = 'restaurant') => {
    /* Configure synchronously BEFORE the state update so any reapplySnap that
       follows in the same handler reads this view's peek size, not the previous
       view's. Otherwise the sheet briefly parks at the old peek height (white
       space gap) until the next render's effect catches up. */
    configure(view === 'list'
      ? viewConfig.list
      : kind === 'mustEat' ? viewConfig.detailMustEat : viewConfig.detailRestaurant)
    setDetailKindState(kind)
    setSheetViewState(view)
  }, [configure, viewConfig])

  return {
    ...sheet,
    sheetView,
    setSheetView,
    sheetElRef,
    setSheetRef,
  }
}
