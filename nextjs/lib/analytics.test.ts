// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  countEvent,
  countView,
  getAnalyticsPageLocation,
  handoffEvent,
  loadAnalytics,
  flushAnalyticsQueue,
  trackEvent,
  trackEventOnce,
} from './analytics';

describe('analytics consent gate', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    // Consent lives in a cookie now (lib/consent.ts) so the pre-paint
    // bootstrap can read it; the gate reads it from there.
    document.cookie = 'cookieConsent=; Max-Age=0; Path=/';
    delete (window as Window & { gtag?: unknown }).gtag;
    delete (window as Window & { __eatThisAnalyticsQueue?: unknown }).__eatThisAnalyticsQueue;
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: vi.fn(() => true) });
  });

  it('drops events before consent', () => {
    trackEvent('map_opened');
    expect(
      (window as Window & { __eatThisAnalyticsQueue?: unknown[] }).__eatThisAnalyticsQueue
    ).toBeUndefined();
  });

  it('queues after consent and flushes when gtag loads', () => {
    document.cookie = 'cookieConsent=accepted; Path=/';
    trackEvent('map_opened', { tier: 'anon' });

    const gtag = vi.fn();
    (window as Window & { gtag?: typeof gtag }).gtag = gtag;
    flushAnalyticsQueue();

    expect(gtag).toHaveBeenCalledWith('event', 'map_opened', { tier: 'anon' });
  });

  it('deduplicates session-scoped events', () => {
    document.cookie = 'cookieConsent=accepted; Path=/';
    const gtag = vi.fn();
    (window as Window & { gtag?: typeof gtag }).gtag = gtag;

    trackEventOnce('purchase_1', 'purchase', { value: 2.99 });
    trackEventOnce('purchase_1', 'purchase', { value: 2.99 });

    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it('hands an event across a hard navigation', () => {
    document.cookie = 'cookieConsent=accepted; Path=/';
    handoffEvent('sign_up', { method: 'email_link' });

    const appendChild = vi.spyOn(document.head, 'appendChild');
    loadAnalytics();
    const gtag = (window as Window & { gtag?: ReturnType<typeof vi.fn> }).gtag;

    expect(gtag).toBeDefined();
    expect(sessionStorage.getItem('eatthis_analytics_handoff')).toBeNull();
    expect(appendChild).toHaveBeenCalled();
  });
});

describe('getAnalyticsPageLocation', () => {
  it('removes Stripe session IDs from page views but preserves other params', () => {
    expect(
      getAnalyticsPageLocation(
        'https://www.eatthisdot.com/checkout/success?session_id=cs_secret&utm_source=stripe'
      )
    ).toEqual({
      pageLocation: 'https://www.eatthisdot.com/checkout/success?utm_source=stripe',
      pagePath: '/checkout/success?utm_source=stripe',
    });
  });
});

/* The consent-free counter. Its whole value is that it does NOT depend on the
 * answer to the cookie question — if any of this starts checking consent, the
 * numbers go back to being a third of the truth. */
describe('consent-free counting', () => {
  let beacon: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    document.cookie = 'cookieConsent=; Max-Age=0; Path=/';
    beacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: beacon });
    window.history.replaceState({}, '', '/bezirk/kreuzberg');
  });

  // jsdom's Blob has no .text(), so read it the long way.
  function readBlob(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
  }

  async function sent(call: number = 0) {
    const blob = beacon.mock.calls[call]?.[1] as Blob;
    return JSON.parse(await readBlob(blob)) as Record<string, string>;
  }

  it.each([
    ['no answer yet', ''],
    ['declined', 'cookieConsent=declined; Path=/'],
    ['accepted', 'cookieConsent=accepted; Path=/'],
  ])('counts a page view when consent is %s', async (_label, cookie) => {
    if (cookie) document.cookie = cookie;

    countView();

    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0][0]).toBe('/api/count');
    expect((await sent()).path).toBe('/bezirk/kreuzberg');
  });

  it('sends the path only, never the query string', async () => {
    window.history.replaceState({}, '', '/checkout/success?session_id=cs_live_secret');

    countView();

    const body = await sent();
    expect(body.path).toBe('/checkout/success');
    expect(JSON.stringify(body)).not.toContain('cs_live_secret');
  });

  it('fans a tracked event out to the counter without consent', async () => {
    trackEvent('map_opened', { tier: 'anon' });

    expect(beacon, 'the counter runs before the consent gate').toHaveBeenCalledTimes(1);
    expect((await sent()).event).toBe('map_opened');
  });

  /* page_view arrives through countView. Letting it in here as well would
   * double every single view in the dashboard. */
  it('refuses page_view as an event name', () => {
    countEvent('page_view');
    expect(beacon).not.toHaveBeenCalled();
  });

  it('never touches storage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const getItem = vi.spyOn(Storage.prototype, 'getItem');

    countView();
    countEvent('map_opened');

    // Reading or writing the device is the one thing that would put this
    // endpoint behind the consent dialog (TDDDG 25).
    expect(setItem).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
    setItem.mockRestore();
    getItem.mockRestore();
  });

  it('stays silent when the browser has no sendBeacon and no fetch', () => {
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: undefined });
    vi.stubGlobal('fetch', () => {
      throw new Error('no fetch here');
    });

    expect(() => countView()).not.toThrow();
  });
});
