'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Der Zustand hinter der Rubrikenzeile der Hub-Seiten (HubFilter): Kategorien
 * auf einer Bezirksseite (`?cat=`), Bezirke auf einer Kategorieseite
 * (`?bezirk=`). Hält genau einen aktiven Slug, spiegelt ihn in die URL und holt
 * die Liste nach dem Umschalten zurück ins Blickfeld.
 *
 * Die drei Feinheiten unten sind genau die, die man beim Nachbauen falsch
 * macht.
 */
export interface HubFilter {
  active: string | null;
  select: (slug: string | null) => void;
}

export function useHubFilter({
  queryKey,
  slugs,
  anchorId,
}: {
  /** Query-Parameter für den gefilterten Zustand, damit er teilbar bleibt. */
  queryKey: string;
  /** Alle Slugs, die der Filter kennt — alles andere wird ignoriert. */
  slugs: string[];
  /** Element, auf das nach jedem Filterwechsel gescrollt wird. */
  anchorId: string;
}): HubFilter {
  const [active, setActive] = useState<string | null>(null);
  const known = useMemo(() => new Set(slugs), [slugs]);
  // Der Filter, zu dem zuletzt gescrollt wurde — beim Ankommen keiner.
  const shown = useRef<string | null>(null);

  // Geteilte Links (?bezirk=neukoelln, ?cat=coffee) gehen gefiltert auf.
  // Bewusst erst nach dem Mount: so bleibt das SSR-Markup die vollständige
  // Liste. Unbekannte Slugs werden ignoriert, sonst versteckte ein Tippfehler
  // jede Zeile.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get(queryKey);
    if (wanted && known.has(wanted)) setActive(wanted);
  }, [known, queryKey]);

  const select = useCallback(
    (slug: string | null) => {
      setActive(slug);
      const url = new URL(window.location.href);
      if (slug) url.searchParams.set(queryKey, slug);
      else url.searchParams.delete(queryKey);
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    },
    [queryKey]
  );

  // Beim Umschalten verschwinden Einträge oberhalb des Blickfelds; ohne
  // Korrektur steht man anschließend im Weißraum unter der Liste. Gescrollt
  // wird nur, wenn sich der Filter wirklich geändert hat: Wer ankommt, ohne
  // gefilterten Link, bleibt oben. Ein Merker, der nur den ersten Lauf
  // überspringt, reicht dafür nicht: Reacts StrictMode lässt Effekte im
  // Dev-Server zweimal laufen, und der zweite scrollte die Seite beim Ankommen
  // nach unten.
  //
  // Bewusst ohne `behavior`: Der Vorgabewert `auto` übernimmt das CSS
  // `scroll-behavior`, global `smooth` und unter `prefers-reduced-motion` per
  // `!important` auf `auto` zurückgesetzt (globals.css). Ein hier fest
  // verdrahtetes `smooth` würde genau diese Regel aushebeln.
  useEffect(() => {
    if (active === shown.current) return;
    shown.current = active;
    document.getElementById(anchorId)?.scrollIntoView({ block: 'start' });
  }, [active, anchorId]);

  return useMemo(() => ({ active, select }), [active, select]);
}
