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

/* Base content heights (above any iOS safe-area). Per-view peek sizes
   reflect what's actually rendered at the top of the sheet:
   - detail: handle + name-row + 3 round actions = 68
   - list (both layers): handle + listHeaderRow + filterChipRow = 120
     (After map-v2 the must-eats list uses the same chip-row header as
     restaurants — no more layer-specific peek base.) */
const DETAIL_PEEK_BASE_PX = 68
const LIST_PEEK_BASE_PX   = 120

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
  // layer is still accepted so callers can pass it in (the deep-link hook
  // expects this shape); list peek size no longer depends on it.
  void layer
  const sheet = useBottomSheet('mid')
  const [sheetView, setSheetViewState] = useState<SheetView>('list')

  /* Per-view config is stable except for the iOS safe-area (read once at
     mount). Both layers share the same list-header height now. */
  const viewConfig = useMemo(() => {
    const safeAreaBottom = readSafeAreaBottom()
    return {
      detail: { maxSnap: null, dragMode: 'all' as const, peekVisiblePx: DETAIL_PEEK_BASE_PX + safeAreaBottom },
      list:   { maxSnap: null, dragMode: 'all' as const, peekVisiblePx: LIST_PEEK_BASE_PX   + safeAreaBottom },
    }
  }, [])

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

  /* List-view config doesn't depend on layer anymore — same header for both
     restaurants and must-eats. setSheetView still configures on transition. */

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
