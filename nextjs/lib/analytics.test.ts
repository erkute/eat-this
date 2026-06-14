// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handoffEvent, loadAnalytics, flushAnalyticsQueue, trackEvent, trackEventOnce } from './analytics'

describe('analytics consent gate', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    delete (window as Window & { gtag?: unknown }).gtag
    delete (window as Window & { __eatThisAnalyticsQueue?: unknown }).__eatThisAnalyticsQueue
  })

  it('drops events before consent', () => {
    trackEvent('map_opened')
    expect((window as Window & { __eatThisAnalyticsQueue?: unknown[] }).__eatThisAnalyticsQueue).toBeUndefined()
  })

  it('queues after consent and flushes when gtag loads', () => {
    localStorage.setItem('cookieConsent', 'accepted')
    trackEvent('map_opened', { tier: 'anon' })

    const gtag = vi.fn()
    ;(window as Window & { gtag?: typeof gtag }).gtag = gtag
    flushAnalyticsQueue()

    expect(gtag).toHaveBeenCalledWith('event', 'map_opened', { tier: 'anon' })
  })

  it('deduplicates session-scoped events', () => {
    localStorage.setItem('cookieConsent', 'accepted')
    const gtag = vi.fn()
    ;(window as Window & { gtag?: typeof gtag }).gtag = gtag

    trackEventOnce('purchase_1', 'purchase', { value: 2.99 })
    trackEventOnce('purchase_1', 'purchase', { value: 2.99 })

    expect(gtag).toHaveBeenCalledTimes(1)
  })

  it('hands an event across a hard navigation', () => {
    localStorage.setItem('cookieConsent', 'accepted')
    handoffEvent('sign_up', { method: 'email_link' })

    const appendChild = vi.spyOn(document.head, 'appendChild')
    loadAnalytics()
    const gtag = (window as Window & { gtag?: ReturnType<typeof vi.fn> }).gtag

    expect(gtag).toBeDefined()
    expect(sessionStorage.getItem('eatthis_analytics_handoff')).toBeNull()
    expect(appendChild).toHaveBeenCalled()
  })
})
