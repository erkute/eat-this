import { useCallback, useRef, useState } from 'react'
import { useBottomSheet } from './useBottomSheet'

export type SheetView = 'list' | 'detail'

const VIEW_CONFIG = {
  /* detail-peek shows handle + name-row + 3 round actions — sized just tight
     enough for that strip, no whitespace under the buttons. */
  detail: { maxSnap: null, dragMode: 'all' as const, peekVisiblePx: 68 },
  /* list-peek shows handle + count/sort/search/filter row + category tabs
     (Abendessen / Mittagessen / Frühstück) so the user can switch category
     without expanding the sheet. Restaurant rows stay hidden until pull-up. */
  list:   { maxSnap: null, dragMode: 'all' as const, peekVisiblePx: 100 },
}

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
export function useMapSheet() {
  const sheet = useBottomSheet('mid')
  const [sheetView, setSheetViewState] = useState<SheetView>('list')

  const sheetElRef = useRef<HTMLDivElement | null>(null)
  const sheetRef = sheet.sheetRef
  const configure = sheet.configure
  const setSheetRef = useCallback((el: HTMLDivElement | null) => {
    sheetElRef.current = el
    sheetRef(el)
  }, [sheetRef])

  // Initial configure on mount so the first applyY (in the sheet ref-callback)
  // already has the right list peek size.
  if (!sheetElRef.current) configure(VIEW_CONFIG.list)

  const setSheetView = useCallback((view: SheetView) => {
    /* Configure synchronously BEFORE the state update so any reapplySnap that
       follows in the same handler reads this view's peek size, not the previous
       view's. Otherwise the sheet briefly parks at the old peek height (white
       space gap) until the next render's effect catches up. */
    configure(VIEW_CONFIG[view])
    setSheetViewState(view)
  }, [configure])

  return {
    ...sheet,
    sheetView,
    setSheetView,
    sheetElRef,
    setSheetRef,
  }
}
