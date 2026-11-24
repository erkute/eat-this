'use client';
import { channelHint } from '@/lib/analytics/channels';
import { publishInsightEvent } from '@/lib/analytics/eventSignals';
import { isAutomated } from '@/lib/analytics/botFilter';
import {
  hasNoCountCookie,
  isLocalAnalyticsHost,
  isLocalAnalyticsUrl,
} from '@/lib/analytics/noCount';

type AnalyticsParams = Record<string, string | number | boolean | undefined>;

/* Wer nicht mitgezaehlt wird: der Betreiber (Nicht-mitzaehlen-Cookie, Aufrufe
 * aus der lokalen Entwicklung), Browser mit Do-Not-Track oder Global Privacy
 * Control, Automaten, eingebettete Ansichten und der Admin-Bereich. */
function isOwnOrAutomated(): boolean {
  if (hasNoCountCookie(document.cookie) || isLocalAnalyticsUrl(document.referrer)) return true;
  if (
    navigator.doNotTrack === '1' ||
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl
  )
    return true;
  if (navigator.webdriver || isAutomated(navigator.userAgent)) return true;
  // Eingebettet zählt nie: die Heatmap in /admin/stats zeigt die Startseite in
  // einem iframe, und jeder Blick darauf wäre sonst ein Besuch.
  if (window.self !== window.top) return true;
  return /^\/(en\/)?admin(\/|$)/.test(window.location.pathname);
}

/* ── Counting ────────────────────────────────────────────────────────────────
 *
 * The site's only measurement. It needs no consent and runs for everyone.
 *
 * The counter creates no client identifier and writes no browser storage.
 * It reads only the explicit no-count preference to suppress test visits,
 * alongside the browser's privacy signals and automation checks.
 *
 * sendBeacon rather than fetch: it survives the page being closed, which is
 * exactly when the last page view of a visit happens. connect-src 'self'
 * already covers it, same as the Sentry tunnel.
 */
const COUNT_ENDPOINT = '/api/count';

/*
 * Der User-Agent fährt im Body mit: die App-Hosting-Edge ersetzt UA und
 * Aufrufer-IP, bevor Cloud Run die Anfrage sieht (lib/analytics/botFilter.ts),
 * und der Bot-Filter der Route liefe sonst ins Leere. Derselbe String, den der
 * Browser ohnehin sendet, kein Fingerprint. Gekürzt, damit der Beacon unter dem
 * Größenlimit der Route bleibt.
 */
const UA_MAX = 300;

function userAgent(): string | undefined {
  if (typeof navigator === 'undefined' || typeof navigator.userAgent !== 'string') return undefined;
  const ua = navigator.userAgent.trim();
  return ua ? ua.slice(0, UA_MAX) : undefined;
}

