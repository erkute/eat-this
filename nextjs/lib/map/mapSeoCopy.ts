/**
 * Der Text der Kartenseite: die H1 (MapIntro). Der Textblock mit Absätzen und
 * Fragen am Listenende ist seit 22.10.2026 weg (Betreiber).
 *
 * Nicht in `lib/i18n/translations.ts`: das lesen nur Client-Komponenten über
 * `useTranslation`, und das JSON-LD wird auf dem Server gebaut.
 */

interface MapSeoCopy {
  /** Die einzige H1 der Seite. */
  h1: string;
}

const COPY: Record<'de' | 'en', MapSeoCopy> = {
  de: { h1: 'Berlin Food Map' },
  en: { h1: 'Berlin Food Map' },
};

/** Defensiver Fallback wie in `getLandingFaqs`: gepunktete Pfade umgehen die
 *  Locale-Middleware, dann steht hier ein roher Segmentwert. */
export function getMapSeoCopy(locale: string): MapSeoCopy {
  return COPY[locale === 'en' ? 'en' : 'de'];
}
