'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useHubFilter, type HubFilter as HubFilterState } from '@/lib/useHubFilter';
import styles from '@/app/[locale]/bezirk/Bezirk.module.css';

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

  // `data-hub-filtered` hängt am Wrapper, damit CSS auf den gefilterten Zustand
  // reagieren kann, ohne dass jede Karte davon wissen muss — konkret nehmen die
  // Regeln in Bezirk.module.css den Platzziffern die Sichtbarkeit. `contents`
  // löst die Box wieder auf: der Provider steht als direktes Kind im Seiten-
  // Grid, ein echtes div dazwischen würde dessen Abstände verschieben.
  return (
    <HubFilterContext.Provider value={value}>
      <div className={styles.filterScope} data-hub-filtered={value.active ? 'true' : undefined}>
        {children}
      </div>
    </HubFilterContext.Provider>
  );
}

/**
 * Inhalt, der nur im ungefilterten Zustand gilt.
 *
 * Gebraucht für Aussagen über die *ganze* Liste: „Die 6 besten, ausgewählt von
 * Eat This" stimmt nicht mehr, sobald ein Bezirksfilter zwei davon übrig lässt.
 * Dasselbe gilt für die Platzziffern — die behaupten eine Rangfolge, die auf
 * eine Teilmenge nicht zutrifft (Rang 2 und 3 ohne Rang 1). Die Ziffern
 * verschwinden über CSS (`[data-hub-filtered] .rankBadge`), weil sie tief in
 * den Karten sitzen; alles, was als Block wegkann, kommt hier hinein.
 */
export function HubFilterUnfiltered({ children }: { children: ReactNode }) {
  const { active } = useContext(HubFilterContext);

  return <div hidden={active !== null}>{children}</div>;
}

/**
 * Zähl- und Chip-Leiste. Bewusst im Fluss statt sticky: sie steht mitten auf
 * der Seite, und ein Band, das sich beim Scrollen über den Hero legt, wäre hier
 * Chrome ohne Anlass. Ab 761px bricht das Rail um (siehe .filterRail), darunter
 * scrollt es waagerecht.
 */
export function HubFilterBar({
  facets,
  allLabel,
  allStatus,
  groupLabel,
}: {
  facets: HubFacet[];
  /** Beschriftung des Zurücksetzen-Chips („Alle" / „All"). */
  allLabel: string;
  allStatus: string;
  /** aria-label der Chip-Gruppe. */
  groupLabel: string;
}) {
  const { active, select } = useContext(HubFilterContext);
  const current = facets.find((f) => f.slug === active) ?? null;

  return (
    <div className={styles.categoryFilter}>
      <p className={styles.filterStatus} role="status">
        {current ? current.status : allStatus}
      </p>
      <div className={styles.filterRail} role="group" aria-label={groupLabel}>
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
 * Seitenverhältnis umwirft (siehe .cardSlot in Bezirk.module.css).
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
