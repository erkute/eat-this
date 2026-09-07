/**
 * Was die Google-Suche über die Seite sagt — die Leseseite der Search Console
 * fuer /admin/stats.
 *
 * Diese Datei kennt keine API und keinen Schluessel: sie bekommt Zeilen, wie
 * die Search Console sie liefert, und macht daraus die Antwort auf „welche
 * Suche funktioniert". Das Holen steht in searchConsole.server.ts; getrennt,
 * damit die Rechenregeln ohne Google testbar sind und die Typen auch dem
 * Client-Bundle nicht die Auth-Bibliothek anhaengen.
 */

/** Eine Zeile der Search Console — nach Suchanfrage, Seite, Gerät, Land oder Tag. */
export interface SearchRow {
  key: string;
  clicks: number;
  impressions: number;
  /** Klicks je Impression, 0–1. */
  ctr: number;
  /** Durchschnittliche Position, 1 = ganz oben. */
  position: number;
}

export interface SearchTotals {
  clicks: number;
  impressions: number;
  ctr: number;
  /** Nach Impressionen gewichtet — ein Tag mit 4.000 Impressionen wiegt mehr
   *  als einer mit 40. Der ungewichtete Schnitt der Tagespositionen laege
   *  daneben. */
  position: number;
}

export interface SearchDay {
  day: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/** Eine Suchanfrage im Vergleich zur Vorperiode. */
export interface SearchMover {
  key: string;
  clicks: number;
  clicksBefore: number;
  impressions: number;
  impressionsBefore: number;
  position: number;
  positionBefore: number;
  /** Klicks jetzt minus Klicks vorher. */
  diff: number;
}

/** Ein einzelner Tag der Suche, ausgebreitet — der frischeste, den Google hat. */
export interface SearchDayDetail {
  day: string;
  totals: SearchTotals;
  queries: SearchRow[];
  pages: SearchRow[];
}

export interface SearchSummary {
  /** Die GSC-Property, z. B. `sc-domain:eatthisdot.com`. */
  property: string;
  range: { start: string; end: string; days: number };
  totals: SearchTotals;
  /** Die gleich lange Periode davor — null, wenn dort nichts lag. */
  before: SearchTotals | null;
  /** Chronologisch aufsteigend, ein Punkt je Tag mit Daten. */
  days: SearchDay[];
  /** Suchanfragen nach Klicks. */
  queries: SearchRow[];
  /** Seiten nach Klicks. */
  pages: SearchRow[];
  /**
   * Fast oben: Anfragen, die Google oft zeigt, aber selten geklickt werden,
   * auf Position 4 bis 20. Das ist die Liste, an der Titel und Description
   * arbeiten koennen — ganz oben ist nichts mehr zu holen, jenseits von 20
   * sieht die Seite niemand.
   */
  opportunities: SearchRow[];
  /** MOBILE / DESKTOP / TABLET. */
  devices: SearchRow[];
  /** Länder als ISO-3166-1-alpha-3 in Kleinbuchstaben, wie Google sie liefert. */
  countries: SearchRow[];
  /** Anfragen, die gegenüber der Vorperiode am meisten gewonnen und verloren haben. */
  movers: { rising: SearchMover[]; falling: SearchMover[] };
  /** Der frischeste Tag mit Daten — Google liefert zwei bis drei Tage nach. */
  latestDay: SearchDayDetail | null;
  /** Der Tag davor, zum Vergleich. */
  previousDay: SearchDayDetail | null;
  /** Wann die Zahlen geholt wurden (ISO). Sie werden eine Stunde gehalten. */
  fetchedAt: string;
}

/** Die Antwort der Route: entweder Zahlen oder der Grund, warum nicht. */
export type SearchResult =
  | { ok: true; data: SearchSummary }
  | {
      ok: false;
      /** `no-access`: der Dienstkonto-Zugang fehlt in der Search Console. */
      reason: 'no-access' | 'error';
      /** Die E-Mail des Dienstkontos, das in der Search Console freigeschaltet
       *  werden muss — null, wenn schon das Ermitteln scheiterte. */
      identity: string | null;
      message: string;
    };

/** Eine Zeile, wie `searchAnalytics.query` sie liefert. */
export interface ApiRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

const TOP_N = 25;
const DAY_TOP_N = 20;
const MOVER_N = 10;
const OPPORTUNITY_N = 10;
/** Unter 30 Impressionen ist eine Anfrage Rauschen, keine Chance. */
const OPPORTUNITY_MIN_IMPRESSIONS = 30;

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function toRow(row: ApiRow, keyIndex = 0): SearchRow {
  return {
    key: row.keys?.[keyIndex] ?? '',
    clicks: num(row.clicks),
    impressions: num(row.impressions),
    ctr: num(row.ctr),
    position: num(row.position),
  };
}

/** Summen ueber Zeilen — CTR und Position werden neu gerechnet, nicht gemittelt. */
export function totalsOf(rows: SearchRow[]): SearchTotals {
  let clicks = 0;
  let impressions = 0;
  let weighted = 0;
  for (const row of rows) {
    clicks += row.clicks;
    impressions += row.impressions;
    weighted += row.position * row.impressions;
  }
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: impressions > 0 ? weighted / impressions : 0,
  };
}

