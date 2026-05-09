import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MapLayer } from '@/lib/types'
import { useBottomSheet } from './useBottomSheet'

export type SheetView = 'list' | 'detail'

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

/* Base content heights (above any iOS safe-area). Per-layer peek sizes
   reflect what's actually rendered at the top of the sheet:
   - detail: handle + name-row + 3 round actions = 68
   - restaurants list: handle + count/search/filter row + category tabs = 100
   - must-eats list: handle + LayerToggle (must-eats has no in-list header
     beyond the layer switcher) = 76 */
const DETAIL_PEEK_BASE_PX             = 68
const LIST_RESTAURANTS_PEEK_BASE_PX   = 100
const LIST_MUSTEATS_PEEK_BASE_PX      = 76

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
interface UseMapSheetArgs {
  layer: MapLayer
}

export function useMapSheet({ layer }: UseMapSheetArgs) {
  const sheet = useBottomSheet('mid')
  const [sheetView, setSheetViewState] = useState<SheetView>('list')

  /* Per-view config is stable but depends on the iOS safe-area (read once at
     mount) and the active layer (must-eats list peeks tighter than the
     restaurants list because there's no in-list header to show). */
  const viewConfig = useMemo(() => {
    const safeAreaBottom = readSafeAreaBottom()
    const listPeekBase = layer === 'mustEats'
      ? LIST_MUSTEATS_PEEK_BASE_PX
      : LIST_RESTAURANTS_PEEK_BASE_PX
    return {
      detail: { maxSnap: null, dragMode: 'all' as const, peekVisiblePx: DETAIL_PEEK_BASE_PX + safeAreaBottom },
      list:   { maxSnap: null, dragMode: 'all' as const, peekVisiblePx: listPeekBase        + safeAreaBottom },
    }
  }, [layer])

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

  /* When the layer flips while the sheet stays in list view, re-apply the
     config + current snap so the sheet shifts to the new layer's peek size
     immediately (e.g. switching from Restaurants → Must-Eats collapses the
     visible strip from ~132 to ~60 px). */
  useEffect(() => {
    if (sheetView !== 'list') return
    configure(viewConfig.list)
    reapplySnap(currentSnap)
  }, [layer, sheetView, viewConfig, configure, reapplySnap, currentSnap])

  const setSheetView = useCallback((view: SheetView) => {
    /* Configure synchronously BEFORE the state update so any reapplySnap that
       follows in the same handler reads this view's peek size, not the previous
       view's. Otherwise the sheet briefly parks at the old peek height (white
       space gap) until the next render's effect catches up. */
    configure(viewConfig[view])
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
