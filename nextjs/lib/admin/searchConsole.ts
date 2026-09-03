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

/** Eine Zeile der Search Console — nach Suchanfrage, Seite oder Tag. */
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

export interface SearchSummary {
  /** Die GSC-Property, z. B. `sc-domain:eatthisdot.com`. */
  property: string;
  range: { start: string; end: string; days: number };
  totals: SearchTotals;
  /** Die gleich lange Periode davor — null, wenn dort nichts lag. */
  before: SearchTotals | null;
  /** Chronologisch aufsteigend, ein Punkt je Tag mit Daten. */
  days: { day: string; clicks: number; impressions: number }[];
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

const TOP_N = 15;
const OPPORTUNITY_N = 10;
/** Unter 30 Impressionen ist eine Anfrage Rauschen, keine Chance. */
const OPPORTUNITY_MIN_IMPRESSIONS = 30;

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function toRow(row: ApiRow): SearchRow {
  return {
    key: row.keys?.[0] ?? '',
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
      (q) =>
        q.impressions >= OPPORTUNITY_MIN_IMPRESSIONS && q.position >= 4 && q.position <= 20
    )
    .sort((a, b) => b.impressions - a.impressions || a.key.localeCompare(b.key))
    .slice(0, OPPORTUNITY_N);
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
  /** Zeilen nach Seite. */
  byPage: ApiRow[];
  fetchedAt: string;
}

export function summarizeSearch(input: SearchInput): SearchSummary {
  const days = input.byDay
    .map(toRow)
    .filter((row) => row.key)
    .sort((a, b) => a.key.localeCompare(b.key));
  const before = input.byDayBefore.map(toRow);
  const queries = input.byQuery
    .map(toRow)
    .filter((row) => row.key)
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);
  const pages = input.byPage
    .map(toRow)
    .filter((row) => row.key)
    .map((row) => ({ ...row, key: pathOf(row.key) }))
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);

  return {
    property: input.property,
    range: input.range,
    totals: totalsOf(days),
    before: before.length > 0 ? totalsOf(before) : null,
    days: days.map((row) => ({ day: row.key, clicks: row.clicks, impressions: row.impressions })),
    queries: queries.slice(0, TOP_N),
    pages: pages.slice(0, TOP_N),
    opportunities: opportunitiesOf(queries),
    fetchedAt: input.fetchedAt,
  };
}
