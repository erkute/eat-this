/**
 * Ausschluss für den eigenen Browser. /no-count und /admin/stats setzen
 * diese ausdrückliche Präferenz auf Knopfdruck. Client und API lesen sie,
 * damit weder der eigene Zähler noch Google Analytics Testbesuche erfassen.
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
  return (
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
