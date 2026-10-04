import { formatArticleDate } from './articleDate';
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
  // Das Map-Sheet rendert im Browser — deshalb fest auf Berlin, siehe dort.
  const date = formatArticleDate(a.date, locale);
  return { title, kicker, date };
}
