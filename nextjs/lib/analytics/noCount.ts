/**
 * Ausschluss für den eigenen Browser. /no-count und /admin/stats setzen
 * diese ausdrückliche Präferenz auf Knopfdruck. Client und API lesen sie,
 * damit der eigene Zähler keine Testbesuche erfasst.
 * Der Zähler selbst setzt keine Kennung im Browser.
 */
export const NO_COUNT_COOKIE = 'eatthis_nocount';

/** Liest den rohen Cookie-Header (oder document.cookie) — beides dieselbe
 *  Syntax. */
export function hasNoCountCookie(raw: string | null | undefined): boolean {
  if (!raw) return false;
  return raw.split(';').some((part) => part.trim() === `${NO_COUNT_COOKIE}=1`);
}

/** Lokale Vorschauen dürfen auch als Produktionsbuild keine Besuche zählen. */
export function isLocalAnalyticsHost(hostname: string): boolean {
  const parts = hostname.split('.');
  const ipv4 =
    parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
  const [first, second] = parts.map(Number);
  const privateIpv4 =
    ipv4 &&
    (first === 10 ||
      first === 127 ||
      (first === 192 && second === 168) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 169 && second === 254));
  return (
    privateIpv4 ||
    /^\[?(?:f[cd][0-9a-f]{2}|fe[89ab][0-9a-f]):/i.test(hostname) ||
    hostname.endsWith('.local') ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1'
  );
}

/** Ein Aufruf aus einer lokalen Vorschau ist Testverkehr, auch auf der Live-Domain. */
export function isLocalAnalyticsUrl(raw: unknown): boolean {
  if (typeof raw !== 'string' || !raw) return false;
  try {
    return isLocalAnalyticsHost(new URL(raw).hostname);
  } catch {
    return false;
  }
}
