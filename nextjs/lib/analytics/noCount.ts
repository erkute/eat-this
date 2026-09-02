/**
 * Der Aus-Schalter für den eigenen Browser.
 *
 * Wer die Zahlen liest, steht sonst selbst drin: rund 300 Beacons in 40
 * Stunden kamen im Edge-Log von der Adresse des Betreibers (02.09.2026), dazu
 * jede Test-Anmeldung als „Anmeldung begonnen". GPC und DNT wären der
 * vorgesehene Weg, aber Chrome bietet DNT nicht mehr an und GPC nur per
 * Erweiterung — darum ein Cookie, das die Route wie GPC behandelt.
 *
 * Das Cookie gehört NICHT zum Zähler: der bleibt speicherfrei (siehe
 * lib/analytics.ts). Gesetzt wird es allein auf Knopfdruck in /admin/stats,
 * gelesen serverseitig aus dem Cookie-Header — kein Skript des Zählers fasst
 * das Gerät an.
 */
export const NO_COUNT_COOKIE = 'eatthis_nocount';

/** Liest den rohen Cookie-Header (oder document.cookie) — beides dieselbe
 *  Syntax. */
export function hasNoCountCookie(raw: string | null | undefined): boolean {
  if (!raw) return false;
  return raw.split(';').some((part) => part.trim() === `${NO_COUNT_COOKIE}=1`);
}
