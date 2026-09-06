/**
 * Das Starter Pack: was eine Anmeldung wert ist.
 *
 * Bis zum 06.09.2026 waren es Spots — die Map war gestaffelt, ein Konto machte
 * sie größer. Das ist weg, die Karte liegt für jeden ganz da. Geblieben ist
 * der Name und das Versprechen dahinter, nur in der neuen Währung: Must-Eat-
 * Karten (Betreiber, 06.09.2026).
 */

/**
 * Karten, die eine Anmeldung mitbringt.
 *
 * Die Zahl ist auf den vollen Stapel gerechnet (100–150 Karten, der Rest wird
 * nachgereicht) — dort sind zwanzig ein Sechstel bis ein Fünftel. Auf dem
 * Stand vom 06.09.2026 (25 Karten) sind es fast alles, und die Packs hätten
 * nichts mehr zu verkaufen. Das ist bekannt und gewollt als Übergang; wer die
 * Zahl später anfasst, muss sie gegen die DANN gültige Stapelgröße lesen, nicht
 * gegen diese Zeile.
 */
export const STARTER_PACK_CARDS = 20;

/** Die Doc-ID des Entitlements — sie IST der Riegel: ein `create()` auf einen
 *  belegten Pfad schlägt fehl, und genau das heißt „schon bekommen". */
export const STARTER_PACK_DOC_ID = 'starter';

/**
 * Welche Karten überhaupt zu verschenken sind.
 *
 * Nicht der ganze Stapel: was ohnehin für jeden offen liegt (das öffentliche
 * Schaufenster, der Spot des Tages), ist kein Geschenk. Wer es trotzdem
 * mitgäbe, verteilte ein Fünftel des Packs an Karten, die der Beschenkte schon
 * sieht — und das Pack fühlte sich kleiner an, als es ist.
 */
export function starterPackPool(allMustEatIds: string[], faceUpIds: ReadonlySet<string>): string[] {
  return allMustEatIds.filter((id) => !faceUpIds.has(id));
}
