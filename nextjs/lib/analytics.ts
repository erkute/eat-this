'use client'

type AnalyticsParams = Record<string, string | number | boolean | undefined>

interface AnalyticsWindow extends Window {
  __gaLoaded?: boolean
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
  __eatThisAnalyticsQueue?: Array<{ name: string; params?: AnalyticsParams }>
}

const GA_ID = 'G-8EWFYGPNTT'
const HANDOFF_KEY = 'eatthis_analytics_handoff'

function analyticsWindow(): AnalyticsWindow | null {
  return typeof window === 'undefined' ? null : (window as AnalyticsWindow)
}

function hasConsent(): boolean {
  try {
    return window.localStorage.getItem('cookieConsent') === 'accepted'
  } catch {
    return false
  }
}

/** Send a GA4 event only after analytics consent. Events fired shortly before
 * gtag finishes loading are queued; pre-consent behavior is never replayed. */
export function trackEvent(name: string, params?: AnalyticsParams): void {
  const w = analyticsWindow()
  if (!w || !hasConsent()) return
  if (w.gtag) {
    w.gtag('event', name, params ?? {})
    return
  }
  w.__eatThisAnalyticsQueue ??= []
  w.__eatThisAnalyticsQueue.push({ name, params })
}

/** Flush events queued between an accepted consent state and gtag loading. */
export function flushAnalyticsQueue(): void {
  const w = analyticsWindow()
  if (!w?.gtag || !hasConsent()) return
  const pending = w.__eatThisAnalyticsQueue ?? []
  w.__eatThisAnalyticsQueue = []
  for (const event of pending) w.gtag('event', event.name, event.params ?? {})
}

function flushHandoffEvents(): void {
  const w = analyticsWindow()
  if (!w?.gtag || !hasConsent()) return
  try {
    const raw = window.sessionStorage.getItem(HANDOFF_KEY)
    window.sessionStorage.removeItem(HANDOFF_KEY)
    if (!raw) return
    const events = JSON.parse(raw) as Array<{ name: string; params?: AnalyticsParams }>
    for (const event of events) w.gtag('event', event.name, event.params ?? {})
  } catch {
    // Malformed/private storage: discard rather than blocking analytics init.
  }
}

/** Persist a consented event across a hard navigation, then send it on the
 * destination route once analytics initializes. */
export function handoffEvent(name: string, params?: AnalyticsParams): void {
  if (typeof window === 'undefined' || !hasConsent()) return
  try {
    const raw = window.sessionStorage.getItem(HANDOFF_KEY)
    const events = raw ? JSON.parse(raw) as Array<{ name: string; params?: AnalyticsParams }> : []
    events.push({ name, params })
    window.sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(events.slice(-20)))
  } catch {
    // Private mode: the normal analytics flow remains available.
  }
}

/** Load GA4 on any route when consent was granted earlier. Configuration does
 * not auto-send pageviews; AnalyticsPageViews owns initial + soft-nav views. */
export function loadAnalytics(): void {
  const w = analyticsWindow()
  if (!w || !hasConsent() || w.__gaLoaded) return
  w.__gaLoaded = true

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(script)

  w.dataLayer = w.dataLayer || []
  w.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments)
  }
  w.gtag('js', new Date())
  w.gtag('config', GA_ID, { send_page_view: false })
  flushAnalyticsQueue()
  flushHandoffEvents()
}

/** Session-scoped dedupe for events that may remount during App Router flows. */
export function trackEventOnce(key: string, name: string, params?: AnalyticsParams): void {
  if (typeof window === 'undefined') return
  const storageKey = `eatthis_analytics_${key}`
  try {
    if (window.sessionStorage.getItem(storageKey)) return
    window.sessionStorage.setItem(storageKey, '1')
  } catch {
    // Private mode: sending twice is preferable to dropping the event.
  }
  trackEvent(name, params)
}
