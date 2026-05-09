import { useCallback, useMemo, useRef, useState } from 'react'
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

/* Base content heights (above any iOS safe-area). The actual peekVisiblePx
   is computed at mount so iPhones with a home indicator get the same
   visible content strip as Android / desktop. */
const DETAIL_PEEK_BASE_PX = 68  // handle 24 + name+3 round actions ~38 + 6 breath
const LIST_PEEK_BASE_PX   = 100 // handle 24 + count/search/filter ~40 + tabs ~30 + 6

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

  /* Per-view config is stable but depends on the iOS safe-area read at mount
     — useMemo ensures we only probe the DOM once. */
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
  const setSheetRef = useCallback((el: HTMLDivElement | null) => {
    sheetElRef.current = el
    sheetRef(el)
  }, [sheetRef])

  // Initial configure on mount so the first applyY (in the sheet ref-callback)
  // already has the right list peek size.
  if (!sheetElRef.current) configure(viewConfig.list)

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
