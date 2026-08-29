/**
 * Wohin der Magic-Link zurueckfuehrt: genau dorthin, wo der Login angefangen
 * hat.
 *
 * Vorher trug das Modal gar keine Continue-URL, also nahm der Server seinen
 * Fallback (die Startseite) — wer auf einem Spot stand und sich anmeldete, kam
 * auf der Startseite wieder heraus und musste den Spot noch einmal suchen. Die
 * Adresse der Seite, auf der das Modal steht, IST die Antwort: auf der Karte
 * traegt sie den offenen Spot als `?r=<slug>`, auf der SEO-Seite ist sie der
 * Spot selbst.
 *
 * Drei Parameter werden dabei abgeraeumt, bevor die Adresse in eine Mail geht:
 *   e      — der Adress-Traeger des vorigen Links; hat seine Arbeit getan.
 *   claim  — der Gratis-Spot einer Anmeldung; den vergibt LockedDetail mit
 *            seiner eigenen Continue-URL, nicht das allgemeine Modal.
 *   heart  — wird hier neu gesetzt (oder eben nicht), nie geerbt.
 */

export interface LoginIntent {
  /** Diesen Spot herzen, sobald der Login durch ist. */
  heartRestaurantId?: string;
}

const DROPPED_PARAMS = ['e', 'claim', 'heart'] as const;

/** Der Query-Parameter, der das ausstehende Herz durch den Posteingang traegt. */
export const HEART_PARAM = 'heart';

export function buildLoginContinueUrl(
  location: { origin: string; pathname: string; search: string },
  intent?: LoginIntent | null
): string {
  const url = new URL(`${location.pathname}${location.search}`, location.origin);
  for (const param of DROPPED_PARAMS) url.searchParams.delete(param);
  if (intent?.heartRestaurantId) url.searchParams.set(HEART_PARAM, intent.heartRestaurantId);
  return url.toString();
}
