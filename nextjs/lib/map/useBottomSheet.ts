'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

export type SheetSnap = 'peek' | 'mid' | 'full'

const PEEK_VISIBLE_PX = 68 // handle + first row peek when collapsed (toolbar floats above map)
// Mid/full: handle (~36) + 3 rows (~74 each) + 4th-row teaser (~30).
// This is also the cap — the sheet never expands beyond this.
const MID_VISIBLE_PX = 300
const MOBILE_MAX = 1023.98

function snapToPx(snap: SheetSnap, sheetH: number): number {
  switch (snap) {
    // Full and mid share the same upper bound — the sheet never pulls higher
    // than "4 rows visible" so the map stays the dominant surface.
    case 'full':
    case 'mid':  return Math.max(0, sheetH - MID_VISIBLE_PX)
    case 'peek': return Math.max(0, sheetH - PEEK_VISIBLE_PX)
  }
}

function pxToNearestSnap(px: number, sheetH: number): SheetSnap {
  const snaps: SheetSnap[] = ['full', 'mid', 'peek']
  let best: SheetSnap = 'peek'
  let bestDist = Infinity
  for (const s of snaps) {
    const d = Math.abs(snapToPx(s, sheetH) - px)
    if (d < bestDist) { bestDist = d; best = s }
  }
  return best
}

function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches
}

