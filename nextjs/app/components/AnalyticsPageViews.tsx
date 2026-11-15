'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { countView } from '@/lib/analytics';

/**
 * Ein Seitenaufruf ist ein Wechsel der Seite, nicht der Filter.
 *
 * Der Effekt hängt deshalb nicht an `useSearchParams()`: Die Karte schreibt
 * jeden Filter per `pushState`/`replaceState` in die Query (siehe
 * `useMapFilterUrl.ts`), und jeder Tipp auf Kategorie, Bezirk, Preis oder Suche
 * zählte sonst als eigener Seitenaufruf, obwohl `countView()` ohnehin nur
 * `pathname` sendet, nie die Query.
 *
 * Kein Query-Parameter dieser App bezeichnet eine eigene Seite: `lang` wird von
 * der Middleware weggeleitet, `e` und `claim` gehören zum Anmeldeweg, `days`
 * dem internen Zahlenbrett. Die Overlays der Karte (Spot, Must Eat) haben ihre
 * eigenen Ereignisse (`restaurant_opened`, `must_eat_opened`) und brauchen den
 * Seitenzähler nicht.
 *
 * Ohne `useSearchParams` braucht es auch keine Suspense-Grenze.
 */
export default function AnalyticsPageViews() {
  const pathname = usePathname();

  useEffect(() => {
    countView();
  }, [pathname]);

  return null;
}
