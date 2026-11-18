/**
 * Wer zum Katalog gehört, an genau einer Stelle.
 *
 * Zwei Felder sagen etwas über den Betrieb eines Spots, und sie meinen nicht
 * dasselbe: `isOpen` ist der Schalter „nimmt am Katalog teil", `isClosed` die
 * Feststellung „dieser Laden macht nicht mehr auf". Beide müssen zusammen
 * gelten, sonst steht ein geschlossener Laden in der Empfehlungsliste.
 *
 * Warum eine Funktion und keine ausgeschriebene Bedingung: Von Hand an vielen
 * Stellen wiederholt, läuft die Regel auseinander. Filtert eine Abfrage nur
 * `isOpen != false`, steht ein Spot mit `isOpen: true, isClosed: true` weiter
 * auf seinen Bezirks- und Kategorieseiten, indexierbar, während die Sitemap ihn
 * aussortiert. Eine Bitte an künftige Leser ist keine Durchsetzung; diese
 * Funktion ist sie.
 */

/**
 * @param prefix Pfad zum Restaurant-Dokument, wenn der Filter nicht direkt auf
 *               ihm sitzt — z. B. `'restaurantRef->'` für ein Must Eat oder
 *               `'@->'` innerhalb einer Referenzliste. Leer für das Dokument
 *               selbst.
 */
export function liveRestaurant(prefix = ''): string {
  return `${prefix}isOpen != false && ${prefix}isClosed != true`;
}
