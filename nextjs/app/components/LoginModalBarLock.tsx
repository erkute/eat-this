'use client'
import { useEffect } from 'react'

/**
 * iOS bottom-URL-bar fix for the login modal (mobile only).
 *
 * Safari never composites position:fixed layers into the translucent
 * bottom-bar backdrop — with the modal open the bar keeps showing the page
 * behind it. Locking html/body scroll makes Safari fall back to the CANVAS
 * color, which we set to the modal surface while the modal is mounted
 * (verified on device via public/probe-modal-bar.html, mode 1).
 *
 * Inline styles on purpose — a `:has(.login-modal-overlay)` stylesheet rule
 * computed correctly but did not recolor the bar on the actual device; the
 * probe's inline-style variant did.
 */
export default function LoginModalBarLock() {
  useEffect(() => {
    const de = document.documentElement
    const b = document.body
    const mobile = window.matchMedia('(max-width: 1023.98px)').matches
    // Scroll lock (all viewports) — single source of truth for the login
    // modal; BridgeAuth's old snapshot-restore lock raced with the closing
    // burger drawer and could re-apply its stale overflow:hidden.
    de.style.overflow = 'hidden'
    b.style.overflow = 'hidden'
    b.style.touchAction = 'none'
    if (mobile) {
      const dark = de.getAttribute('data-theme') === 'dark'
      const color = dark ? '#111110' : '#b71c1c' // login frame dark / mobile overlay red
      de.style.backgroundColor = color
      b.style.backgroundColor = color
    }
    return () => {
      // Clear instead of restore-previous (see race note above).
      de.style.overflow = ''
      de.style.backgroundColor = ''
      b.style.overflow = ''
      b.style.backgroundColor = ''
      b.style.touchAction = ''
    }
  }, [])
  return null
}
