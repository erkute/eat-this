'use client';

/**
 * Die Starter-Pack-Einblendung nach einer Anmeldung (SignInReward).
 *
 * Der verlässliche Auslöser ist die Vergabe selbst: `/api/starter-pack`
 * antwortet `granted: true` GENAU EINMAL pro Konto, egal über welchen Weg die
 * Anmeldung lief und auf welcher Seite sie herauskommt. Ein Zustandswechsel
 * im selben Dokument (erst kein `uid`, dann einer) gibt es nur beim
 * Google-Popup — Magic-Link und Redirect laden hart neu und kamen früher
 * wortlos an.
 *
 * Bis 24.09.2026 entschied dieses Modul auch über die Info-Karte „Du bist
 * drin" für Wiederkehrer (announceSignIn). Die ist gestrichen: der
 * Wartescreen davor sagt schon „Du wirst angemeldet".
 */

/** Bekommt die offenen Karten des frisch vergebenen Packs (Must-Eat-IDs). */
type GrantedListener = (faceUpIds: string[]) => void;

/** Die Meldung kam, bevor jemand zuhörte; der erste Abonnent bekommt sie. */
let grantedLatched: string[] | null = null;
const listeners = new Set<GrantedListener>();

/** Nach einer Antwort `granted: true` von `/api/starter-pack`. */
export function announceStarterPackGranted(faceUpIds: string[] = []): void {
  if (listeners.size === 0) {
    grantedLatched = faceUpIds;
    return;
  }
  for (const listener of listeners) listener(faceUpIds);
}

export function subscribeStarterPackGranted(listener: GrantedListener): () => void {
  listeners.add(listener);
  if (grantedLatched) {
    const faceUpIds = grantedLatched;
    grantedLatched = null;
    listener(faceUpIds);
  }
  return () => {
    listeners.delete(listener);
  };
}
