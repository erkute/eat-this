/**
 * Warum eine Google-Anmeldung nicht zustande kam.
 *
 * Ein verschluckter Fehler hieße für den Leser: Popup geht auf, tut kurz etwas,
 * ist wieder weg, und nichts sagt ihm warum. Und er stünde weder in der Konsole
 * noch in Sentry.
 *
 * Zwei Dinge sind daran verschieden, und sie dürfen nicht gleich behandelt
 * werden: Das Fenster selbst zumachen ist eine Entscheidung, kein Fehler. Wer
 * abbricht, will keine rote Meldung.
 *
 * `benign` steuert deshalb nur die Meldung auf dem Schirm, nicht, ob gemeldet
 * wird: `auth/popup-closed-by-user` ist auch das, was Firebase liefert, wenn
 * das Fenster ohne Ergebnis zugeht, weil die Übergabe gescheitert ist. Ein
 * kaputter Popup und ein Sinneswandel sehen von außen identisch aus.
 */
const BENIGN = new Set([
  // Der Leser hat das Popup zugemacht.
  'auth/popup-closed-by-user',
  // Zweiter Versuch, während der erste noch offen war.
  'auth/cancelled-popup-request',
  // Nur bei Redirect-Flows: keine Anmeldung im Gange.
  'auth/no-auth-event',
]);

interface GoogleSignInFailure {
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