function sendCount(payload: Record<string, string | number | string[] | number[]>): void {
  if (typeof window === 'undefined') return;
  if (isLocalAnalyticsHost(window.location.hostname) || isOwnOrAutomated()) return;
  const ua = userAgent();
  const body = JSON.stringify(ua ? { ...payload, ua } : payload);
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

/*
 * document.referrer ist fuer die Lebensdauer eines Dokuments konstant; bei
 * jedem Routenwechsel mitgeschickt, zaehlte er dieselbe Herkunft mehrfach.
 * Modulweite Variable, weil das genau die Lebensdauer eines Dokuments ist:
 * harte Navigation laedt das Modul neu, Soft-Navigation nicht.
 */
let referrerSent = false;

/*
 * Die Seite, von der dieser Aufruf kommt: Grundlage der Ausstiegszaehlung.
 *
 * Ausstiege(P) = Aufrufe(P) - Fortsetzungen(P)
 *
 * Bewusst ohne Sitzungskennung: ein Aufruf wird nie mit einer Person verknuepft
 * (visitorHash.ts), und hinter einer Carrier-NAT verschmoelzen hash-basierte
 * Sitzungen viele Menschen zu einem Pfad.
 */
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

function referrerOrigin(): string {
  try {
    return document.referrer ? new URL(document.referrer).origin : '';
  } catch {
    return '';
  }
}

/** Count a page view. The path only — never the query string, which carries
 *  session ids and search terms we have no use for. */
export function countView(): void {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  const payload: Record<string, string> = { path };
  const hint = channelHint(window.location.search);
  if (hint) payload.channelHint = hint;
  const from = previousInternalPath();
  if (from) payload.from = from;
  if (!referrerSent) {
    referrerSent = true;
    // Nur der Ursprung: die Route liest ohnehin nur den Host, der Pfad einer
    // Suchseite traegt Suchbegriffe — und eine lange Verweis-URL sprengte das
    // Groessenlimit der Route, womit der ganze Aufruf ungezaehlt blieb.
    payload.referrer = referrerOrigin();
  }
  lastCountedPath = path;
  sendCount(payload);
}

/** Scrolltiefe oder Klick auf der Startseite (lib/analytics/homeHeat.ts) —
 *  derselbe Beacon, dieselben Riegel wie ein Seitenaufruf. */
export function countInsight(payload: Record<string, string | number | string[] | number[]>): void {
  if (typeof window !== 'undefined') sendCount({ ...payload, path: window.location.pathname });
}

export function countHome(payload: Record<string, string | number | string[] | number[]>): void {
  if (typeof window === 'undefined') return;
  sendCount({ ...payload, path: window.location.pathname });
}

/** Ein Ladezeit-Messwert (LCP, INP oder CLS) des Dokuments, das auf `path`
 *  geöffnet wurde (lib/analytics/webVitals.ts). Telefon oder Desktop allein
 *  nach der Fensterbreite, wie bei den übrigen Beacons. */
export function countVital(name: string, value: number, path: string): void {
  if (typeof window === 'undefined') return;
  const device = window.innerWidth < 768 ? 'phone' : 'desktop';
  sendCount({ vital: name, value, device, path });
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

/*
 * Der Zaehler kennt nur Namen, keine Parameter. Diese Ereignisse faechert er
 * darum einmal auf: neben dem Grundnamen geht ein zweiter Beacon mit dem
 * qualifizierten Namen raus (`must_eat_reveal_unlocked`, `login_start_google`).
 * Der Grundname bleibt, damit die Reihen nicht abreissen. Was zaehlbar ist,
 * steht als Allowlist in app/api/count/route.ts: ein neuer Wert landet erst
 * dort, dann hier.
 */
const QUALIFIED_BY: Record<string, string> = {
  must_eat_reveal_attempt: 'result',
  login_start: 'method',
  login_view: 'context',
};

export function qualifiedCountName(name: string, params?: AnalyticsParams): string | null {
  const param = QUALIFIED_BY[name];
  if (!param) return null;
  const value = params?.[param];
  if (typeof value !== 'string' || !/^[a-z_]{1,40}$/.test(value)) return null;
  // `must_eat_reveal_attempt` + `unlocked` → `must_eat_reveal_unlocked`: das
  // „attempt" ist mit dem Ausgang gesagt.
  const stem = name.endsWith('_attempt') ? name.slice(0, -'_attempt'.length) : name;
  return `${stem}_${value}`;
}

function countEventWithQualifier(name: string, params?: AnalyticsParams): void {
  countEvent(name);
  const qualified = qualifiedCountName(name, params);
  if (qualified) countEvent(qualified);
}

/** Count a named event and tell the on-page insight listeners about it. */
export function trackEvent(name: string, params?: AnalyticsParams): void {
  publishInsightEvent(name);
  countEventWithQualifier(name, params);
}

// Document lifetime: SPA navigation and remounts keep this set; reloads and
// new tabs start empty. Keys stay in memory and never enter a beacon.
const trackedEventKeys = new Set<string>();

/** Count at most once per key in this document, without browser storage.
 * This limits send attempts, not confirmed delivery or purchases across reloads. */
export function trackEventOnce(key: string, name: string, params?: AnalyticsParams): void {
  if (typeof window === 'undefined' || trackedEventKeys.has(key)) return;
  trackedEventKeys.add(key);
  trackEvent(name, params);
}
