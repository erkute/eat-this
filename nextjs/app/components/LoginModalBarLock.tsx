'use client'
import { useEffect } from 'react'

const LOGIN_MOBILE_CANVAS_COLOR = '#15120e'

type StyleSnapshot = {
  priority: string
  value: string
}

function snapshotStyle(style: CSSStyleDeclaration, prop: string): StyleSnapshot {
  return {
    priority: style.getPropertyPriority(prop),
    value: style.getPropertyValue(prop),
  }
}

function restoreStyle(style: CSSStyleDeclaration, prop: string, snapshot: StyleSnapshot) {
  if (snapshot.value) {
    style.setProperty(prop, snapshot.value, snapshot.priority)
  } else {
    style.removeProperty(prop)
  }
}

/**
 * iOS bottom-URL-bar fix for the login modal (mobile only).
 *
 * Safari never composites position:fixed layers into the translucent
 * bottom-bar backdrop — with the modal open the bar keeps showing the page
 * behind it. Locking html/body scroll makes Safari sample document content
 * again; while the modal is mounted we blur the app canvas and place a
 * document-side backdrop layer over the current viewport.
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
    const blurTarget = document.getElementById('appPages')
    const blurApron = document.createElement('div')
    const scrollY = window.scrollY || window.pageYOffset || 0
    const prevBodyPosition = b.style.position
    const prevBodyTop = b.style.top
    const prevBodyWidth = b.style.width
    const prevHtmlBackground = snapshotStyle(de.style, 'background')
    const prevHtmlBackgroundColor = snapshotStyle(de.style, 'background-color')
    const prevBodyBackground = snapshotStyle(b.style, 'background')
    const prevBodyBackgroundColor = snapshotStyle(b.style, 'background-color')
    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    const createdThemeMeta = !themeMeta
    const activeThemeMeta = themeMeta ?? document.createElement('meta')
    const prevThemeColor = activeThemeMeta.getAttribute('content')

    de.setAttribute('data-login-modal-open', '1')
    if (blurTarget) {
      blurTarget.dataset.loginPrevFilter = blurTarget.style.filter
      blurTarget.dataset.loginPrevTransform = blurTarget.style.transform
      blurTarget.style.filter = mobile
        ? 'blur(14px) saturate(0.9) brightness(0.55)'
        : 'blur(14px) saturate(0.95)'
      blurTarget.style.transform = 'translateZ(0)'
    }
    // Scroll lock (all viewports) — single source of truth for the login
    // modal; BridgeAuth's old snapshot-restore lock raced with the closing
    // burger drawer and could re-apply its stale overflow:hidden.
    de.style.overflow = 'hidden'
    b.style.overflow = 'hidden'
    b.style.touchAction = 'none'
    if (mobile) {
      const color = LOGIN_MOBILE_CANVAS_COLOR
      de.style.setProperty('background', color, 'important')
      de.style.setProperty('background-color', color, 'important')
      b.style.setProperty('background', color, 'important')
      b.style.setProperty('background-color', color, 'important')
      b.style.position = 'fixed'
      b.style.top = `-${scrollY}px`
      b.style.width = '100%'
      if (createdThemeMeta) {
        activeThemeMeta.setAttribute('name', 'theme-color')
        document.head.appendChild(activeThemeMeta)
      }
      activeThemeMeta.setAttribute('content', color)
      blurApron.setAttribute('aria-hidden', 'true')
      blurApron.dataset.loginBlurApron = 'true'
      blurApron.style.cssText =
        `position:absolute;left:0;right:0;top:${scrollY}px;height:100dvh;min-height:100vh;` +
        'z-index:10003;pointer-events:none;background:rgba(21,18,14,0.72);' +
        '-webkit-backdrop-filter:blur(14px) saturate(.9) brightness(.55);backdrop-filter:blur(14px) saturate(.9) brightness(.55);'
      b.appendChild(blurApron)
    }
    return () => {
      // Clear instead of restore-previous (see race note above).
      de.removeAttribute('data-login-modal-open')
      if (blurTarget) {
        blurTarget.style.filter = blurTarget.dataset.loginPrevFilter || ''
        blurTarget.style.transform = blurTarget.dataset.loginPrevTransform || ''
        delete blurTarget.dataset.loginPrevFilter
        delete blurTarget.dataset.loginPrevTransform
      }
      blurApron.remove()
      de.style.overflow = ''
      b.style.overflow = ''
      b.style.touchAction = ''
      b.style.position = prevBodyPosition
      b.style.top = prevBodyTop
      b.style.width = prevBodyWidth
      if (mobile) {
        restoreStyle(de.style, 'background', prevHtmlBackground)
        restoreStyle(de.style, 'background-color', prevHtmlBackgroundColor)
        restoreStyle(b.style, 'background', prevBodyBackground)
        restoreStyle(b.style, 'background-color', prevBodyBackgroundColor)
        if (createdThemeMeta) {
          activeThemeMeta.remove()
        } else if (prevThemeColor == null) {
          activeThemeMeta.removeAttribute('content')
        } else {
          activeThemeMeta.setAttribute('content', prevThemeColor)
        }
        requestAnimationFrame(() => window.scrollTo(0, scrollY))
      }
    }
  }, [])
  return null
}
