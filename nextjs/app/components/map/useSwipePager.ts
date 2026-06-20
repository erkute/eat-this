'use client'
import { useEffect, useRef, type RefObject } from 'react'

interface SwipePagerOptions {
  onPrev?: () => void
  onNext?: () => void
  /** Whether a neighbour exists in that direction — swiping into a missing
   *  neighbour rubber-bands back instead of playing the page animation. */
  hasPrev: boolean
  hasNext: boolean
  /** Optional element to animate while the root still owns the gesture. */
  transformRef?: RefObject<HTMLElement | null>
}

/* Horizontal swipe paging for the detail sheets (restaurant + must-eat).
   Swipe left → next, right → prev. Axis-locked so it never fights the
   vertical sheet-drag / content scroll: the first significant move decides
   the axis; only a clearly-horizontal gesture pages (and preventDefault's).
   Touch-only — mouse drags bail (desktop uses the pager arrows). No opacity
   fades (project rule): the page transition is a translate. */
export function useSwipePager(ref: RefObject<HTMLElement | null>, opts: SwipePagerOptions) {
  const optsRef = useRef(opts)
  optsRef.current = opts

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const animatedEl = () => optsRef.current.transformRef?.current ?? el
    let startX = 0, startY = 0, axis: 'h' | 'v' | null = null, active = false
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return
      // Don't hijack horizontal gestures that begin inside a region owning its
      // own horizontal scrolling (e.g. the photo-gallery carousel) — same axis
      // split the filter-chip rail uses against the sheet drag: a gesture moves
      // either that rail or the sheet, never both.
      if ((e.target as Element | null)?.closest?.('[data-h-scroll]')) return
      startX = e.clientX; startY = e.clientY; axis = null; active = true
    }
    const onMove = (e: PointerEvent) => {
      if (!active) return
      const dx = e.clientX - startX, dy = e.clientY - startY
      if (axis === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        axis = Math.abs(dx) > Math.abs(dy) + 6 ? 'h' : 'v'
      }
      if (axis === 'h') {
        e.preventDefault()
        // Keep the composition calm: drag previews the top card, not the
        // whole sheet, and with enough resistance that text/content stays put.
        animatedEl().style.transform = `translateX(${dx * 0.24}px)`
      }
    }
    /* preventDefault on pointermove does NOT stop native scrolling — once a
       slightly diagonal swipe accumulates vertical movement, iOS Safari
       claims the gesture as a pan-y scroll and fires pointercancel, killing
       the swipe midway. Only a non-passive touchmove preventDefault keeps
       the gesture once we've locked the horizontal axis. */
    const onTouchMove = (e: TouchEvent) => {
      if (active && axis === 'h' && e.cancelable) e.preventDefault()
    }
    const settle = () => {
      const target = animatedEl()
      target.style.transition = 'transform .2s ease-out'
      target.style.transform = 'translateX(0)'
      window.setTimeout(() => { target.style.transition = ''; target.style.transform = '' }, 220)
    }
    const end = (e: PointerEvent) => {
      if (!active) return
      const dx = e.clientX - startX
      const wasH = axis === 'h'
      active = false
      axis = null
      const dir: 'next' | 'prev' = dx < 0 ? 'next' : 'prev'
      const canPage = dir === 'next' ? optsRef.current.hasNext : optsRef.current.hasPrev
      if (wasH && Math.abs(dx) > 60 && canPage) {
        // Instagram-style page: current pane slides out, the new one slides
        // in from the opposite edge (translate only — no opacity fade).
        const target = animatedEl()
        const w = el.clientWidth
        const outX = dir === 'next' ? -w : w
        target.style.transition = 'transform .17s ease-out'
        target.style.transform = `translateX(${outX}px)`
        window.setTimeout(() => {
          if (dir === 'next') optsRef.current.onNext?.()
          else optsRef.current.onPrev?.()
          // Place the freshly-swapped content on the opposite edge, then in.
          const nextTarget = animatedEl()
          nextTarget.style.transition = 'none'
          nextTarget.style.transform = `translateX(${-outX}px)`
          void nextTarget.offsetWidth // force reflow so the next transition animates
          nextTarget.style.transition = 'transform .2s ease-out'
          nextTarget.style.transform = 'translateX(0)'
          window.setTimeout(() => { nextTarget.style.transition = ''; nextTarget.style.transform = '' }, 220)
        }, 170)
      } else {
        settle()
      }
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('pointerup', end)
    el.addEventListener('pointercancel', end)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('pointerup', end)
      el.removeEventListener('pointercancel', end)
    }
  }, [ref])
}
