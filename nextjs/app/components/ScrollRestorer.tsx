'use client'

import { useEffect } from 'react'

/**
 * Back/forward scroll restoration for App Router soft navigations.
 *
 * Native restoration (history.scrollRestoration = 'auto') is broken for
 * soft navs: on popstate the browser restores immediately, while the
 * *previous* page's DOM is still mounted — the position gets clamped to the
 * old page's (often shorter) height and never corrected after React swaps in
 * the real content. Verified against a production build: /news → article →
 * back landed at 0 instead of ~1200.
 *
 * Saving positions continuously doesn't work either: Next.js calls
 * pushState only *after* the DOM swap, so the clamp that happens during the
 * swap overwrites the departing entry's real position.
 *
 * So: take over completely (scrollRestoration = 'manual', set here on the
 * client — the browser never moves scroll on traversal) and
 *   – stamp every history entry with a key (pushState/replaceState patch),
 *   – save the current entry's position at the moments it is still intact:
 *     pointerdown/keydown capture (before any link nav swaps the DOM),
 *     popstate dispatch (manual mode leaves the departing scroll untouched),
 *     and pagehide (cross-document departures),
 *   – on popstate, restore the target entry's saved position once the new
 *     page is tall enough (retry loop, cancelled by user input),
 *   – on full-load back/forward/reload arrivals (no bfcache), restore from
 *     the stamped key at install time. bfcache hits keep scroll by snapshot.
 *
 * Forward navs are untouched: Next scrolls new pushes to top itself.
 */

const SCROLL_PREFIX = '__scrollY:'
const COUNTER_KEY = '__scrollKeyCounter'
const KEY_FIELD = '__scrollKey'
const MAX_RESTORE_FRAMES = 180 // ~3s — give slow RSC fetches a chance

let installed = false

function nextKey(): string {
  let n = 0
  try {
    n = (parseInt(sessionStorage.getItem(COUNTER_KEY) || '0', 10) || 0) + 1
    sessionStorage.setItem(COUNTER_KEY, String(n))
  } catch {}
  return String(n)
}

function saveScroll(key: string) {
  if (!key) return
  try {
    sessionStorage.setItem(SCROLL_PREFIX + key, String(Math.round(window.scrollY)))
  } catch {}
}

function readScroll(key: string): number | null {
  try {
    const raw = sessionStorage.getItem(SCROLL_PREFIX + key)
    if (raw === null) return null
    const y = parseInt(raw, 10)
    return Number.isFinite(y) ? y : null
  } catch {
    return null
  }
}

function install() {
  if (installed) return
  installed = true

  if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'

  let currentKey = ''
  let restoringKey: string | null = null
  let cancelRestore: (() => void) | null = null

  const stamp = (state: Record<string, unknown> | null | undefined) => ({
    ...(state ?? {}),
    [KEY_FIELD]: nextKey(),
  })

  // Re-assert `target` once the page is tall enough for it. The DOM swap to
  // the restored page happens asynchronously after popstate (RSC fetch +
  // render), so keep correcting until it sticks, the user intervenes, or we
  // time out.
  const restore = (key: string, target: number) => {
    cancelRestore?.()
    restoringKey = key
    let frames = 0
    let rafId = 0
    const cancel = () => {
      cancelAnimationFrame(rafId)
      restoringKey = null
      cancelRestore = null
      window.removeEventListener('wheel', cancel)
      window.removeEventListener('touchstart', cancel)
    }
    cancelRestore = cancel
    window.addEventListener('wheel', cancel, { passive: true })
    window.addEventListener('touchstart', cancel, { passive: true })

    // 'instant', not 0-arg scrollTo: the stylesheet sets scroll-behavior:
    // smooth on <html>, and a smooth scroll re-issued every frame restarts
    // its animation forever and never arrives.
    const jump = (y: number) => window.scrollTo({ top: y, behavior: 'instant' })
    const tick = () => {
      const maxY = document.documentElement.scrollHeight - window.innerHeight
      if (maxY >= target) {
        jump(target)
        if (Math.abs(window.scrollY - target) <= 1) {
          cancel()
          return
        }
      }
      if (++frames >= MAX_RESTORE_FRAMES) {
        // Page never got tall enough — settle for the best we can reach.
        jump(Math.max(0, Math.min(target, maxY)))
        cancel()
        return
      }
      rafId = requestAnimationFrame(tick)
    }
    tick()
  }

  // ── Key the current (initial) entry ────────────────────────────────────
  let arrivedOnExistingKey = false
  try {
    const st = window.history.state as Record<string, unknown> | null
    if (st && typeof st[KEY_FIELD] === 'string') {
      currentKey = st[KEY_FIELD] as string
      arrivedOnExistingKey = true
    } else {
      const stamped = stamp(st)
      currentKey = stamped[KEY_FIELD] as string
      window.history.replaceState(stamped, '', window.location.href)
    }
  } catch {}

  // ── History patches ────────────────────────────────────────────────────
  const origPush = window.history.pushState.bind(window.history)
  const origReplace = window.history.replaceState.bind(window.history)

  window.history.pushState = function (state, unused, url) {
    cancelRestore?.()
    const stamped = stamp(state as Record<string, unknown> | null)
    currentKey = stamped[KEY_FIELD] as string
    return origPush(stamped, unused as string, url)
  }

  window.history.replaceState = function (state, unused, url) {
    // Same entry, same key — preserve it across Next's replaceState calls.
    const merged = { ...((state as Record<string, unknown> | null) ?? {}), [KEY_FIELD]: currentKey }
    return origReplace(merged, unused as string, url)
  }

  // ── Save points (position still intact) ────────────────────────────────
  const saveCurrent = () => {
    // Mid-restore the live position is transient — don't corrupt the entry.
    if (restoringKey !== null) return
    saveScroll(currentKey)
  }
  document.addEventListener('pointerdown', saveCurrent, { capture: true, passive: true })
  document.addEventListener('keydown', saveCurrent, { capture: true, passive: true })
  window.addEventListener('pagehide', saveCurrent)

  // ── Traversals ─────────────────────────────────────────────────────────
  window.addEventListener('popstate', e => {
    // Manual mode: the browser hasn't touched scroll yet, and the old DOM is
    // still mounted — this is the departing entry's true position.
    const departingKey = currentKey
    const wasRestoring = restoringKey === departingKey
    cancelRestore?.()
    if (!wasRestoring) saveScroll(departingKey)

    const newKey =
      e.state && typeof e.state[KEY_FIELD] === 'string' ? (e.state[KEY_FIELD] as string) : ''
    currentKey = newKey
    if (!newKey) return // foreign entry — nothing saved for it
    const target = readScroll(newKey)
    if (target !== null) restore(newKey, target)
  })

  // ── Full-load arrivals without bfcache (SEO pages etc.) ────────────────
  if (arrivedOnExistingKey) {
    const navType = (
      performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    )?.type
    if (navType === 'back_forward' || navType === 'reload') {
      const target = readScroll(currentKey)
      if (target !== null && !window.location.hash) restore(currentKey, target)
    }
  }
}

export default function ScrollRestorer() {
  useEffect(install, [])
  return null
}
