/**
 * Sieht das nach einer E-Mail-Adresse aus?
 *
 * Absichtlich nur die Form, nicht die Gueltigkeit: ob die Adresse existiert,
 * weiss erst der Posteingang, und ein strengeres Muster wirft mehr echte
 * Adressen weg, als es Tippfehler faengt. Der Zweck ist, dem Absender das
 * vergebliche Warten auf eine Mail an „hallo" zu ersparen.
 *
 * Aufgerufen von LoginBoard, dem einen Anmeldeformular fuer Modal,
 * Startseite und geteiltes Deck. Der Text zum Code steht dort
 * (`modals.login.emptyEmail` / `invalidEmail`).
 */
export type EmailShape = 'ok' | 'empty' | 'malformed';

export function isEmailish(value: string): EmailShape {
  const trimmed = value.trim();
  if (!trimmed) return 'empty';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? 'ok' : 'malformed';
}