/** Pfad statt voller URL: `https://www.eatthisdot.com/map` → `/map`. Die
 *  Tabelle ist ohnehin schmal, und die Domain steht in jeder Zeile gleich. */
export function pathOf(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}` || '/';
  } catch {
    return url;
  }
}

export function opportunitiesOf(queries: SearchRow[]): SearchRow[] {
  return queries
    .filter(
      (q) => q.impressions >= OPPORTUNITY_MIN_IMPRESSIONS && q.position >= 4 && q.position <= 20
    )
    .sort((a, b) => b.impressions - a.impressions || a.key.localeCompare(b.key))
    .slice(0, OPPORTUNITY_N);
}

const byClicks = (a: SearchRow, b: SearchRow): number =>
  b.clicks - a.clicks || b.impressions - a.impressions || a.key.localeCompare(b.key);

/**
 * Welche Anfragen sich bewegt haben. Nach Klicks, weil Impressionen bei einer
 * jungen Seite vor allem Googles Experimentierlust abbilden; die Impressionen
 * stehen daneben, damit ein Klick-Verlust bei gleichen Impressionen als
 * Positions- oder Snippet-Problem lesbar ist.
 */
export function moversOf(
  now: SearchRow[],
  before: SearchRow[]
): { rising: SearchMover[]; falling: SearchMover[] } {
  const beforeByKey = new Map(before.map((row) => [row.key, row]));
  const nowByKey = new Map(now.map((row) => [row.key, row]));
  const keys = new Set([...nowByKey.keys(), ...beforeByKey.keys()]);
  const all: SearchMover[] = [];
  for (const key of keys) {
    const a = nowByKey.get(key);
    const b = beforeByKey.get(key);
    const diff = (a?.clicks ?? 0) - (b?.clicks ?? 0);
    if (diff === 0) continue;
    all.push({
      key,
      clicks: a?.clicks ?? 0,
      clicksBefore: b?.clicks ?? 0,
      impressions: a?.impressions ?? 0,
      impressionsBefore: b?.impressions ?? 0,
      position: a?.position ?? 0,
      positionBefore: b?.position ?? 0,
      diff,
    });
  }
  const sorted = [...all].sort(
    (x, y) => Math.abs(y.diff) - Math.abs(x.diff) || x.key.localeCompare(y.key)
  );
  return {
    rising: sorted.filter((m) => m.diff > 0).slice(0, MOVER_N),
    falling: sorted.filter((m) => m.diff < 0).slice(0, MOVER_N),
  };
}

/**
 * Die letzten Tage, aufgeschlüsselt nach Anfrage und Seite. Google liefert
 * mit `dataState: all` auch frische, noch nicht endgültige Tage — der
 * jüngste davon ist „heute", so nah, wie die Search Console an heute
 * herankommt. `dayTotals` liefert die exakten Tagessummen, weil die
 * Anfragezeilen anonymisierte Suchen nicht enthalten.
 */
export function dayDetailsOf(
  byDateQuery: ApiRow[],
  byDatePage: ApiRow[],
  dayTotals: Map<string, SearchTotals>
): { latestDay: SearchDayDetail | null; previousDay: SearchDayDetail | null } {
  const queriesByDay = new Map<string, SearchRow[]>();
  const pagesByDay = new Map<string, SearchRow[]>();
  for (const row of byDateQuery) {
    const day = row.keys?.[0];
    if (!day) continue;
    const list = queriesByDay.get(day) ?? [];
    list.push(toRow(row, 1));
    queriesByDay.set(day, list);
  }
  for (const row of byDatePage) {
    const day = row.keys?.[0];
    if (!day) continue;
    const list = pagesByDay.get(day) ?? [];
    const page = toRow(row, 1);
    list.push({ ...page, key: pathOf(page.key) });
    pagesByDay.set(day, list);
  }
  const days = [...new Set([...queriesByDay.keys(), ...pagesByDay.keys(), ...dayTotals.keys()])]
    .filter((day) => (dayTotals.get(day)?.impressions ?? 0) > 0 || queriesByDay.has(day))
    .sort();
  const detail = (day: string | undefined): SearchDayDetail | null => {
    if (!day) return null;
    const queries = (queriesByDay.get(day) ?? []).filter((q) => q.key).sort(byClicks);
    const pages = (pagesByDay.get(day) ?? []).filter((p) => p.key).sort(byClicks);
    return {
      day,
      totals: dayTotals.get(day) ?? totalsOf(queries),
      queries: queries.slice(0, DAY_TOP_N),
      pages: pages.slice(0, DAY_TOP_N),
    };
  };
  return { latestDay: detail(days.at(-1)), previousDay: detail(days.at(-2)) };
}

export interface SearchInput {
  property: string;
  range: { start: string; end: string; days: number };
  /** Tageszeilen des Zeitraums (Dimension `date`). */
  byDay: ApiRow[];
  /** Tageszeilen der Vorperiode. */
  byDayBefore: ApiRow[];
  /** Zeilen nach Suchanfrage, von Google nach Klicks sortiert. */
  byQuery: ApiRow[];
  /** Suchanfragen der Vorperiode — für die Bewegungen. */
  byQueryBefore: ApiRow[];
  /** Zeilen nach Seite. */
  byPage: ApiRow[];
  byDevice: ApiRow[];
  byCountry: ApiRow[];
  /** Die letzten Tage nach `date` + `query`. */
  byDateQuery: ApiRow[];
  /** Die letzten Tage nach `date` + `page`. */
  byDatePage: ApiRow[];
  fetchedAt: string;
}

export function summarizeSearch(input: SearchInput): SearchSummary {
  const dayRows = input.byDay
    .map((row) => toRow(row))
    .filter((row) => row.key)
    .sort((a, b) => a.key.localeCompare(b.key));
  const before = input.byDayBefore.map((row) => toRow(row));
  const queries = input.byQuery
    .map((row) => toRow(row))
    .filter((row) => row.key)
    .sort(byClicks);
  const queriesBefore = input.byQueryBefore.map((row) => toRow(row)).filter((row) => row.key);
  const pages = input.byPage
    .map((row) => toRow(row))
    .filter((row) => row.key)
    .map((row) => ({ ...row, key: pathOf(row.key) }))
    .sort(byClicks);
  const devices = input.byDevice
    .map((row) => toRow(row))
    .filter((row) => row.key)
    .sort(byClicks);
  const countries = input.byCountry
    .map((row) => toRow(row))
    .filter((row) => row.key)
    .sort(byClicks)
    .slice(0, 10);

  const dayTotals = new Map<string, SearchTotals>(
    dayRows.map((row) => [
      row.key,
      { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position },
    ])
  );

  return {
    property: input.property,
    range: input.range,
    totals: totalsOf(dayRows),
    before: before.length > 0 ? totalsOf(before) : null,
    days: dayRows.map((row) => ({
      day: row.key,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    })),
    queries: queries.slice(0, TOP_N),
    pages: pages.slice(0, TOP_N),
    opportunities: opportunitiesOf(queries),
    devices,
    countries,
    movers: moversOf(queries, queriesBefore),
    ...dayDetailsOf(input.byDateQuery, input.byDatePage, dayTotals),
    fetchedAt: input.fetchedAt,
  };
}
