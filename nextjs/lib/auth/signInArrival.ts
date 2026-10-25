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

/**
 * Ob nach einer Anmeldung die Tour kommt — je Konto.
 *
 * Der Weg ins Profil wartet darauf (EmailLinkSignIn). Bis 14.10.2026 ging er
 * sofort, und das Profil stand offen da, bis `/api/starter-pack` antwortete
 * und die Tour aufging (Betreiber: „man darf nicht im Vorfeld das Profil
 * sehen"). Jetzt liegt der Ink-Grund der Tour schon, wenn die Seite wechselt.
 *
 * Die Antwort kann vor der Frage kommen — der Auth-Listener feuert, bevor
 * `signInWithEmailLink` zurückkehrt —, deshalb gemerkt statt nur gemeldet.
 * Gelesen wird sie nur einmal: eine zweite Anmeldung im selben Seitenleben
 * wartet auf ihre eigene Antwort statt auf die alte.
 */
const ARRIVAL_WAIT_MS = 8000;
const decided = new Map<string, boolean>();
const waiters = new Set<() => void>();

/** Nach jeder Runde des Starter-Pack-Abgleichs: `granted` heißt, die Tour kommt. */
export function settleArrival(uid: string, granted: boolean): void {
  decided.set(uid, granted);
  for (const wake of [...waiters]) wake();
}

/** Löst auf, sobald feststeht, ob die Tour kommt; hängt der Server, nach
 *  ARRIVAL_WAIT_MS mit `false` — eine verspätete Vergabe öffnet sie trotzdem. */
export function arrivalDecided(uid: string): Promise<boolean> {
  const known = decided.get(uid);
  if (known !== undefined) {
    decided.delete(uid);
    return Promise.resolve(known);
  }
  return new Promise((resolve) => {
    const finish = (granted: boolean) => {
      window.clearTimeout(timer);
      waiters.delete(wake);
      decided.delete(uid);
      resolve(granted);
    };
    const wake = () => {
      const granted = decided.get(uid);
      if (granted !== undefined) finish(granted);
    };
    const timer = window.setTimeout(() => finish(false), ARRIVAL_WAIT_MS);
    waiters.add(wake);
  });
}
