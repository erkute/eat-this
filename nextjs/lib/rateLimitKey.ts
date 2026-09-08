import { berlinDay, countSalt, visitorHash } from './analytics/visitorHash';

/**
 * Ein Ratenlimit-Schluessel, der nicht verraet, wen er deckelt.
 *
 * Der Schluessel eines Ratenlimits ist die Dokument-ID in `_rateLimits`. Steht
 * dort die rohe IP, dann liegt eine rohe IP in der Datenbank — und zwar genau
 * die, von der `/api/count`, `/api/consent`, `/api/buddy` und
 * `/api/must-eat-reveal` seit jeher die Finger lassen: die zaehlen alle ueber
 * `visitorHash`, und die Datenschutzerklaerung sagt zu, dass rohe Adressen
 * nicht gespeichert werden. Ein Ratenlimit ist kein Grund, davon abzuweichen —
 * es braucht nur etwas, das zwei Anfragen derselben Herkunft vergleichbar
 * macht, und ein Hash leistet das genauso.
 *
 * Der User-Agent bleibt leer. Hinter App Hosting ersetzt die Edge ihn ohnehin
 * durch „Google" (siehe `clientIpFromXff`), er traegt dort also nichts bei —
 * und lokal wuerde er den Schluessel gegenueber Produktion verschieben, ohne
 * dass jemand den Unterschied sieht.
 *
 * Der Tages-Salt aus `berlinDay()` rotiert die Schluessel um Mitternacht
 * (Berlin). Fuer die Fenster hier ist das folgenlos bis nachrangig: das
 * Deck-Fenster ist eine Minute lang, das Magic-Link-Fenster eine Stunde — im
 * schlimmsten Fall faengt ein Fenster pro Tag einmal von vorn an. Dafuer kann
 * kein Bestand aus `_rateLimits` ueber Tage hinweg zu einem Profil werden.
 *
 * `identity` muss keine IP sein: alles, was eine Person benennt (eine
 * Mailadresse etwa), gehoert aus demselben Grund gehasht in den Schluessel.
 */
export function rateLimitKey(prefix: string, identity: string): string {
  return `${prefix}:${visitorHash(identity, '', berlinDay(), countSalt())}`;
}
