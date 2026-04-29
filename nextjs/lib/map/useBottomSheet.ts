'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

export type SheetSnap = 'peek' | 'mid' | 'full'

const PEEK_VISIBLE_PX = 40  // grab handle pip + breathing room visible when collapsed
// Mid: ~half the viewport on a typical phone (50% map / 50% list).
const MID_VISIBLE_PX = 420
const FULL_TOP_PX     = 0   // sheet hugs the top of the map body for content-heavy detail views
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
  const [sheetMounted, setSheetMounted] = useState(false)
  // Bumped whenever the content element re-mounts (sheetView list ↔ detail
  // toggles). The touch-drag effect uses this as a useEffect dep so it
  // re-attaches listeners onto the current contentRef.current element.
  const [contentTick, setContentTick] = useState(0)
  const sheetNode = useRef<HTMLDivElement | null>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  // Wrap contentRef as a callback ref so we can detect (re-)mounts. Setting
  // a state on each (re-)assignment forces the touch effect below to re-run
  // and rebind to the new element.
  const setContentRef = useCallback((el: HTMLDivElement | null) => {
    if (el !== contentRef.current) {
      contentRef.current = el
      setContentTick(t => t + 1)
    }
  }, [])
  const dragRef    = useRef<{ startY: number; basePx: number; pointerId: number } | null>(null)
  const snapRef    = useRef<SheetSnap>(initial)
  const configRef  = useRef<SheetConfig>({ maxSnap: null, locked: false })
  snapRef.current = snap

  const configure = useCallback((cfg: Partial<SheetConfig>) => {
    configRef.current = { ...configRef.current, ...cfg }
  }, [])

  // Last-set offset for maplibre controls; we re-apply it whenever new
  // controls show up (maplibre mounts them asynchronously after the map ready
  // event, which is usually AFTER the sheet has done its first applyY).
  const lastControlOffsetRef = useRef<number>(0)
  // Pending retry timers — cancelled on every new applyY so stale offsets
  // from mid-drag calls never fire after a subsequent call has already settled.
  const ctrlRetryTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  const updateControls = useCallback((root: HTMLElement, offsetPx: number) => {
    root.querySelectorAll<HTMLElement>(
      '.maplibregl-ctrl-bottom-right, .maplibregl-ctrl-bottom-left'
    ).forEach(c => { c.style.bottom = `${offsetPx}px` })
  }, [])

  const applyY = useCallback((px: number) => {
    const el = sheetNode.current
    if (!el) return
    el.style.setProperty('--sheet-y', `${px}px`)
    const h = el.getBoundingClientRect().height
    const visible = Math.max(0, h - px)
    el.style.setProperty('--sheet-visible-px', `${visible}px`)
    const parent = el.parentElement
    if (parent) {
      parent.style.setProperty('--sheet-visible-px', `${visible}px`)
      const offset = visible + 10
      lastControlOffsetRef.current = offset
      updateControls(parent, offset)
      // Cancel any pending retries from previous drag frames before scheduling
      // new ones — prevents stale offsets from firing after the sheet settles.
      ctrlRetryTimers.current.forEach(clearTimeout)
      ctrlRetryTimers.current = [
        setTimeout(() => updateControls(parent, offset), 200),
        setTimeout(() => updateControls(parent, offset), 800),
      ]
    }
  }, [updateControls])

  // Watch for maplibre controls mounting after the sheet has already settled,
  // and apply the latest offset so they don't sit behind the sheet on first paint.
  useEffect(() => {
    const el = sheetNode.current
    const parent = el?.parentElement
    if (!parent) return
    const apply = () => {
      // If applyY hasn't run yet, compute the current offset on the fly so
      // freshly-mounted controls don't sit at the default `bottom: 0`.
      let offset = lastControlOffsetRef.current
      if (!offset && el && isMobile()) {
        const h = el.getBoundingClientRect().height
        const px = snapToPx(snapRef.current, h)
        offset = Math.max(0, h - px) + 10
      }
      if (offset) updateControls(parent, offset)
    }
    apply()  // initial sweep — controls may already be in the DOM
    const observer = new MutationObserver(apply)
    observer.observe(parent, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [updateControls])

  // Callback ref so the snap is applied the moment the element attaches —
  // regular refs + effects race against the parent's `loading` gate that
  // defers mounting the sheet.
  const sheetRef = useCallback((el: HTMLDivElement | null) => {
    sheetNode.current = el
    if (el) {
      setSheetMounted(true)   // triggers re-run of the handle effect after delayed mount
    }
    if (el && isMobile()) {
      const h = el.getBoundingClientRect().height
      const px = snapToPx(snapRef.current, h)
      const visible = Math.max(0, h - px)
      el.style.setProperty('--sheet-y', `${px}px`)
      el.style.setProperty('--sheet-visible-px', `${visible}px`)
      const parent = el.parentElement
      if (parent) {
        parent.style.setProperty('--sheet-visible-px', `${visible}px`)
        const offset = visible + 10
        lastControlOffsetRef.current = offset
        updateControls(parent, offset)
        // Retry — maplibre might still be mounting its controls async
        ctrlRetryTimers.current.forEach(clearTimeout)
        ctrlRetryTimers.current = [
          setTimeout(() => updateControls(parent, offset), 250),
          setTimeout(() => updateControls(parent, offset), 1000),
        ]
      }
    }
  }, [updateControls])

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
  }, [snap, applyY, sheetMounted])

  // Content-area drag.
  //   - At 'peek': drag in any direction (sheet handle is small, this is the
  //     primary way to expand by tapping/dragging anywhere on the list).
  //   - At 'mid' / 'full': only drag DOWN, and only when the list scroll is
  //     at the top — that way iOS Safari's native scroll keeps working when
  //     the user is scrolling through the list, but a downward swipe from
  //     the top of the list collapses the whole sheet (header bar included).
  useEffect(() => {
    void contentTick // re-run when the content element re-mounts
    const content = contentRef.current
    const sheet   = sheetNode.current
    if (!content || !sheet) return
    if (!isMobile()) return

    let touchState: {
      startY: number
      basePx: number
      active: boolean
      atScrollTop: boolean
    } | null = null

    const onTouchStart = (e: TouchEvent) => {
      // Skip when the sheet is locked (= detail mode in MapSection). The
      // detail view has its own swipe-down-to-close handler bound to the
      // sheet element; running both handlers on the same gesture made them
      // fight and left the sheet stuck near the bottom on Chrome mobile.
      if (configRef.current.locked) return
      if (e.touches.length !== 1) return
      const h = sheet.getBoundingClientRect().height
      touchState = {
        startY: e.touches[0].clientY,
        basePx: snapToPx(snapRef.current, h),
        active: false,
        atScrollTop: content.scrollTop <= 0,
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!touchState) return
      const dy = e.touches[0].clientY - touchState.startY
      if (!touchState.active) {
        if (Math.abs(dy) < 6) return
        const atPeek = snapRef.current === 'peek'
        // At non-peek snaps, only allow sheet drag when the user is swiping
        // DOWN AND the list is already at scrollTop=0. Otherwise it's a
        // normal scroll gesture — leave the browser alone.
        if (!atPeek && (dy < 0 || !touchState.atScrollTop)) return
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
  }, [applyY, snap, contentTick])

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

  return {
    sheetRef,
    handleRef,
    /** Read-only ref object — for callers that need contentRef.current. */
    contentRef,
    /** Callback ref — pass to <div ref={...}> so we get re-mount notifications. */
    setContentRef,
    snap, setSnap, dragging, collapse, expand, snapToVisiblePx, reapplySnap, configure,
  }
}
