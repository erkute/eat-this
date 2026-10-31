'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useHubFilter, type HubFilter as HubFilterState } from '@/lib/useHubFilter';
import styles from './HubIssue.module.css';

/**
 * Chip-Filter über einer Spot-Liste. Beide Hub-Typen benutzen ihn, jeweils mit
 * der Facette, die auf ihrer Seite noch offen ist:
 *
 * - Bezirksseite  → Kategorien  (`?cat=coffee`),  „Kaffee in Schöneberg"
 * - Kategorieseite → Bezirke     (`?bezirk=mitte`), „Frühstück in Mitte"
 *
 * Vorher waren beide Leisten Link-Reihen, die im Kreis zeigten: von Schöneberg
 * auf den Kaffee-Hub, von dort per Bezirksleiste wieder nach Schöneberg — und
 * „Kaffee in Schöneberg" bekam man nie zu sehen, obwohl genau das die Geste
 * versprach.
 *
 * Die Statuszeilen kommen **fertig gerendert** von der Seite (`status` je
 * Facette, `allStatus` für „Alle"). Grund: die beiden Seiten drehen den Satz
 * gegeneinander — hier ist die Facette die Kategorie, dort der Bezirk, der Satz
 * heißt aber immer „Kategorie in Bezirk". Eine Funktion als Prop ginge nicht,
 * die überlebt die Server/Client-Grenze nicht; fertige Strings tun es, und die
 * Sprachlogik bleibt da, wo der Rest der Seitentexte steht.
 *
 * Die Karten bleiben Server-Markup, der Client schaltet nur Sichtbarkeit. Ohne
 * JavaScript steht weiterhin die vollständige Liste da — es fehlt dann der
 * Filter, nicht der Inhalt. Die gemeinsame Zustandsmechanik liegt in
 * lib/useHubFilter.ts, das Schwestermodul für den /bezirk-Index (ganze Zeilen
 * statt einzelner Karten) in app/[locale]/bezirk/BezirkFilter.tsx.
 */

/** Ankerpunkt, auf den nach jedem Filterwechsel gescrollt wird. Beide Seiten
 *  tragen ihn auf der Sektion mit der Bestenliste. */
export const SPOT_LIST_ID = 'restaurants';

export interface HubFacet {
  slug: string;
  /** Chip-Beschriftung. */
  label: string;
  /** Statuszeile, solange dieser Chip aktiv ist. */
  status: string;
}

const HubFilterContext = createContext<HubFilterState>({
  active: null,
  select: () => {},
});

export function HubFilterProvider({
  queryKey,
  slugs,
  children,
}: {
  /** `cat` auf den Bezirksseiten, `bezirk` auf den Kategorieseiten — dieselben
   *  Namen, die auch die Karte für ihre Filter liest (lib/map/mapFilterParams). */
  queryKey: string;
  slugs: string[];
  children: ReactNode;
}) {
  const value = useHubFilter({ queryKey, slugs, anchorId: SPOT_LIST_ID });

  // Der Wrapper ist der Bereich, in dem die Leiste klebt: sie endet mit der
  // Liste.
  return (
    <HubFilterContext.Provider value={value}>
      <div className={styles.filterScope} data-filtered={value.active !== null}>{children}</div>
    </HubFilterContext.Provider>
  );
}

/**
 * Inhalt, der nur im ungefilterten Zustand gilt.
 *
 * Gebraucht für Aussagen über die *ganze* Liste: „Die 6 besten, ausgewählt von
 * Eat This" stimmt nicht mehr, sobald ein Bezirksfilter zwei davon übrig lässt
 * — genauso das Booster-Pack der Kategorie, das gefiltert abtritt.
 */
export function HubFilterUnfiltered({ children }: { children: ReactNode }) {
  const { active } = useContext(HubFilterContext);

  return <div hidden={active !== null}>{children}</div>;
}

/**
 * Die Rubriken über der Liste: Stücke Gewebeband wie die Profil-Reiter, das
 * gesetzte schwarz. Stehen im Fluss; ab Tablet bricht die Reihe um, am
 * Telefon steht ein Raster mit `columns` Spalten. Ist die Leiste nach oben aus
 * dem Bild gescrollt, solange die Liste noch zu sehen ist, liegt unten ein
 * einzelnes Stück Band mit dem gesetzten Filter; es bringt zurück zur Leiste.
 * Die Zählzeile ist nur für Vorleser da.
 */
