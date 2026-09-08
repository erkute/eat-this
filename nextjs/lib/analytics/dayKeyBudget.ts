// nextjs/lib/analytics/dayKeyBudget.ts
//
// Die Obergrenze fuer die freien Map-Schluessel im Tagesdokument.
//
// `analytics_daily/<tag>` traegt fuenf Maps. `events` steht seit jeher auf
// einer Allowlist — die anderen vier (`paths`, `entryPaths`, `continuations`,
// `referrers`) nahmen bis 08.09.2026 jeden Schluessel an. Alle fuenf liegen in
// EINEM Dokument, und Firestore deckelt ein Dokument bei 1 MB und 20.000
// Indexeintraegen. Ist die Grenze gerissen, schlaegt jeder weitere
// Schreibvorgang des Tages fehl — nicht nur der, der sie gerissen hat.
//
// lib/analytics/pathKey.ts wirft schon alles weg, was keine Route dieser Seite
// ist. Was bleibt, sind die dynamischen Slugs und die fremden Verweis-Hosts:
// beide echt, beide unbegrenzt viele. Also ein Budget je Map. Was darueber
// hinausgeht, faellt in einen einzigen Sammelschluessel — die Summe bleibt
// richtig, nur die Aufschluesselung endet.
//
// Eine Allowlist der echten Slugs waere genauer, haette den Zaehler aber an
// Sanity gehaengt: vier Abfragen im heissen Pfad, und auf Staging liefert
// `sitemapEntries()` bewusst eine leere Liste — dort waere gar nichts mehr
// gezaehlt worden.

export type BudgetedMap = 'paths' | 'entryPaths' | 'continuations' | 'referrers';

const BUDGETED_MAPS: readonly BudgetedMap[] = ['paths', 'entryPaths', 'continuations', 'referrers'];

/** Der Katalog hat rund 380 URLs, mal zwei Sprachen. 1200 laesst also
 *  reichlich Luft und deckelt vier Maps bei zusammen 4800 Indexeintraegen —
 *  ein Viertel dessen, was ein Dokument vertraegt. */
export const MAP_KEY_BUDGET = 1200;

/** Kein Pfad dieser Seite (`/other` steht in keiner Route) und kein Host —
 *  `referrerHost` ersetzt Punkte, ein echter Host heisst nie nur „other". */
export const OVERFLOW_PATH = '/other';
export const OVERFLOW_HOST = 'other';

export type DayKeys = Record<BudgetedMap, Set<string>>;

function emptyKeys(): DayKeys {
  return {
    paths: new Set(),
    entryPaths: new Set(),
    continuations: new Set(),
    referrers: new Set(),
  };
}

/** Die Schluessel, die im Tagesdokument schon stehen. */
export function extractDayKeys(data: Record<string, unknown> | undefined): DayKeys {
  const keys = emptyKeys();
  if (!data) return keys;
  for (const map of BUDGETED_MAPS) {
    const value = data[map];
    if (value && typeof value === 'object') {
      for (const key of Object.keys(value)) keys[map].add(key);
    }
  }
  return keys;
}

/**
 * Der Schluessel, unter dem gezaehlt wird — oder `overflow`, wenn die Map ihr
 * Budget ausgeschoepft hat und dieser Schluessel neu waere.
 *
 * Merkt sich den vergebenen Schluessel, damit derselbe Pfad innerhalb eines
 * Zwischenspeicher-Fensters nicht zweimal aufs Budget geht.
 */
export function keyWithinBudget(
  keys: DayKeys | null,
  map: BudgetedMap,
  key: string,
  overflow: string,
  budget: number = MAP_KEY_BUDGET
): string {
  // `null` heisst: das Tagesdokument war nicht lesbar. Blind neue Schluessel
  // anzulegen ist genau der Fehler, den dieses Modul verhindern soll.
  if (!keys) return overflow;
  const known = keys[map];
  if (known.has(key)) return key;
  if (known.size >= budget) return overflow;
  known.add(key);
  return key;
}

/** Wie lange eine Instanz ihre Sicht auf die Schluessel behaelt. App Hosting
 *  faehrt bis zu zehn Instanzen; jede kann in diesem Fenster bis zum Budget
 *  auffuellen, die Summe darf das Budget also kurzzeitig ueberschreiten. Das
 *  ist eingepreist — 4800 Eintraege lassen dafuer Platz. */
export const DAY_KEYS_TTL_MS = 60_000;

let cache: { day: string; loadedAt: number; keys: DayKeys } | null = null;

/**
 * Die Schluessel des Tages, hoechstens einmal je Minute und Instanz aus
 * Firestore geholt. `null`, wenn der Lesevorgang gescheitert ist.
 */
export async function dayKeys(
  day: string,
  read: () => Promise<Record<string, unknown> | undefined>,
  now: number = Date.now()
): Promise<DayKeys | null> {
  if (cache && cache.day === day && now - cache.loadedAt < DAY_KEYS_TTL_MS) return cache.keys;
  try {
    const keys = extractDayKeys(await read());
    cache = { day, loadedAt: now, keys };
    return keys;
  } catch (error) {
    console.error(
      '[dayKeyBudget] day document unreadable',
      error instanceof Error ? error.name : 'UnknownError'
    );
    return null;
  }
}

/** Nur fuer Tests: der Zwischenspeicher lebt sonst so lange wie die Instanz. */
export function resetDayKeysCache(): void {
  cache = null;
}
