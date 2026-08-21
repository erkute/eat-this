'use client';

import { readConsent } from '@/lib/consent';

type AnalyticsParams = Record<string, string | number | boolean | undefined>;

interface AnalyticsWindow extends Window {
  __gaLoaded?: boolean;
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  __eatThisAnalyticsQueue?: Array<{ name: string; params?: AnalyticsParams }>;
}

const GA_ID = 'G-8EWFYGPNTT';
const HANDOFF_KEY = 'eatthis_analytics_handoff';
const SENSITIVE_QUERY_PARAMS = ['session_id'];

export function getAnalyticsPageLocation(href: string): {
  pageLocation: string;
  pagePath: string;
} {
  const url = new URL(href);
  for (const name of SENSITIVE_QUERY_PARAMS) url.searchParams.delete(name);
  return {
    pageLocation: url.toString(),
    pagePath: `${url.pathname}${url.search}`,
  };
}

function analyticsWindow(): AnalyticsWindow | null {
  return typeof window === 'undefined' ? null : (window as AnalyticsWindow);
}

/* Reads the consent COOKIE, not localStorage. When consent moved to a cookie
 * (so the pre-paint bootstrap could reserve the banner's height, see
 * lib/consent.ts) this gate had to move with it: the migration removes the old
 * localStorage key, so a localStorage read would report "no consent" for every
 * user who had already accepted, and analytics would go quiet for them. */
function hasConsent(): boolean {
  try {
    return readConsent() === 'accepted';
  } catch {
    return false;
  }
}

/* ── Consent-free counting ───────────────────────────────────────────────────
 *
 * A second, much smaller pipe that runs for EVERYONE, next to GA4 rather than
 * instead of it. GA needs consent and consent is a minority, so on its own it
 * reported about a third of the real traffic with no way to tell which third.
 *
 * Nothing here reads or writes the device: no cookie, no localStorage, no
 * sessionStorage, no fingerprint. That is not an implementation detail, it is
 * the whole reason this needs no banner (TDDDG 25). If you ever add a client-
 * side id here, the endpoint moves behind the consent dialog with it.
 *
 * sendBeacon rather than fetch: it survives the page being closed, which is
 * exactly when the last page view of a visit happens. connect-src 'self'
 * already covers it, same as the Sentry tunnel.
 */
const COUNT_ENDPOINT = '/api/count';

function sendCount(payload: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  const body = JSON.stringify(payload);
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(COUNT_ENDPOINT, new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch(COUNT_ENDPOINT, {
      method: 'POST',
      body,
      keepalive: true,
      headers: { 'content-type': 'application/json' },
    }).catch(() => {});
  } catch {
    // Counting must never be the reason a page misbehaves.
  }
}

/** Count a page view. The path only — never the query string, which carries
 *  session ids and search terms we have no use for. */
export function countView(): void {
  if (typeof window === 'undefined') return;
  sendCount({ path: window.location.pathname, referrer: document.referrer });
}

/** Count one named event. `page_view` is deliberately not accepted here — it
 *  arrives through countView, and letting it in too would double every view. */
export function countEvent(name: string): void {
  if (typeof window === 'undefined' || name === 'page_view') return;
  sendCount({ path: window.location.pathname, event: name });
}

/** Send a GA4 event only after analytics consent. Events fired shortly before
 * gtag finishes loading are queued; pre-consent behavior is never replayed.
 *
 * The consent-free counter fires FIRST and unconditionally: it is the half of
 * this function that must not depend on an answer. Everything below the fan-out
 * is GA and stays behind consent, unchanged. */
export function trackEvent(name: string, params?: AnalyticsParams): void {
  countEvent(name);
  const w = analyticsWindow();
  if (!w || !hasConsent()) return;
  if (w.gtag) {
    w.gtag('event', name, params ?? {});
    return;
  }
  w.__eatThisAnalyticsQueue ??= [];
  w.__eatThisAnalyticsQueue.push({ name, params });
}

/** Flush events queued between an accepted consent state and gtag loading. */
export function flushAnalyticsQueue(): void {
  const w = analyticsWindow();
  if (!w?.gtag || !hasConsent()) return;
  const pending = w.__eatThisAnalyticsQueue ?? [];
  w.__eatThisAnalyticsQueue = [];
  for (const event of pending) w.gtag('event', event.name, event.params ?? {});
}

function flushHandoffEvents(): void {
  const w = analyticsWindow();
  if (!w?.gtag || !hasConsent()) return;
  try {
    const raw = window.sessionStorage.getItem(HANDOFF_KEY);
    window.sessionStorage.removeItem(HANDOFF_KEY);
    if (!raw) return;
    const events = JSON.parse(raw) as Array<{ name: string; params?: AnalyticsParams }>;
    for (const event of events) w.gtag('event', event.name, event.params ?? {});
  } catch {
    // Malformed/private storage: discard rather than blocking analytics init.
  }
}

/** Persist a consented event across a hard navigation, then send it on the
 * destination route once analytics initializes. */
export function handoffEvent(name: string, params?: AnalyticsParams): void {
  if (typeof window === 'undefined' || !hasConsent()) return;
  try {
    const raw = window.sessionStorage.getItem(HANDOFF_KEY);
    const events = raw
      ? (JSON.parse(raw) as Array<{ name: string; params?: AnalyticsParams }>)
      : [];
    events.push({ name, params });
    window.sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(events.slice(-20)));
  } catch {
    // Private mode: the normal analytics flow remains available.
  }
}

/** Load GA4 on any route when consent was granted earlier. Configuration does
 * not auto-send pageviews; AnalyticsPageViews owns initial + soft-nav views. */
export function loadAnalytics(): void {
  const w = analyticsWindow();
  if (!w || !hasConsent() || w.__gaLoaded) return;
  w.__gaLoaded = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  w.dataLayer = w.dataLayer || [];
  w.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  w.gtag('js', new Date());
  w.gtag('config', GA_ID, { send_page_view: false });
  flushAnalyticsQueue();
  flushHandoffEvents();
}

/** Session-scoped dedupe for events that may remount during App Router flows. */
export function trackEventOnce(key: string, name: string, params?: AnalyticsParams): void {
  if (typeof window === 'undefined') return;
  const storageKey = `eatthis_analytics_${key}`;
  try {
    if (window.sessionStorage.getItem(storageKey)) return;
    window.sessionStorage.setItem(storageKey, '1');
  } catch {
    // Private mode: sending twice is preferable to dropping the event.
  }
  trackEvent(name, params);
}
