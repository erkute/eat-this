'use client'
import { useEffect } from 'react'

/**
 * Hard navigations to /#<id> (e.g. #hub-allberlin from the burger or
 * #hub-packs from the map end-cap) can scroll to the anchor before client
 * islands finish settling the page, leaving the user above the target.
 * Re-scroll a few times over the first ~700ms to track layout changes; bail the
 * moment the user scrolls themselves.
 */
export default function HubHashScroll() {
  useEffect(() => {
    const hash = window.location.hash
    if (hash.length < 2) return
    const id = decodeURIComponent(hash.slice(1))
    let cancelled = false
    const cancel = () => { cancelled = true }
    window.addEventListener('wheel', cancel, { passive: true, once: true })
    window.addEventListener('touchstart', cancel, { passive: true, once: true })
    window.addEventListener('keydown', cancel, { once: true })

    const scroll = () => {
      if (cancelled) return
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' })
    }
    const timers = [0, 120, 300, 550, 800].map((d) => setTimeout(scroll, d))
    const raf = requestAnimationFrame(scroll)
    return () => {
      timers.forEach(clearTimeout)
      cancelAnimationFrame(raf)
      window.removeEventListener('wheel', cancel)
      window.removeEventListener('touchstart', cancel)
      window.removeEventListener('keydown', cancel)
    }
  }, [])
  return null
}
