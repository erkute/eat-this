'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import styles from './Bezirk.module.css';

/**
 * Bezirks-Filter für den /bezirk-Index.
 *
 * Der Index listet siebzehn Bezirke mit je vier Karten — rund zehn
 * Bildschirme, durch die man sich zum eigenen Kiez scrollen musste. Die
 * Chip-Leiste holt jeden Bezirk samt Spot-Zahl über die Falz und blendet auf
 * Klick alles andere aus; auf Mobil klebt sie zusätzlich unter der
 * Navigation (siehe .filterSticky).
 *
 * Bewusst in Provider / Leiste / Zeilen-Hülle geteilt statt als eine große
 * Client-Komponente: die Karten bleiben Server-Markup, der Client schaltet nur
 * Sichtbarkeit. Ohne JavaScript steht damit weiterhin die vollständige Liste
 * da — es fehlt dann der Filter, nicht der Inhalt.
 */

/** Ankerpunkt, auf den nach jedem Filterwechsel gescrollt wird. */
export const BEZIRK_LIST_ID = 'bezirk-liste';

/** Query-Parameter für den gefilterten Zustand, damit er teilbar bleibt. */
const QUERY_KEY = 'bezirk';

export interface BezirkChip {
  slug: string;
  name: string;
  count: number;
}

interface FilterState {
  active: string | null;
  select: (slug: string | null) => void;
}

const BezirkFilterContext = createContext<FilterState>({
  active: null,
  select: () => {},
});

function spotLabel(count: number, de: boolean): string {
  if (de) return count === 1 ? 'Spot' : 'Spots';
  return count === 1 ? 'spot' : 'spots';
}

export function BezirkFilterProvider({
  slugs,
  children,
}: {
  slugs: string[];
  children: ReactNode;
}) {
  const [active, setActive] = useState<string | null>(null);
  const known = useMemo(() => new Set(slugs), [slugs]);
  const settled = useRef(false);

  // Geteilte Links (?bezirk=neukoelln) gehen gefiltert auf. Bewusst erst nach
  // dem Mount: so bleibt das SSR-Markup die vollständige Liste. Unbekannte
  // Slugs werden ignoriert, sonst versteckte ein Tippfehler jede Zeile.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get(QUERY_KEY);
    if (wanted && known.has(wanted)) setActive(wanted);
  }, [known]);

  const select = useCallback((slug: string | null) => {
    setActive(slug);
    const url = new URL(window.location.href);
    if (slug) url.searchParams.set(QUERY_KEY, slug);
    else url.searchParams.delete(QUERY_KEY);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  // Beim Umschalten verschwinden Zeilen oberhalb des Blickfelds — ohne
  // Korrektur steht man anschließend im Weißraum unter der Liste. Der erste
  // Lauf wird übersprungen, damit ein Direktaufruf nicht sofort wegscrollt.
  //
  // Bewusst ohne `behavior`: der Vorgabewert `auto` übernimmt das CSS
  // `scroll-behavior` — global `smooth`, und unter `prefers-reduced-motion`
  // per `!important` auf `auto` zurückgesetzt (globals.css). Ein hier
  // fest verdrahtetes `smooth` würde genau diese Regel aushebeln.
  useEffect(() => {
    if (!settled.current) {
      settled.current = true;
      return;
    }
    document.getElementById(BEZIRK_LIST_ID)?.scrollIntoView({ block: 'start' });
  }, [active]);

  const value = useMemo(() => ({ active, select }), [active, select]);

  return <BezirkFilterContext.Provider value={value}>{children}</BezirkFilterContext.Provider>;
}

/**
 * Zählzeile plus Chip-Leiste. Beides liegt als Geschwister direkt im hohen
 * Abschnitt — `position: sticky` klebt nur innerhalb des eigenen Elternteils,
 * ein gemeinsamer Wrapper um beide wäre genauso hoch wie die Leiste selbst und
 * damit wirkungslos.
 */
export function BezirkFilterBar({
  districts,
  locale,
}: {
  districts: BezirkChip[];
  locale: 'de' | 'en';
}) {
  const { active, select } = useContext(BezirkFilterContext);
  const railRef = useRef<HTMLDivElement>(null);
  const de = locale === 'de';
  const current = districts.find((d) => d.slug === active) ?? null;
  const total = districts.reduce((sum, d) => sum + d.count, 0);

  // Auf Mobil ist die Leiste ein Rail: ein per ?bezirk=… gesetzter Chip liegt
  // sonst weit rechts außerhalb und der gefilterte Zustand hat gar keine
  // sichtbare Bestätigung. Bewusst `scrollLeft` statt `scrollIntoView` — das
  // würde auch vertikal korrigieren und sich mit dem Listen-Scroll des
  // Providers beißen. Ab 761px umbricht das Rail, dann ist es ein No-op.
  useEffect(() => {
    const rail = railRef.current;
    const chip = rail?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!rail || !chip) return;
    const railBox = rail.getBoundingClientRect();
    const chipBox = chip.getBoundingClientRect();
    const centered =
      rail.scrollLeft + (chipBox.left - railBox.left) - (railBox.width - chipBox.width) / 2;
    rail.scrollTo({ left: Math.max(0, centered) });
  }, [active]);

  const status = current
    ? `${current.name} · ${current.count} ${spotLabel(current.count, de)}`
    : de
      ? `${districts.length} Bezirke · ${total} Spots`
      : `${districts.length} districts · ${total} spots`;

  return (
    <>
      <p className={styles.filterStatus} role="status">
        {status}
      </p>
      <div className={styles.filterSticky}>
        <div
          ref={railRef}
          className={styles.filterRail}
          role="group"
          aria-label={de ? 'Nach Bezirk filtern' : 'Filter by district'}
        >
          <button
            type="button"
            className={styles.filterChip}
            aria-pressed={active === null}
            onClick={() => select(null)}
          >
            {de ? 'Alle' : 'All'}
          </button>
          {districts.map((d) => (
            <button
              key={d.slug}
              type="button"
              className={styles.filterChip}
              aria-pressed={active === d.slug}
              onClick={() => select(active === d.slug ? null : d.slug)}
            >
              {d.name}
              <span className={styles.filterChipCount}>{d.count}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/** Eine Bezirkszeile. Versteckt sich, sobald ein anderer Bezirk gewählt ist. */
export function BezirkRow({ slug, children }: { slug: string; children: ReactNode }) {
  const { active } = useContext(BezirkFilterContext);

  return (
    <section
      id={`bezirk-${slug}`}
      className={styles.districtRow}
      aria-labelledby={`bezirk-${slug}-title`}
      hidden={active !== null && active !== slug}
    >
      {children}
    </section>
  );
}
