/**
 * Sieht das nach einer E-Mail-Adresse aus?
 *
 * Absichtlich nur die Form, nicht die Gueltigkeit: ob die Adresse existiert,
 * weiss erst der Posteingang, und ein strengeres Muster wirft mehr echte
 * Adressen weg, als es Tippfehler faengt. Der Zweck ist, dem Absender das
 * vergebliche Warten auf eine Mail an „hallo" zu ersparen.
 *
 * Eine Funktion, zwei Formulare — die Anmeldung auf der Startseite
 * (StarterPackSignup) und die auf dem geteilten Deck (DeckJoin). Als zwei
 * Kopien desselben Ausdrucks waere die eine irgendwann strenger als die
 * andere, und niemand faende heraus, welche.
 *
 * Der Text zum Code gehoert dem Aufrufer: die Startseite spricht ihr eigenes
 * `copy`-Objekt, das Deck den next-intl-Katalog.
 */
export type EmailShape = 'ok' | 'empty' | 'malformed';

export function isEmailish(value: string): EmailShape {
  const trimmed = value.trim();
  if (!trimmed) return 'empty';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? 'ok' : 'malformed';
}
