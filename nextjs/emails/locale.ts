// Die beiden Sprachen der Auth-Mails, dieselben wie die der Seite
// (i18n/routing.ts). DE ist Default: Ein Aufrufer ohne Angabe bekommt die
// deutsche Mail.

export type MailLocale = 'de' | 'en';

/** Alles, was nicht genau 'en' ist, wird Deutsch — der Body ist Nutzereingabe. */
export function mailLocale(value: unknown): MailLocale {
  return value === 'en' ? 'en' : 'de';
}
