'use client'
import { useEffect, useRef, type RefObject } from 'react'

interface SwipePagerOptions {
  onPrev?: () => void
  onNext?: () => void
  /** Whether a neighbour exists in that direction — swiping into a missing
   *  neighbour rubber-bands back instead of playing the page animation. */
  hasPrev: boolean
  hasNext: boolean
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
    let startX = 0, startY = 0, axis: 'h' | 'v' | null = null, active = false
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return
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
        // Light resistance so the empty sheet beside the pane barely shows.
        el.style.transform = `translateX(${dx * 0.42}px)`
      }
    }
    const settle = () => {
      el.style.transition = 'transform .2s ease-out'
      el.style.transform = 'translateX(0)'
      window.setTimeout(() => { el.style.transition = ''; el.style.transform = '' }, 220)
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
        const w = el.clientWidth
        const outX = dir === 'next' ? -w : w
        el.style.transition = 'transform .17s ease-out'
        el.style.transform = `translateX(${outX}px)`
        window.setTimeout(() => {
          if (dir === 'next') optsRef.current.onNext?.()
          else optsRef.current.onPrev?.()
          // Place the freshly-swapped content on the opposite edge, then in.
          el.style.transition = 'none'
          el.style.transform = `translateX(${-outX}px)`
          void el.offsetWidth // force reflow so the next transition animates
          el.style.transition = 'transform .2s ease-out'
          el.style.transform = 'translateX(0)'
          window.setTimeout(() => { el.style.transition = ''; el.style.transform = '' }, 220)
        }, 170)
      } else {
        settle()
      }
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove, { passive: false })
    el.addEventListener('pointerup', end)
    el.addEventListener('pointercancel', end)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', end)
      el.removeEventListener('pointercancel', end)
    }
  }, [ref])
}
