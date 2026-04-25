'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

export type SheetSnap = 'peek' | 'mid' | 'full'

const PEEK_VISIBLE_PX = 28  // just the grab handle pip visible when collapsed
// Mid: ~4 list rows visible. Full: nearly full-screen with just a small map peek at top.
const MID_VISIBLE_PX = 440
const FULL_TOP_PX     = 72  // translateY offset for full snap (status bar + small map peek)
const MOBILE_MAX = 1023.98

function snapToPx(snap: SheetSnap, sheetH: number): number {
  switch (snap) {
    case 'full': return FULL_TOP_PX
    case 'mid':  return Math.max(0, sheetH - MID_VISIBLE_PX)
    case 'peek': return Math.max(0, sheetH - PEEK_VISIBLE_PX)
  }
}

function pxToNearestSnap(px: number, sheetH: number, allowed: SheetSnap[] = ['full', 'mid', 'peek']): SheetSnap {
  let best: SheetSnap = allowed[allowed.length - 1]
  let bestDist = Infinity
  for (const s of allowed) {
    const d = Math.abs(snapToPx(s, sheetH) - px)
    if (d < bestDist) { bestDist = d; best = s }
  }
  return best
}

function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches
}

interface SheetConfig {
  maxSnap: SheetSnap | null  // cap drag; null = allow full
  locked: boolean            // disable all drag + hide handle
}

