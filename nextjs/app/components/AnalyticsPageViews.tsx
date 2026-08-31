'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { countView, getAnalyticsPageLocation, loadAnalytics, trackEvent } from '@/lib/analytics';

/**
 * Ein Seitenaufruf ist ein Wechsel der SEITE — nicht der Filter.
 *
 * Bis zum 31.08.2026 hing dieser Effekt zusätzlich an `useSearchParams()`, und
 * die Karte schreibt jeden Filter per `pushState`/`replaceState` in die Query
 * (siehe `useMapFilterUrl.ts`). Jeder Tipp auf Kategorie, Bezirk, Preis oder
 * Suche zählte damit als eigener Seitenaufruf — auf derselben Seite, denn
 * `countView()` sendet ohnehin nur `pathname`, nie die Query. Im Fenster
 * 21.-31.08.2026 kamen so 7 bis 10 „Aufrufe" auf jeden Besucher, und als der
 * Umbau der Filterleiste am 30.08. die doppelten Schaltungen abstellte, halbierte
 * sich die Zahl über Nacht — bei unveraenderten Besuchern und unveraenderter
 * Herkunft. Das sah nach einem Einbruch aus und war eine Messgroesse, die nie
 * gemessen hat, was ihr Name sagt.
 *
 * Kein Query-Parameter dieser App bezeichnet eine eigene Seite: `lang` wird von
 * der Middleware weggeleitet, `e` und `claim` gehoeren zum Anmeldeweg, `days`
 * dem internen Zahlenbrett. Die Overlays der Karte (Spot, Must Eat) haben ihre
 * eigenen Ereignisse — `restaurant_opened`, `must_eat_opened` — und brauchen
 * den Seitenzaehler nicht.
 *
 * Ohne `useSearchParams` faellt auch die Suspense-Grenze weg, die allein dieser
 * Hook verlangte.
 */
export default function AnalyticsPageViews() {
  const pathname = usePathname();

  useEffect(() => {
    // Counted for everyone, before anything consent-dependent runs. This is the
    // only page-view signal that survives a "no thanks".
    countView();
    loadAnalytics();
    const { pageLocation, pagePath } = getAnalyticsPageLocation(window.location.href);
    trackEvent('page_view', {
      page_location: pageLocation,
      page_path: pagePath,
      page_title: document.title,
    });
  }, [pathname]);

  return null;
}
