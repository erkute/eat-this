import { useCallback, useEffect, useRef, useState } from 'react'
import { useBottomSheet } from './useBottomSheet'

export type SheetView = 'list' | 'detail'

/**
 * Combines the generic `useBottomSheet` primitive with the map-specific
 * `sheetView` ('list' vs 'detail') state and the drag-config side-effect that
 * locks dragging while a detail is open.
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

  // Lock drag in detail view (no handle, no swipe-up to full); unlock for list.
  useEffect(() => {
    configure(sheetView === 'detail'
      ? { maxSnap: null, locked: true }
      : { maxSnap: null, locked: false }
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
