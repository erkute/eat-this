/**
 * Schluckt den „Geisterklick", den ein geschlossener System-Dialog hinterlassen
 * kann.
 *
 * Beobachtet auf dem Telefon: Standort-Abfrage bestätigen, und der Finger löst
 * an derselben Stelle einen Klick in der Seite aus — auf der Startseite liegt
 * dort bei 375×812 der Hero-Knopf (gemessen: Oberkante 395px, Bildschirmmitte
 * 406px), also landet man ungewollt auf der Karte.
 *
 * Die Unterscheidung ist verlässlich, weil ein echter Tap IMMER erst einen
 * `pointerdown` in der Seite auslöst und der Geisterklick nie: der Zeiger war
 * beim Drücken auf dem Dialog, nicht im Dokument. Es wird also nicht „alles für
 * X Millisekunden" geschluckt, sondern nur ein Klick ohne vorausgegangene
 * Geste.
 *
 * Tastaturbedienung bleibt unberührt: `Enter` auf einem fokussierten Knopf
 * erzeugt ebenfalls einen Klick ohne `pointerdown`, aber mit `detail === 0` und
 * ohne Bildschirmkoordinaten — daran ist er zu erkennen und wird durchgelassen.
 */

/** Wie lange nach einer echten Geste ein Klick als deren Folge gilt. */
const GESTURE_WINDOW_MS = 700;

export function armGhostClickGuard(): () => void {
  if (typeof document === 'undefined') return () => {};

  let lastGestureAt = Number.NEGATIVE_INFINITY;
  const noteGesture = (event: Event) => {
    lastGestureAt = event.timeStamp;
  };

  const swallow = (event: MouseEvent) => {
    // Tastatur-Klicks tragen keinen Zeiger — durchlassen.
    if (event.detail === 0 && event.screenX === 0 && event.screenY === 0) return;
    // Zu einer Geste in der Seite gehörig — also echt.
    if (event.timeStamp - lastGestureAt < GESTURE_WINDOW_MS) return;
    event.preventDefault();
    event.stopPropagation();
  };

  document.addEventListener('pointerdown', noteGesture, true);
  document.addEventListener('touchstart', noteGesture, true);
  document.addEventListener('click', swallow, true);

  return () => {
    document.removeEventListener('pointerdown', noteGesture, true);
    document.removeEventListener('touchstart', noteGesture, true);
    document.removeEventListener('click', swallow, true);
  };
}
