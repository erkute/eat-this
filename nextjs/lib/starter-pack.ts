/**
 * Das Starter Pack: was eine Anmeldung wert ist.
 *
 * Die Karte liegt für jeden ganz da; ein Konto bringt Must-Eat-Karten.
 */

/** Alle 20 Karten des Starter Packs sind sofort offen. */
export const STARTER_PACK_CARDS = 20;

/** Die Doc-ID des Entitlements — sie IST der Riegel: ein `create()` auf einen
 *  belegten Pfad schlägt fehl, und genau das heißt „schon bekommen". */
export const STARTER_PACK_DOC_ID = 'starter';

/**
 * Welche Karten überhaupt zu verschenken sind.
 *
 * Nicht der ganze Stapel: was ohnehin für jeden offen liegt (das öffentliche
 * Schaufenster), ist kein Geschenk. Wer es trotzdem
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
 * Die Karte, die den Gast zur Anmeldung gebracht hat, kommt garantiert mit, und
 * zwar offen.
 *
 * Die Anmelde-Tafel auf der Map sagt „20 Must Eats — diese ist dabei". Ein
 * Versprechen, das der Zufall einlösen soll, ist keins: Also steht die
 * angetippte Karte an erster Stelle, und die Ziehung füllt den Rest auf. Liegt
 * sie nicht im Pool (schon offen, unbekannt, gar nicht angetippt), zieht das
 * Pack wie immer.
 */
export function placeWantedFirst(drawn: string[], pool: string[], wanted: string | null): string[] {
  if (!wanted || !pool.includes(wanted)) return drawn;
  const rest = drawn.filter((id) => id !== wanted);
  return [wanted, ...rest].slice(0, drawn.length || 1);
}
