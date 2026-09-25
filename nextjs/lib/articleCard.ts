import type { RestaurantArticleCard } from './types';

/**
 * Was eine Artikel-Karte im „Im Magazin"-Block zeigt: Schlagzeile, Kicker und
 * Datum in der Sprache der Seite. Zwei Leser — die Restaurant-Seite und das
 * Map-Sheet —, damit derselbe Artikel an beiden Stellen gleich heißt.
 */
export function articleCardText(a: RestaurantArticleCard, locale: 'de' | 'en') {
  const de = locale === 'de';
  const title = (de && a.titleDe ? a.titleDe : a.title) || '';
  const kicker = (de ? a.categoryLabelDe : a.categoryLabel) || a.categoryLabel || '';
  let date = '';
  if (a.date) {
    const d = new Date(a.date);
    if (!isNaN(d.getTime())) {
      date = d.toLocaleDateString(de ? 'de-DE' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        // Fest auf Berlin: das Sheet rendert im Browser, und ein Datum ohne
        // Uhrzeit ist UTC-Mitternacht — in New York stünde sonst der Vortag.
        timeZone: 'Europe/Berlin',
      });
    }
  }
  return { title, kicker, date };
}
