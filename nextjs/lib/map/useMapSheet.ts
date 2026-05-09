import { useCallback, useEffect, useRef, useState } from 'react'
import { useBottomSheet } from './useBottomSheet'

export type SheetView = 'list' | 'detail'

/**
 * Owns the map-sheet state machine: combines the generic `useBottomSheet`
 * primitive with the `sheetView` ('list' vs 'detail') flag and the drag-config
 * side-effect that locks dragging while a detail is open.
 *
 * Pairs with `useMapSheetSwipeClose` (called separately from MapSection
 * because the gesture needs selection state + close handlers that are defined
 * after `useMapSheet` returns).
 *
 * Returns the bottom-sheet primitives plus `sheetView`/`setSheetView` plus a
 * `setSheetRef` callback that captures the underlying DOM node into a local
 * ref (so the swipe-to-close hook can read `--sheet-visible-px` directly).
 */
export function useMapSheet() {
  const sheet = useBottomSheet('mid')
  const [sheetView, setSheetView] = useState<SheetView>('list')

  // Mirror the sheet element so other hooks/effects can read its current
  // `--sheet-visible-px` (set by useBottomSheet on every applyY) for accurate
  // flyTo padding and the swipe-to-close gesture.
  const sheetElRef = useRef<HTMLDivElement | null>(null)
  const sheetRef = sheet.sheetRef
  const configure = sheet.configure
  const setSheetRef = useCallback((el: HTMLDivElement | null) => {
    sheetElRef.current = el
    sheetRef(el)
  }, [sheetRef])

  // Detail view keeps the grab-handle drag active so users can pull the sheet
  // up to full like Google Maps; content/header drag is suppressed because
  // useMapSheetSwipeClose owns the body gesture (swipe-down hero → close).
  useEffect(() => {
    configure(sheetView === 'detail'
      ? { maxSnap: null, dragMode: 'handleOnly' }
      : { maxSnap: null, dragMode: 'all' }
    )
  }, [sheetView, configure])

  return {
    ...sheet,
    sheetView,
    setSheetView,
    sheetElRef,
    setSheetRef,
  }
}
