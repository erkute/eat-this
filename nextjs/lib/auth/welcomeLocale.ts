/**
 * In welcher Sprache /welcome spricht.
 *
 * /welcome liegt ausserhalb von [locale] und hat keinen next-intl-Provider.
 * Bis zum 21.09.2026 war die Seite deshalb nur deutsch, und die Sprache kam
 * allein aus dem NEXT_LOCALE-Cookie — und das nur fuer die Weiterleitung.
 * Der Cookie fehlt aber genau im Normalfall: die Gmail-App reicht den Link an
 * einen Browser weiter, der die Seite nie gesehen hat.
 *
 * Darum traegt die Continue-URL die Sprache selbst (`lang`, gesetzt von
 * sendMagicLinkEmail), so wie sie schon die Adresse (`e`) traegt. Der Cookie
 * ist nur noch Rueckfall fuer Links von vor dieser Aenderung.
 */

import { routing } from '@/i18n/routing';

export type WelcomeLocale = 'de' | 'en';

/** Sprach-Traeger in der Continue-URL. */
export const LANG_PARAM = 'lang';

function known(v: string | null | undefined): WelcomeLocale | null {
  return v && (routing.locales as readonly string[]).includes(v) ? (v as WelcomeLocale) : null;
}

export function welcomeLocale(search: string, cookie: string): WelcomeLocale {
  const cu = new URLSearchParams(search).get('continueUrl');
  if (cu) {
    try {
      const fromLink = known(new URL(cu).searchParams.get(LANG_PARAM));
      if (fromLink) return fromLink;
    } catch {}
  }
  const m = cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  let fromCookie: string | null = null;
  try {
    fromCookie = m ? decodeURIComponent(m[1]) : null;
  } catch {}
  return known(fromCookie) ?? (routing.defaultLocale as WelcomeLocale);
}