export function useBottomSheet(initial: SheetSnap = 'peek') {
  const [snap, setSnap] = useState<SheetSnap>(initial)
  const [dragging, setDragging] = useState(false)
  const sheetNode = useRef<HTMLDivElement | null>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const dragRef   = useRef<{ startY: number; basePx: number; pointerId: number } | null>(null)
  const snapRef   = useRef<SheetSnap>(initial)
  snapRef.current = snap

  const applyY = useCallback((px: number) => {
    const el = sheetNode.current
    if (!el) return
    el.style.setProperty('--sheet-y', `${px}px`)
    const h = el.getBoundingClientRect().height
    // Visible sheet height = sheetHeight minus current translateY offset.
    // The listScroll inside can use this to cap itself so content below the
    // sheet's visible edge (clipped by overflow: hidden) can still be scrolled to.
    el.style.setProperty('--sheet-visible-px', `${Math.max(0, h - px)}px`)
  }, [])

  // Callback ref so the snap is applied the moment the element attaches —
  // regular refs + effects race against the parent's `loading` gate that
  // defers mounting the sheet.
  const sheetRef = useCallback((el: HTMLDivElement | null) => {
    sheetNode.current = el
    if (el && isMobile()) {
      const h = el.getBoundingClientRect().height
      const px = snapToPx(snapRef.current, h)
      el.style.setProperty('--sheet-y', `${px}px`)
      el.style.setProperty('--sheet-visible-px', `${Math.max(0, h - px)}px`)
    }
  }, [])

  // Sync CSS var when snap changes (non-dragging path)
  useEffect(() => {
    if (dragging) return
    const el = sheetNode.current
    if (!el || !isMobile()) return
    const h = el.getBoundingClientRect().height
    applyY(snapToPx(snap, h))
  }, [snap, dragging, applyY])

  // Re-sync on resize
  useEffect(() => {
    const onResize = () => {
      const el = sheetNode.current
      if (!el || !isMobile()) return
      const h = el.getBoundingClientRect().height
      applyY(snapToPx(snap, h))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [snap, applyY])

  // Drag handlers on the grab handle
  useEffect(() => {
    const handle = handleRef.current
    const sheet  = sheetNode.current
    if (!handle || !sheet) return

    const onDown = (e: PointerEvent) => {
      if (!isMobile()) return
      const h = sheet.getBoundingClientRect().height
      dragRef.current = { startY: e.clientY, basePx: snapToPx(snap, h), pointerId: e.pointerId }
      handle.setPointerCapture(e.pointerId)
      setDragging(true)
      e.preventDefault()
    }
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const h = sheet.getBoundingClientRect().height
      const upperCap = Math.max(0, h - MID_VISIBLE_PX)
      const next = Math.max(upperCap, Math.min(h - 40, d.basePx + (e.clientY - d.startY)))
      applyY(next)
    }
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      try { handle.releasePointerCapture(d.pointerId) } catch { /* noop */ }
      const h = sheet.getBoundingClientRect().height
      const upperCap = Math.max(0, h - MID_VISIBLE_PX)
      const finalPx = Math.max(upperCap, Math.min(h - 40, d.basePx + (e.clientY - d.startY)))
      dragRef.current = null
      setDragging(false)
      setSnap(pxToNearestSnap(finalPx, h))
    }

    handle.addEventListener('pointerdown',   onDown)
    handle.addEventListener('pointermove',   onMove)
    handle.addEventListener('pointerup',     onUp)
    handle.addEventListener('pointercancel', onUp)
    return () => {
      handle.removeEventListener('pointerdown',   onDown)
      handle.removeEventListener('pointermove',   onMove)
      handle.removeEventListener('pointerup',     onUp)
      handle.removeEventListener('pointercancel', onUp)
    }
  }, [snap, applyY])

  // Content-area drag: allow swiping on the list itself to expand/collapse the
  // sheet, but only when it wouldn't conflict with in-list scrolling.
  // - Sheet not at 'full' → swipe takes over (list isn't really scrollable yet).
  // - Sheet at 'full' and scrollTop === 0 and swipe is downward → drag sheet down.
  // - Otherwise → let the list scroll normally.
  useEffect(() => {
    const content = contentRef.current
    const sheet   = sheetNode.current
    if (!content || !sheet) return

    let touchState: {
      startY: number
      basePx: number
      intercepted: boolean
      decided: boolean
    } | null = null

    const onTouchStart = (e: TouchEvent) => {
      if (!isMobile()) return
      if (e.touches.length !== 1) return
      const h = sheet.getBoundingClientRect().height
      touchState = {
        startY: e.touches[0].clientY,
        basePx: snapToPx(snapRef.current, h),
        intercepted: false,
        decided: false,
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!touchState) return
      const dy = e.touches[0].clientY - touchState.startY

      if (!touchState.decided) {
        if (Math.abs(dy) < 6) return // wait for meaningful gesture
        const atTop = content.scrollTop <= 0
        const atFull = snapRef.current === 'full'
        if (!atFull) {
          touchState.intercepted = true
        } else if (atTop && dy > 0) {
          touchState.intercepted = true
        } else {
          touchState.intercepted = false
        }
        touchState.decided = true
        if (touchState.intercepted) setDragging(true)
      }

      if (!touchState.intercepted) return

      e.preventDefault()
      const h = sheet.getBoundingClientRect().height
      const upperCap = Math.max(0, h - MID_VISIBLE_PX)
      const next = Math.max(upperCap, Math.min(h - 40, touchState.basePx + dy))
      applyY(next)
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchState) return
      if (touchState.intercepted) {
        const h = sheet.getBoundingClientRect().height
        const upperCap = Math.max(0, h - MID_VISIBLE_PX)
        const dy = (e.changedTouches[0]?.clientY ?? touchState.startY) - touchState.startY
        const finalPx = Math.max(upperCap, Math.min(h - 40, touchState.basePx + dy))
        setDragging(false)
        setSnap(pxToNearestSnap(finalPx, h))
      }
      touchState = null
    }

    content.addEventListener('touchstart', onTouchStart, { passive: true })
    content.addEventListener('touchmove',  onTouchMove,  { passive: false })
    content.addEventListener('touchend',   onTouchEnd)
    content.addEventListener('touchcancel', onTouchEnd)
    return () => {
      content.removeEventListener('touchstart', onTouchStart)
      content.removeEventListener('touchmove',  onTouchMove)
      content.removeEventListener('touchend',   onTouchEnd)
      content.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [applyY])

  const collapse = useCallback(() => setSnap('peek'), [])
  const expand   = useCallback(() => setSnap('mid'),  [])

  return { sheetRef, handleRef, contentRef, snap, setSnap, dragging, collapse, expand }
}
