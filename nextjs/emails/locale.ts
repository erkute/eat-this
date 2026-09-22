// Die beiden Sprachen der Auth-Mails — dieselben wie die der Seite
// (i18n/routing.ts). DE ist Default: ein Aufrufer ohne Angabe bekommt die
// Mail, die es bis zum 21.09.2026 als einzige gab.

export type MailLocale = 'de' | 'en';

/** Alles, was nicht genau 'en' ist, wird Deutsch — der Body ist Nutzereingabe. */
export function mailLocale(value: unknown): MailLocale {
  return value === 'en' ? 'en' : 'de';
}
