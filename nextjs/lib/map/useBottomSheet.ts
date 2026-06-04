'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

export type SheetSnap = 'peek' | 'mid' | 'full'

// Default peek = grab-handle pip + breathing room. Detail view bumps this up
// via SheetConfig so the name + action buttons stay visible when collapsed
// (Google Maps style).
const DEFAULT_PEEK_VISIBLE_PX = 40
// Mid: ~half the viewport on a typical phone (50% map / 50% list).
const MID_VISIBLE_PX = 420
// Sheet at 'full' stops 40 px below the top of the map body so a strip of
// the actual map stays visible above it — same affordance Google Maps uses
// so the user never loses the "I'm still on the map" anchor.
const FULL_TOP_PX     = 40
const MOBILE_MAX = 1023.98

function snapToPx(snap: SheetSnap, sheetH: number, peekPx: number): number {
  switch (snap) {
    case 'full': return FULL_TOP_PX
    case 'mid':  return Math.max(0, sheetH - MID_VISIBLE_PX)
    case 'peek': return Math.max(0, sheetH - peekPx)
  }
}

function pxToNearestSnap(px: number, sheetH: number, peekPx: number, allowed: SheetSnap[] = ['full', 'mid', 'peek']): SheetSnap {
  let best: SheetSnap = allowed[allowed.length - 1]
  let bestDist = Infinity
  for (const s of allowed) {
    const d = Math.abs(snapToPx(s, sheetH, peekPx) - px)
    if (d < bestDist) { bestDist = d; best = s }
  }
  return best
}

/* Snap-after-drag resolution combining directional intent with distance.

   Without directional intent, pure nearest-by-distance means the user has to
   drag past the midpoint between two snaps (~150 px from peek to mid) before
   the sheet commits — feels like the sheet "fights back" on small swipes.

   Without distance fallback, intent-only caps every drag at one step from
   start — a hard down-swipe from `full` would stop at `mid` instead of
   reaching `peek`, requiring a second gesture (feels like extra stops).

   Combined rule:
   - Intent guarantees the *minimum* one-step move if |dy| ≥ 40 px.
   - Nearest-by-distance overrides if the finger went further in the same
     direction (so a long hard swipe still spans multiple snaps).
*/
const INTENT_THRESHOLD_PX = 40

function pickSnapAfterDrag(
  startSnap: SheetSnap,
  dy: number,
  finalPx: number,
  sheetH: number,
  peekPx: number,
  allowed: SheetSnap[],
): SheetSnap {
  // Order from biggest-visible (full) to smallest-visible (peek). Lower idx
  // = sheet pulled UP = more visible.
  const order: SheetSnap[] = ['full', 'mid', 'peek'].filter(
    (s): s is SheetSnap => allowed.includes(s as SheetSnap),
  )
  const startIdx = order.indexOf(startSnap)
  const nearest = pxToNearestSnap(finalPx, sheetH, peekPx, allowed)
  const nearestIdx = order.indexOf(nearest)

  if (Math.abs(dy) < INTENT_THRESHOLD_PX || startIdx === -1) {
    // Below the intent threshold (or unknown start) → pure nearest.
    return nearest
  }

  const step = dy < 0 ? -1 : 1   // up = -1 (smaller idx), down = +1 (larger idx)
  const intentIdx = Math.max(0, Math.min(order.length - 1, startIdx + step))

  // Combine: pick the snap that's further in the drag direction.
  // dy < 0 (up) wants the smaller idx → min.
  // dy > 0 (down) wants the larger idx → max.
  const finalIdx = dy < 0 ? Math.min(intentIdx, nearestIdx) : Math.max(intentIdx, nearestIdx)
  return order[finalIdx]
}

function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches
}

/* Snap math anchors to the VISIBLE viewport height (the dvh line), not the
   sheet's own height: the sheet is 100lvh tall with an overhang that extends
   below the visual viewport into iOS Safari's URL-bar zone (see map.module.css
   .list), so measuring the element would push every snap position down by the
   bar height. window.innerHeight == visual viewport on mobile (innerHeight
   ignores the iOS keyboard, same as dvh — intended). */
function visibleViewportH(): number {
  return window.innerHeight
}

interface SheetConfig {
  maxSnap: SheetSnap | null  // cap drag; null = allow full
  // 'all'        — handle + content + header drags active (list view)
  // 'handleOnly' — only the grab handle drags; content/header skip
  // 'none'       — disable all drag + hide handle
  dragMode: 'all' | 'handleOnly' | 'none'
  // How much of the sheet stays visible at the 'peek' snap. Detail view
  // raises this so the name + action buttons remain reachable when collapsed.
  peekVisiblePx: number
}

