/**
 * Das Starter Pack: was eine Anmeldung wert ist.
 *
 * Bis zum 06.09.2026 waren es Spots — die Map war gestaffelt, ein Konto machte
 * sie größer. Das ist weg, die Karte liegt für jeden ganz da. Geblieben ist
 * der Name und das Versprechen dahinter, nur in der neuen Währung: Must-Eat-
 * Karten (Betreiber, 06.09.2026).
 */

/**
 * Karten, die eine Anmeldung mitbringt — OBEN DRAUF auf das öffentliche
 * Schaufenster (Betreiber, 06.09.2026: „5 sind drin, 20 kommen dazu").
 *
 * Ein angemeldetes Konto sieht damit 25 Karten: die fünf öffentlichen plus
 * diese zwanzig. Offen liegen fünfzehn — die fünf öffentlichen und die zehn
 * offenen aus dem Pack.
 *
 * Die Zahl ist auf den vollen Stapel gerechnet (100–150 Karten, der Rest wird
 * nachgereicht) — dort sind zwanzig ein Sechstel bis ein Fünftel. Auf dem
 * Stand vom 06.09.2026 (25 Karten) sind es fast alles, und die Packs hätten
 * nichts mehr zu verkaufen. Das ist bekannt und gewollt als Übergang; wer die
 * Zahl später anfasst, muss sie gegen die DANN gültige Stapelgröße lesen, nicht
 * gegen diese Zeile.
 */
export const STARTER_PACK_CARDS = 20;

/**
 * Davon liegen offen — der Rest kommt als Kartenrücken ins Album.
 *
 * Ein Pack, das alles sofort zeigt, ist zu Ende, bevor es angefangen hat. Die
 * zehn verdeckten sind der Grund hinzugehen: sie stehen mit Nummer und Lokal
 * im Album, und vor Ort dreht man sie um. Genau die Hälfte, damit beides
 * gleich viel Gewicht hat — das Geschenk und die Aufgabe.
 */
export const STARTER_PACK_FACE_UP = 10;

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
export function starterPackPool(
  allMustEatIds: string[],
  alreadyHas: ReadonlySet<string>
): string[] {
  return allMustEatIds.filter((id) => !alreadyHas.has(id));
}

/**
 * Wie das Pack seinen Zug aufteilt: die erste Hälfte offen, der Rest verdeckt.
 *
 * `sampleN` hat schon gemischt, der Schnitt liegt deshalb einfach in der
 * Mitte. Reicht der Stapel nicht für das ganze Pack, bekommt die offene Hälfte
 * den Vorrang — lieber weniger zu holen als weniger zu sehen.
 */
export function splitStarterPack(drawn: string[]): { faceUp: string[]; covered: string[] } {
  return {
    faceUp: drawn.slice(0, STARTER_PACK_FACE_UP),
    covered: drawn.slice(STARTER_PACK_FACE_UP),
  };
}