export function useBottomSheet(initial: SheetSnap = 'peek') {
  const [snap, setSnap] = useState<SheetSnap>(initial)
  const [dragging, setDragging] = useState(false)
  const sheetNode = useRef<HTMLDivElement | null>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const dragRef    = useRef<{ startY: number; basePx: number; pointerId: number } | null>(null)
  const snapRef    = useRef<SheetSnap>(initial)
  const configRef  = useRef<SheetConfig>({ maxSnap: null, locked: false })
  snapRef.current = snap

  const configure = useCallback((cfg: Partial<SheetConfig>) => {
    configRef.current = { ...configRef.current, ...cfg }
  }, [])

  const applyY = useCallback((px: number) => {
    const el = sheetNode.current
    if (!el) return
    el.style.setProperty('--sheet-y', `${px}px`)
    const h = el.getBoundingClientRect().height
    const visible = Math.max(0, h - px)
    // Visible sheet height = sheetHeight minus current translateY offset.
    // The listScroll inside can use this to cap itself so content below the
    // sheet's visible edge (clipped by overflow: hidden) can still be scrolled to.
    el.style.setProperty('--sheet-visible-px', `${visible}px`)
    // Also expose to the map body so siblings (zoom controls, info button) can
    // track the sheet's top edge and move with it.
    const parent = el.parentElement
    if (parent) parent.style.setProperty('--sheet-visible-px', `${visible}px`)
  }, [])

  // Callback ref so the snap is applied the moment the element attaches —
  // regular refs + effects race against the parent's `loading` gate that
  // defers mounting the sheet.
  const sheetRef = useCallback((el: HTMLDivElement | null) => {
    sheetNode.current = el
    if (el && isMobile()) {
      const h = el.getBoundingClientRect().height
      const px = snapToPx(snapRef.current, h)
      const visible = Math.max(0, h - px)
      el.style.setProperty('--sheet-y', `${px}px`)
      el.style.setProperty('--sheet-visible-px', `${visible}px`)
      el.parentElement?.style.setProperty('--sheet-visible-px', `${visible}px`)
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
      if (!isMobile() || configRef.current.locked) return
      const h = sheet.getBoundingClientRect().height
      // Read actual CSS position so custom content-fit snap is the drag baseline.
      const cssY = sheet.style.getPropertyValue('--sheet-y')
      const basePx = cssY ? parseFloat(cssY) : snapToPx(snap, h)
      dragRef.current = { startY: e.clientY, basePx, pointerId: e.pointerId }
      handle.setPointerCapture(e.pointerId)
      setDragging(true)
      e.preventDefault()
    }
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const { maxSnap } = configRef.current
      const h = sheet.getBoundingClientRect().height
      const upperCap = maxSnap ? snapToPx(maxSnap, h) : FULL_TOP_PX
      const next = Math.max(upperCap, Math.min(h - 40, d.basePx + (e.clientY - d.startY)))
      applyY(next)
    }
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      try { handle.releasePointerCapture(d.pointerId) } catch { /* noop */ }
      const { maxSnap } = configRef.current
      const h = sheet.getBoundingClientRect().height
      const displacement = Math.abs(e.clientY - d.startY)
      dragRef.current = null
      setDragging(false)
      // Tap on handle when peeking → expand to mid
      if (displacement < 6 && snapRef.current === 'peek') {
        setSnap('mid')
        return
      }
      const upperCap = maxSnap ? snapToPx(maxSnap, h) : FULL_TOP_PX
      const finalPx = Math.max(upperCap, Math.min(h - 40, d.basePx + (e.clientY - d.startY)))
      const allowed: SheetSnap[] = maxSnap ? ['mid', 'peek'] : ['full', 'mid', 'peek']
      setSnap(pxToNearestSnap(finalPx, h, allowed))
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

  // Content-area drag: only attach a sheet-drag gesture to the list when the
  // sheet is collapsed ('peek'). At 'mid' we DON'T register any touch
  // listeners on the list at all — that way iOS Safari's native scroll
  // physics work without interference.
  useEffect(() => {
    const content = contentRef.current
    const sheet   = sheetNode.current
    if (!content || !sheet) return
    if (!isMobile()) return
    if (snap !== 'peek') return

    let touchState: {
      startY: number
      basePx: number
      active: boolean
    } | null = null

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const h = sheet.getBoundingClientRect().height
      touchState = {
        startY: e.touches[0].clientY,
        basePx: snapToPx(snapRef.current, h),
        active: false,
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!touchState) return
      const dy = e.touches[0].clientY - touchState.startY
      if (!touchState.active) {
        if (Math.abs(dy) < 6) return
        touchState.active = true
        setDragging(true)
      }
      e.preventDefault()
      const { maxSnap } = configRef.current
      const h = sheet.getBoundingClientRect().height
      const upperCap = maxSnap ? snapToPx(maxSnap, h) : FULL_TOP_PX
      const next = Math.max(upperCap, Math.min(h - 40, touchState.basePx + dy))
      applyY(next)
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchState) return
      if (touchState.active) {
        const { maxSnap } = configRef.current
        const h = sheet.getBoundingClientRect().height
        const upperCap = maxSnap ? snapToPx(maxSnap, h) : FULL_TOP_PX
        const dy = (e.changedTouches[0]?.clientY ?? touchState.startY) - touchState.startY
        const finalPx = Math.max(upperCap, Math.min(h - 40, touchState.basePx + dy))
        const allowed: SheetSnap[] = maxSnap ? ['mid', 'peek'] : ['full', 'mid', 'peek']
        setDragging(false)
        setSnap(pxToNearestSnap(finalPx, h, allowed))
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
  }, [applyY, snap])

  const collapse = useCallback(() => setSnap('peek'), [])
  const expand   = useCallback(() => setSnap('mid'),  [])

  // Snap the sheet to exactly fit `visiblePx` of content. Bypasses the three
  // fixed snap points so the sheet hugs the detail content height precisely.
  // Does NOT call setSnap — applyY drives CSS directly, snapRef tracks position
  // for drag gestures. The sync useEffect won't override because snap state
  // hasn't changed.
  const snapToVisiblePx = useCallback((visiblePx: number) => {
    const el = sheetNode.current
    if (!el || !isMobile()) return
    const h = el.getBoundingClientRect().height
    const targetY = Math.max(FULL_TOP_PX, Math.min(h - PEEK_VISIBLE_PX, h - visiblePx))
    applyY(targetY)
    snapRef.current = pxToNearestSnap(targetY, h)
  }, [applyY])

  // Force CSS back to a specific snap immediately — handles the case where
  // setSnap(s) is a no-op because s equals the current snap state.
  const reapplySnap = useCallback((target: SheetSnap) => {
    const el = sheetNode.current
    if (!el || !isMobile()) return
    const h = el.getBoundingClientRect().height
    applyY(snapToPx(target, h))
    snapRef.current = target
  }, [applyY])

  return { sheetRef, handleRef, contentRef, snap, setSnap, dragging, collapse, expand, snapToVisiblePx, reapplySnap, configure }
}
