/**
 * Warum eine Google-Anmeldung nicht zustande kam.
 *
 * Bis 26.08.2026 verschluckten beide Aufrufer den Fehler mit einem nackten
 * `catch {}`. Für den Leser hiess das: Popup geht auf, tut kurz etwas, ist
 * wieder weg, und nichts sagt ihm warum ("es tut sich 'n bisschen was und dann
 * ist wieder weg"). Für mich hiess es, dass auf Staging drei Vermutungen
 * nacheinander an einem Fehler scheiterten, den niemand je gesehen hat — er
 * stand weder in der Konsole noch in Sentry.
 *
 * Zwei Dinge sind daran verschieden, und sie dürfen nicht gleich behandelt
 * werden: das Fenster selbst zumachen ist eine ENTSCHEIDUNG, kein Fehler. Wer
 * abbricht, will keine rote Meldung.
 *
 * `benign` steuert deshalb NUR die Meldung auf dem Schirm — nicht mehr, ob
 * gemeldet wird. Die erste Fassung koppelte beides, und das war blind an genau
 * der Stelle, an der ich hinsehen wollte: `auth/popup-closed-by-user` ist auch
 * das, was Firebase liefert, wenn das Fenster ohne Ergebnis zugeht, weil die
 * Übergabe gescheitert ist. Ein kaputter Popup und ein Sinneswandel sehen von
 * aussen identisch aus. Auf Staging hat mich das eine Runde gekostet: der
 * Reporter lief nachweislich, meldete aber nichts, weil ich ausgerechnet
 * diesen Code stummgeschaltet hatte (26.08.2026).
 */
const BENIGN = new Set([
  // Der Leser hat das Popup zugemacht.
  'auth/popup-closed-by-user',
  // Zweiter Versuch, während der erste noch offen war.
  'auth/cancelled-popup-request',
  // Nur bei Redirect-Flows: keine Anmeldung im Gange.
  'auth/no-auth-event',
]);

export interface GoogleSignInFailure {
  /** Firebase-Fehlercode, z. B. `auth/unauthorized-domain`. */
  code: string;
  /** Abbruch durch den Leser — keine rote Meldung (gemeldet wird trotzdem). */
  benign: boolean;
  /** Der Browser hat das Fenster geblockt — dagegen hilft eine andere Ansage. */
  blocked: boolean;
}

export function describeGoogleSignInError(error: unknown): GoogleSignInFailure {
  const code =
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string'
      ? (error as { code: string }).code
      : 'unknown';
  return { code, benign: BENIGN.has(code), blocked: code === 'auth/popup-blocked' };
}
