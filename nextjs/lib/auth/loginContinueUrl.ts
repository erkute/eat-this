/**
 * Wohin der Magic-Link zurückführt: genau dorthin, wo der Login angefangen hat.
 *
 * Ohne Continue-URL nähme der Server seinen Fallback (die Startseite); wer auf
 * einem Spot steht und sich anmeldet, käme auf der Startseite wieder heraus und
 * müsste den Spot noch einmal suchen. Die Adresse der Seite, auf der das Modal
 * steht, ist die Antwort: Auf der Karte trägt sie den offenen Spot als
 * `?r=<slug>`, auf der SEO-Seite ist sie der Spot selbst.
 *
 * Drei Parameter werden dabei abgeräumt, bevor die Adresse in eine Mail geht:
 *   e      — der Adress-Träger des vorigen Links; hat seine Arbeit getan.
 *   lang   — Firebases Sprach-Parameter; die Seite trägt ihre Sprache im Pfad.
 *   heart  — wird hier neu gesetzt (oder eben nicht), nie geerbt.
 */

export interface LoginIntent {
  /** Diesen Spot herzen, sobald der Login durch ist. */
  heartRestaurantId?: string;
  /** Diese verdeckte Karte soll im Starter Pack offen liegen — der Gast hat
   *  sie angetippt, und die Anmeldung verspricht ihm genau sie. */
  starterMustEatId?: string;
}

const DROPPED_PARAMS = ['e', 'lang', 'heart', 'starter'] as const;

/** Der Query-Parameter, der das ausstehende Herz durch den Posteingang traegt. */
export const HEART_PARAM = 'heart';
/** Dasselbe fuer die angetippte Karte des Starter Packs. */
export const STARTER_PARAM = 'starter';

export function buildLoginContinueUrl(
  location: { origin: string; pathname: string; search: string },
  intent?: LoginIntent | null
): string {
  const url = new URL(`${location.pathname}${location.search}`, location.origin);
  for (const param of DROPPED_PARAMS) url.searchParams.delete(param);
  if (intent?.heartRestaurantId) url.searchParams.set(HEART_PARAM, intent.heartRestaurantId);
  if (intent?.starterMustEatId) url.searchParams.set(STARTER_PARAM, intent.starterMustEatId);
  return url.toString();
}