export function useBottomSheet(initial: SheetSnap = 'peek') {
  const [snap, setSnap] = useState<SheetSnap>(initial)
  const [dragging, setDragging] = useState(false)
  const [sheetMounted, setSheetMounted] = useState(false)
  // Bumped whenever the content element re-mounts (sheetView list ↔ detail
  // toggles). The touch-drag effect uses this as a useEffect dep so it
  // re-attaches listeners onto the current contentRef.current element.
  const [contentTick, setContentTick] = useState(0)
  const [headerTick, setHeaderTick] = useState(0)
  const sheetNode = useRef<HTMLDivElement | null>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  // Optional secondary drag zone — typically the list header (count row +
  // tabs) so users can drag the sheet from anywhere up there, not only
  // from the small handle pip. Movement threshold prevents tap-on-button
  // from being interpreted as a drag.
  const headerRef = useRef<HTMLDivElement | null>(null)
  // Wrap contentRef as a callback ref so we can detect (re-)mounts. Setting
  // a state on each (re-)assignment forces the touch effect below to re-run
  // and rebind to the new element.
  const setContentRef = useCallback((el: HTMLDivElement | null) => {
    if (el !== contentRef.current) {
      contentRef.current = el
      setContentTick(t => t + 1)
    }
  }, [])
  const setHeaderRef = useCallback((el: HTMLDivElement | null) => {
    if (el !== headerRef.current) {
      headerRef.current = el
      setHeaderTick(t => t + 1)
    }
  }, [])
  const dragRef    = useRef<{ startY: number; basePx: number; pointerId: number } | null>(null)
  const snapRef    = useRef<SheetSnap>(initial)
  const configRef  = useRef<SheetConfig>({ maxSnap: null, dragMode: 'all', peekVisiblePx: DEFAULT_PEEK_VISIBLE_PX })
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

  /* Two-mode applyY:
     - 'drag'  → write only the transform CSS var. No layout reads, no
                 querySelectorAll, no setTimeouts. Runs 60×/s during a swipe
                 and must stay sub-millisecond or the sheet feels janky.
     - 'snap'  → full path: also writes --sheet-visible-px on the sheet and
                 its parent, and re-offsets the maplibre zoom/attrib controls
                 above the new sheet height. Only runs at drag-release and
                 programmatic snap calls (a handful of times per session).

     The visible viewport height is cached at drag-start (sheetHRef) so the
     move handler doesn't re-read it every frame just to compute
     `visible = h - px`.
  */
  const sheetHRef = useRef<number>(0)

  /* RAF coalescing: iOS Safari fires pointer/touchmove faster than 60 Hz on
     some devices. Without rAF we'd write the CSS var multiple times per frame,
     each forcing the browser to schedule an extra paint. Coalescing caps the
     writes to one per animation frame, which is the maximum the user can see. */
  const rafPxRef = useRef<number | null>(null)
  const rafIdRef = useRef<number>(0)

  const applyYDrag = useCallback((px: number) => {
    rafPxRef.current = px
    if (rafIdRef.current) return
    rafIdRef.current = requestAnimationFrame(() => {
      const target = rafPxRef.current
      rafIdRef.current = 0
      rafPxRef.current = null
      if (target === null) return
      const el = sheetNode.current
      if (!el) return
      el.style.setProperty('--sheet-y', `${target}px`)
    })
  }, [])

  /* Cancel any pending drag-frame write. Must run on drag-end BEFORE
     setSnap, otherwise a queued rAF can fire AFTER the snap-sync effect
     and overwrite the snap-pixel with the last drag position — visible
     as the sheet appearing to "stick" at the finger's release point. */
  const cancelDragRaf = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = 0
    }
    rafPxRef.current = null
  }, [])

  const applyY = useCallback((px: number) => {
    const el = sheetNode.current
    if (!el) return
    el.style.setProperty('--sheet-y', `${px}px`)
    const h = visibleViewportH()
    sheetHRef.current = h
    const visible = Math.max(0, h - px)
    el.style.setProperty('--sheet-visible-px', `${visible}px`)
    const parent = el.parentElement
    if (parent) {
      parent.style.setProperty('--sheet-visible-px', `${visible}px`)
      /* Controls are bottom-anchored inside the 100lvh-tall map body — lift
         them past the URL-bar overhang (body height minus visual viewport)
         so they stay above the visual-viewport bottom. */
      const overhang = Math.max(0, parent.getBoundingClientRect().height - h)
      const offset = visible + 10 + overhang
      lastControlOffsetRef.current = offset
      updateControls(parent, offset)
      // Cancel any pending retries from previous applyY calls so stale
      // offsets never fire after a subsequent call has already settled.
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
        const h = visibleViewportH()
        const px = snapToPx(snapRef.current, h, configRef.current.peekVisiblePx)
        const overhang = Math.max(0, parent.getBoundingClientRect().height - h)
        offset = Math.max(0, h - px) + 10 + overhang
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
      const h = visibleViewportH()
      const px = snapToPx(snapRef.current, h, configRef.current.peekVisiblePx)
      const visible = Math.max(0, h - px)
      el.style.setProperty('--sheet-y', `${px}px`)
      el.style.setProperty('--sheet-visible-px', `${visible}px`)
      const parent = el.parentElement
      if (parent) {
        parent.style.setProperty('--sheet-visible-px', `${visible}px`)
        // Same overhang lift as applyY — body is 100lvh tall.
        const overhang = Math.max(0, parent.getBoundingClientRect().height - h)
        const offset = visible + 10 + overhang
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
    applyY(snapToPx(snap, visibleViewportH(), configRef.current.peekVisiblePx))
  }, [snap, dragging, applyY])

  // Re-sync on resize
  useEffect(() => {
    const onResize = () => {
      const el = sheetNode.current
      if (!el || !isMobile()) return
      applyY(snapToPx(snap, visibleViewportH(), configRef.current.peekVisiblePx))
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
      if (!isMobile() || configRef.current.dragMode === 'none') return
      // Cache the visible viewport height once at drag-start so the move
      // handler doesn't re-read it on every frame just to clamp the target px.
      const h = visibleViewportH()
      sheetHRef.current = h
      // Read actual CSS position so custom content-fit snap is the drag baseline.
      const cssY = sheet.style.getPropertyValue('--sheet-y')
      const basePx = cssY ? parseFloat(cssY) : snapToPx(snap, h, configRef.current.peekVisiblePx)
      dragRef.current = { startY: e.clientY, basePx, pointerId: e.pointerId }
      handle.setPointerCapture(e.pointerId)
      setDragging(true)
      e.preventDefault()
    }
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const { maxSnap } = configRef.current
      const h = sheetHRef.current
      const upperCap = maxSnap ? snapToPx(maxSnap, h, configRef.current.peekVisiblePx) : FULL_TOP_PX
      const next = Math.max(upperCap, Math.min(h - 40, d.basePx + (e.clientY - d.startY)))
      applyYDrag(next)
    }
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      try { handle.releasePointerCapture(d.pointerId) } catch { /* noop */ }
      cancelDragRaf()
      const { maxSnap } = configRef.current
      const h = sheetHRef.current
      const dy = e.clientY - d.startY
      const displacement = Math.abs(dy)
      dragRef.current = null
      setDragging(false)
      // Tap on handle when peeking → expand to mid
      if (displacement < 6 && snapRef.current === 'peek') {
        setSnap('mid')
        return
      }
      const upperCap = maxSnap ? snapToPx(maxSnap, h, configRef.current.peekVisiblePx) : FULL_TOP_PX
      const finalPx = Math.max(upperCap, Math.min(h - 40, d.basePx + dy))
      const allowed: SheetSnap[] = maxSnap ? ['mid', 'peek'] : ['full', 'mid', 'peek']
      setSnap(pickSnapAfterDrag(snapRef.current, dy, finalPx, h, configRef.current.peekVisiblePx, allowed))
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
  }, [snap, applyYDrag, cancelDragRaf, sheetMounted])

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
      if (configRef.current.dragMode !== 'all') return
      if (e.touches.length !== 1) return
      const h = visibleViewportH()
      sheetHRef.current = h
      /* The detail view's actual scroller is nested inside the contentRef
         wrapper (marked with data-detail-scroll). Read scrollTop from there
         when present so the conflict-resolution rule works correctly — the
         outer wrapper itself never scrolls. */
      const scroller = content.querySelector<HTMLElement>('[data-detail-scroll]') ?? content
      touchState = {
        startY: e.touches[0].clientY,
        basePx: snapToPx(snapRef.current, h, configRef.current.peekVisiblePx),
        active: false,
        atScrollTop: scroller.scrollTop <= 0,
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!touchState) return
      const dy = e.touches[0].clientY - touchState.startY
      if (!touchState.active) {
        if (Math.abs(dy) < 6) return
        /* Conflict resolution between sheet-drag and content-scroll, so the
           user can swipe up/down anywhere in the sheet without fighting
           native scroll:
           - At full + swiping UP → already at top, let native scroll absorb it
           - Swiping DOWN with the content scrolled past the top → native scroll
           - Otherwise → drag the sheet between snaps. */
        const atFull = snapRef.current === 'full'
        if (atFull && dy < 0) return
        if (dy > 0 && !touchState.atScrollTop) return
        touchState.active = true
        setDragging(true)
      }
      e.preventDefault()
      const { maxSnap } = configRef.current
      const h = sheetHRef.current
      const upperCap = maxSnap ? snapToPx(maxSnap, h, configRef.current.peekVisiblePx) : FULL_TOP_PX
      const next = Math.max(upperCap, Math.min(h - 40, touchState.basePx + dy))
      applyYDrag(next)
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchState) return
      if (touchState.active) {
        cancelDragRaf()
        const { maxSnap } = configRef.current
        const h = sheetHRef.current
        const upperCap = maxSnap ? snapToPx(maxSnap, h, configRef.current.peekVisiblePx) : FULL_TOP_PX
        const dy = (e.changedTouches[0]?.clientY ?? touchState.startY) - touchState.startY
        const finalPx = Math.max(upperCap, Math.min(h - 40, touchState.basePx + dy))
        const allowed: SheetSnap[] = maxSnap ? ['mid', 'peek'] : ['full', 'mid', 'peek']
        setDragging(false)
        setSnap(pickSnapAfterDrag(snapRef.current, dy, finalPx, h, configRef.current.peekVisiblePx, allowed))
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
  }, [applyYDrag, cancelDragRaf, snap, contentTick])

  // Header-area drag (count row + filter / search buttons + tabs).
  // Like Google Maps, lets the user drag the sheet from anywhere up there,
  // not only the small handle pip. 8 px movement threshold preserves
  // tap-as-click on the buttons inside.
  useEffect(() => {
    void headerTick
    const header = headerRef.current
    const sheet = sheetNode.current
    if (!header || !sheet) return
    if (!isMobile()) return
    if (configRef.current.dragMode !== 'all') return

    let touchState: {
      startY: number
      basePx: number
      active: boolean
    } | null = null

    const onTouchStart = (e: TouchEvent) => {
      if (configRef.current.dragMode !== 'all') return
      if (e.touches.length !== 1) return
      const h = visibleViewportH()
      sheetHRef.current = h
      touchState = {
        startY: e.touches[0].clientY,
        basePx: snapToPx(snapRef.current, h, configRef.current.peekVisiblePx),
        active: false,
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!touchState) return
      const dy = e.touches[0].clientY - touchState.startY
      if (!touchState.active) {
        // 8 px threshold — below this it's a tap, leave the click event
        // alone so buttons inside the header still receive their onClick.
        if (Math.abs(dy) < 8) return
        touchState.active = true
        setDragging(true)
      }
      if (e.cancelable) e.preventDefault()
      const { maxSnap } = configRef.current
      const h = sheetHRef.current
      const upperCap = maxSnap ? snapToPx(maxSnap, h, configRef.current.peekVisiblePx) : FULL_TOP_PX
      const next = Math.max(upperCap, Math.min(h - 40, touchState.basePx + dy))
      applyYDrag(next)
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchState) return
      if (touchState.active) {
        cancelDragRaf()
        const { maxSnap } = configRef.current
        const h = sheetHRef.current
        const upperCap = maxSnap ? snapToPx(maxSnap, h, configRef.current.peekVisiblePx) : FULL_TOP_PX
        const dy = (e.changedTouches[0]?.clientY ?? touchState.startY) - touchState.startY
        const finalPx = Math.max(upperCap, Math.min(h - 40, touchState.basePx + dy))
        const allowed: SheetSnap[] = maxSnap ? ['mid', 'peek'] : ['full', 'mid', 'peek']
        setDragging(false)
        setSnap(pickSnapAfterDrag(snapRef.current, dy, finalPx, h, configRef.current.peekVisiblePx, allowed))
      }
      touchState = null
    }

    header.addEventListener('touchstart', onTouchStart, { passive: true })
    header.addEventListener('touchmove', onTouchMove, { passive: false })
    header.addEventListener('touchend', onTouchEnd)
    header.addEventListener('touchcancel', onTouchEnd)
    return () => {
      header.removeEventListener('touchstart', onTouchStart)
      header.removeEventListener('touchmove', onTouchMove)
      header.removeEventListener('touchend', onTouchEnd)
      header.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [applyYDrag, cancelDragRaf, snap, headerTick])

  const collapse = useCallback(() => setSnap('peek'), [])
  const expand   = useCallback(() => setSnap('mid'),  [])

  // Force CSS back to a specific snap immediately — handles the case where
  // setSnap(s) is a no-op because s equals the current snap state.
  const reapplySnap = useCallback((target: SheetSnap) => {
    const el = sheetNode.current
    if (!el || !isMobile()) return
    applyY(snapToPx(target, visibleViewportH(), configRef.current.peekVisiblePx))
    snapRef.current = target
  }, [applyY])

  return {
    sheetRef,
    handleRef,
    /** Read-only ref object — for callers that need contentRef.current. */
    contentRef,
    /** Callback ref — pass to <div ref={...}> so we get re-mount notifications. */
    setContentRef,
    /** Callback ref for the list-header drag zone (counts/buttons/tabs). */
    setHeaderRef,
    snap, setSnap, dragging, collapse, expand, reapplySnap, configure,
  }
}
