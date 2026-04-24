'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

export type SheetSnap = 'peek' | 'mid' | 'full'

const PEEK_VISIBLE_PX = 68 // handle + list header visible when collapsed (toolbar floats above map)
// Cap the expanded sheet so a strip of map stays visible. Approx:
// handle (12) + toolbar search+chips (~100) + list header (~34) + 4 rows (~84 each) ≈ 480
const FULL_VISIBLE_PX = 480
const MOBILE_MAX = 1023.98

function snapToPx(snap: SheetSnap, sheetH: number): number {
  switch (snap) {
    case 'full': return Math.max(0, sheetH - FULL_VISIBLE_PX)
    case 'mid':  return Math.max(sheetH - FULL_VISIBLE_PX, sheetH * 0.5)
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
      const upperCap = Math.max(0, h - FULL_VISIBLE_PX)
      const next = Math.max(upperCap, Math.min(h - 40, d.basePx + (e.clientY - d.startY)))
      applyY(next)
    }
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      try { handle.releasePointerCapture(d.pointerId) } catch { /* noop */ }
      const h = sheet.getBoundingClientRect().height
      const upperCap = Math.max(0, h - FULL_VISIBLE_PX)
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

  const collapse = useCallback(() => setSnap('peek'), [])
  const expand   = useCallback(() => setSnap('mid'),  [])

  return { sheetRef, handleRef, snap, setSnap, dragging, collapse, expand }
}
