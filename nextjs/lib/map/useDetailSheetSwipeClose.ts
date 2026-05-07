import { useEffect, type RefObject } from 'react'
import { flushSync } from 'react-dom'
import type { MapRestaurant, MapMustEat } from '@/lib/types'

interface Args {
  sheetElRef: RefObject<HTMLDivElement | null>
  contentRef: RefObject<HTMLDivElement | null>
  sheetView: 'list' | 'detail'
  selectedRestaurant: MapRestaurant | null
  selectedMustEat: MapMustEat | null
  onRestaurantClose: () => void
  onMustEatClose: () => void
}

/**
 * Mobile-only swipe-down-to-close on the detail sheet. Only initiates from the
 * hero region (top ~240 px) AND when the inner content scroll is at the top —
 * so users can still scroll the body content without triggering close.
 *
 * On release-past-threshold a two-phase animation runs:
 *   Phase 1 (~180 ms): slide the detail fully off-screen.
 *   Phase 2 (~280 ms): swap content to list, slide back up to mid.
 * The user perceives "detail goes down, list comes up" with no visual pop.
 */
export function useDetailSheetSwipeClose({
  sheetElRef,
  contentRef,
  sheetView,
  selectedRestaurant,
  selectedMustEat,
  onRestaurantClose,
  onMustEatClose,
}: Args) {
  useEffect(() => {
    if (sheetView !== 'detail') return
    if (typeof window === 'undefined') return
    if (!window.matchMedia('(max-width: 1023.98px)').matches) return
    const sheet = sheetElRef.current
    const mount = contentRef.current
    if (!sheet || !mount) return

    let startY: number | null = null
    let basePx = 0
    let active = false

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const sheetRect = sheet.getBoundingClientRect()
      const offset = e.touches[0].clientY - sheetRect.top
      // Only initiate from the hero region (avoids fighting body scrolls).
      if (offset > 240) return
      const scroller = mount.querySelector<HTMLElement>('[data-detail-scroll]')
      if (scroller && scroller.scrollTop > 5) return
      startY = e.touches[0].clientY
      const cssY = sheet.style.getPropertyValue('--sheet-y')
      basePx = cssY ? parseFloat(cssY) : 0
      active = false
    }

    const onMove = (e: TouchEvent) => {
      if (startY === null) return
      const dy = e.touches[0].clientY - startY
      if (dy < 0) return
      if (!active && dy < 8) return
      if (!active) {
        active = true
        // Kill the transition while the finger drives the sheet so movement
        // is 1:1 instead of stuttering through 0.28 s eases per frame.
        sheet.style.transition = 'none'
      }
      // Block native scroll / pull-to-refresh during the drag so Chrome's
      // mobile-emulation rubber-band can't fight our sheet movement and
      // leave it stuck at the bottom on release.
      if (e.cancelable) e.preventDefault()
      sheet.style.setProperty('--sheet-y', `${basePx + dy}px`)
    }

    const onEnd = (e: TouchEvent) => {
      if (startY === null) return
      const dy = (e.changedTouches[0]?.clientY ?? startY) - startY
      startY = null
      if (!active) return
      active = false
      if (dy > 110) {
        const sheetH = sheet.getBoundingClientRect().height
        sheet.style.transition = 'transform 0.18s ease-out'
        requestAnimationFrame(() => {
          sheet.style.setProperty('--sheet-y', `${sheetH}px`)
        })
        window.setTimeout(() => {
          // Sheet is now off-screen. flushSync forces the React re-render
          // synchronously so the DOM swap detail → list COMPLETES before the
          // browser paints the next frame. Without this, the up-animation
          // briefly paints with the OLD detail content visible (a ~16 ms
          // "Bup!" of the detail bouncing up before list shows).
          sheet.style.transition = 'transform 0.22s cubic-bezier(.2,.7,.2,1)'
          flushSync(() => {
            if (selectedRestaurant) onRestaurantClose()
            else if (selectedMustEat) onMustEatClose()
          })
          // Now content is list and --sheet-y is at mid (set by reapplySnap
          // inside the close handler). Browser animates from off-screen up
          // to mid, with list visible the whole time.
          window.setTimeout(() => { sheet.style.transition = '' }, 240)
        }, 180)
      } else {
        // Snap back smoothly to the auto-sized detail height.
        sheet.style.transition = 'transform 0.18s ease-out'
        requestAnimationFrame(() => {
          sheet.style.setProperty('--sheet-y', `${basePx}px`)
        })
        window.setTimeout(() => { sheet.style.transition = '' }, 200)
      }
    }

    sheet.addEventListener('touchstart', onStart, { passive: true })
    sheet.addEventListener('touchmove', onMove, { passive: false })
    sheet.addEventListener('touchend', onEnd)
    sheet.addEventListener('touchcancel', onEnd)
    return () => {
      sheet.removeEventListener('touchstart', onStart)
      sheet.removeEventListener('touchmove', onMove)
      sheet.removeEventListener('touchend', onEnd)
      sheet.removeEventListener('touchcancel', onEnd)
    }
  }, [
    sheetView,
    selectedRestaurant,
    selectedMustEat,
    onRestaurantClose,
    onMustEatClose,
    contentRef,
    sheetElRef,
  ])
}
