/**
 * Wer zum Katalog gehört — an genau einer Stelle.
 *
 * Zwei Felder sagen etwas über den Betrieb eines Spots, und sie meinen nicht
 * dasselbe: `isOpen` ist der Schalter „nimmt am Katalog teil", `isClosed` die
 * Feststellung „dieser Laden macht nicht mehr auf". Beide müssen zusammen
 * gelten, sonst steht ein geschlossener Laden in der Empfehlungsliste.
 *
 * Warum eine Funktion und keine ausgeschriebene Bedingung: bis zum 05.09.2026
 * stand `isClosed != true` nur in `app/sitemap.ts` und in Remys Abruf
 * (`lib/buddy/retrieval.ts`), überall sonst filterte nur `isOpen != false`.
 * Beast Berlin, Crapulix und SORI Ramen standen dadurch mit
 * `isOpen: true, isClosed: true` weiter auf ihren Bezirks- und
 * Kategorieseiten, indexierbar und mit Impressionen in der Search Console —
 * während die Sitemap sie aussortierte. Zwei Signale, die sich widersprachen,
 * weil dieselbe Regel an vierzehn Stellen von Hand wiederholt wurde.
 *
 * Der Kommentar an `packContentsQuery` sagte das Problem schon voraus: „The
 * filters MUST stay identical to `mapRestaurantsQuery`". Eine Bitte an
 * künftige Leser ist keine Durchsetzung — diese Funktion ist sie.
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
