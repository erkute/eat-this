/**
 * „26. August 2026" / „August 26, 2026" — das Datum eines Magazin-Artikels auf
 * Karten und Querverweisen (Restaurant-Seite, Map-Sheet, Hub-Seiten). Leer,
 * wenn es fehlt oder kaputt ist.
 *
 * Fest auf Berlin: manche Leser rendern im Browser, und ein Datum ohne
 * Uhrzeit ist UTC-Mitternacht — in New York stünde sonst der Vortag.
 */
export function formatArticleDate(iso: string | null | undefined, locale: 'de' | 'en'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Berlin',
  });
}