export function HubFilterBar({
  facets,
  allLabel,
  allStatus,
  groupLabel,
  columns,
}: {
  facets: HubFacet[];
  /** Beschriftung des Zurücksetzen-Chips („Alle" / „All"). */
  allLabel: string;
  allStatus: string;
  /** aria-label der Chip-Gruppe. */
  groupLabel: string;
  /** Spalten am Telefon, damit die Reihen bündig aufgehen: die Bezirksseite
   *  hat zehn Chips (2), die Kategorieseite neun (3, in normaler Schreibweise,
   *  damit lange Bezirksnamen einzeilig bleiben). */
  columns: 2 | 3;
}) {
  const { active, select } = useContext(HubFilterContext);
  const current = facets.find((f) => f.slug === active) ?? null;
  const bar = useRef<HTMLDivElement>(null);
  const [away, setAway] = useState(false);

  // Beobachtet statt Scroll-Events: ab Desktop scrollt .app-pages, nicht das
  // Fenster. Weg ist die Leiste, wenn sie oberhalb des Bildes liegt und die
  // Liste darunter noch hineinreicht.
  useEffect(() => {
    const element = bar.current;
    const scope = element?.closest('[data-filtered]');
    if (!element || !scope || typeof IntersectionObserver === 'undefined') return;
    let above = false;
    let inList = false;
    const barSeen = new IntersectionObserver(([entry]) => {
      above = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      setAway(above && inList);
    });
    const listSeen = new IntersectionObserver(([entry]) => {
      inList = entry.isIntersecting;
      setAway(above && inList);
    }, { rootMargin: '0px 0px -40% 0px' });
    barSeen.observe(element);
    listSeen.observe(scope);
    return () => { barSeen.disconnect(); listSeen.disconnect(); };
  }, []);

  return (
    <>
      <p className={styles.filterStatus} role="status">
        {current ? current.status : allStatus}
      </p>
      <div className={styles.filterBar} ref={bar}>
        <div className={styles.filterRail} role="group" aria-label={groupLabel} data-columns={columns}>
          <button
            type="button"
            className={styles.filterChip}
            aria-pressed={active === null}
            onClick={() => select(null)}
          >
            {allLabel}
          </button>
          {facets.map((f) => (
            <button
              key={f.slug}
              type="button"
              className={styles.filterChip}
              aria-pressed={active === f.slug}
              onClick={() => select(active === f.slug ? null : f.slug)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        className={styles.filterReturn}
        data-shown={away || undefined}
        onClick={() => bar.current?.scrollIntoView({ block: 'center' })}
      >
        {current ? `Filter · ${current.label}` : 'Filter'}
      </button>
    </>
  );
}

/**
 * Eine Karte. Versteckt sich, sobald eine Facette gewählt ist, die sie nicht
 * trägt — ein Spot ohne jede Facette (kein Bezirks-Ref, keine Kategorie)
 * verschwindet damit bei jedem aktiven Filter, was richtig ist: hinter keinem
 * Chip wäre er sonst zu finden.
 *
 * `display: contents` in der Hülle, damit die Karte ihr eigenes Grid-Item
 * bleibt — sonst säße zwischen Raster und Karte eine Box, die Spalten und
 * Seitenverhältnis umwirft (siehe .cardSlot in HubIssue.module.css).
 */
export function HubFilterCard({ slugs, children }: { slugs: string[]; children: ReactNode }) {
  const { active } = useContext(HubFilterContext);

  return (
    <div className={styles.cardSlot} hidden={active !== null && !slugs.includes(active)}>
      {children}
    </div>
  );
}

/**
 * Eine Sektion samt Überschrift. Verschwindet, wenn der aktive Filter auf keine
 * ihrer Karten passt — sonst bliebe eine Überschrift wie „Das ganze
 * Verzeichnis" über einem leeren Raster stehen.
 */
export function HubFilterGroup({
  slugs,
  children,
}: {
  /** Alle Facetten-Slugs, die in dieser Sektion vorkommen. */
  slugs: string[];
  children: ReactNode;
}) {
  const { active } = useContext(HubFilterContext);

  return <div hidden={active !== null && !slugs.includes(active)}>{children}</div>;
}
