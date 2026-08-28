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
/* Was niemals in einer Analytics-URL stehen darf. `session_id` kam von Stripe.
 * Der Rest ab hier ist der Firebase-Action-Link auf /welcome: `oobCode` ist ein
 * einlösbares Anmelde-Token — landete es im `page_location`, läge ein
 * Login-Code in Googles Berichten. Seit /welcome mitgezählt wird (28.08.2026)
 * ist das keine Theorie mehr. `continueUrl` trägt zusätzlich das Ziel des
 * Logins, inklusive beanspruchtem Spot. */
const SENSITIVE_QUERY_PARAMS = ['session_id', 'oobCode', 'apiKey', 'continueUrl', 'email'];

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

/* Nur diese beiden Hosts sind die Seite. Alles andere — localhost, LAN-IPs,
 * beide Staging-Backends — schrieb bis 28.08.2026 in dieselbe GA-Property:
 * 59 % aller Sitzungen ueber 90 Tage waren gar keine Besucher, und am 27.08.
 * erzeugte localhost allein doppelt so viele Seitenaufrufe wie die Produktion.
 * /api/count hatte diesen Riegel von Anfang an, GA nicht.
 *
 * Der Host ist die ganze Pruefung, und zwar bewusst: NODE_ENV waere hier
 * wirkungslos, weil Staging einen Produktions-Build faehrt — dort ist
 * NODE_ENV === 'production'. Umgekehrt deckt der Host auch die Entwicklung ab,
 * egal ob sie unter localhost, 127.0.0.1 oder einer LAN-Adresse laeuft. Eine
 * zusaetzliche NODE_ENV-Abfrage haette also nichts gefangen, was hier nicht
 * schon haengenbleibt. */
const ANALYTICS_HOSTS = new Set(['www.eatthisdot.com', 'eatthisdot.com']);

export function isAnalyticsHost(hostname: string): boolean {
  return ANALYTICS_HOSTS.has(hostname);
}

/* Die Bedingung fuer ALLES, was Richtung Google geht — nicht nur fuers Laden.
 * Sonst fuellt sich auf Staging die Warteschlange in trackEvent unbegrenzt:
 * Zustimmung liegt vor, gtag kommt aber nie. */
function gaEnabled(): boolean {
  if (!hasConsent()) return false;
  return typeof window !== 'undefined' && isAnalyticsHost(window.location.hostname);
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

/* document.referrer ist fuer die Lebensdauer EINES Dokuments konstant — bei
 * jedem Routenwechsel mitzuschicken hat die Herkunft nicht oefter gemessen,
 * sondern dieselbe Herkunft mehrfach gezaehlt. Wer ueber Google auf der Karte
 * landet und zwanzig Spots durchklickt, erzeugte zwanzig "Google-Verweise":
 * 253 gezaehlte Google-Referrer gegen 83 echte Suchklicks in denselben acht
 * Tagen (Aug 2026). Modulweite Variable, weil genau das die Lebensdauer eines
 * Dokuments ist: harte Navigation laedt das Modul neu, Soft-Navigation nicht. */
let referrerSent = false;

/* Die Seite, von der dieser Aufruf kommt — Grundlage der Ausstiegszaehlung.
 *
 * Jeder Aufruf endet auf genau zwei Arten: es folgt ein weiterer interner
 * Aufruf, oder der Besuch endet hier. Daraus faellt die Ausstiegsseite ohne
 * jede Sitzungsverfolgung heraus:
 *
 *     Ausstiege(P) = Aufrufe(P) - Fortsetzungen(P)
 *
 * Genau deshalb NICHT ueber eine Sitzungskennung: visitorHash.ts haelt
 * ausdruecklich fest, dass der Hash "never stored next to the page someone
 * looked at" wird. Ein Sitzungs-Token am analytics_seen-Dokument haette genau
 * das getan. Hier wird nie ein Aufruf mit einer Person verknuepft — was
 * nebenbei das NAT-Problem erledigt: hinter einem Carrier-NAT teilen sich viele
 * Menschen einen visitorHash, und jede hash-basierte Sitzungsbildung wuerde
 * deren Wege zu einem Unsinnspfad verschmelzen. */
let lastCountedPath: string | null = null;

function previousInternalPath(): string | null {
  // Innerhalb eines Dokuments (SPA-Routenwechsel) wissen wir es selbst.
  if (lastCountedPath !== null) return lastCountedPath;
  // Erster Aufruf dieses Dokuments: bei harter Navigation innerhalb der Seite
  // steht der Vorgaenger im Referrer. Fremde Herkunft heisst Einstieg und
  // damit keine Fortsetzung.
  try {
    if (!document.referrer) return null;
    const url = new URL(document.referrer);
    return url.origin === window.location.origin ? url.pathname : null;
  } catch {
    return null;
  }
}

/** Count a page view. The path only — never the query string, which carries
 *  session ids and search terms we have no use for. */
export function countView(): void {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  const payload: Record<string, string> = { path };
  const from = previousInternalPath();
  if (from) payload.from = from;
  if (!referrerSent) {
    referrerSent = true;
    payload.referrer = document.referrer;
  }
  lastCountedPath = path;
  sendCount(payload);
}

/** Nur fuer Tests: den Dokument-Zustand zuruecksetzen. */
export function resetReferrerSentForTests(): void {
  referrerSent = false;
  lastCountedPath = null;
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
  if (!w || !gaEnabled()) return;
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
  if (!w?.gtag || !gaEnabled()) return;
  const pending = w.__eatThisAnalyticsQueue ?? [];
  w.__eatThisAnalyticsQueue = [];
  for (const event of pending) w.gtag('event', event.name, event.params ?? {});
}

function flushHandoffEvents(): void {
  const w = analyticsWindow();
  if (!w?.gtag || !gaEnabled()) return;
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
  if (typeof window === 'undefined' || !gaEnabled()) return;
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
  if (!w || !gaEnabled() || w.__gaLoaded) return;
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
