import {
  summarizeInsights,
  type InsightDoc,
  type InsightSummary,
} from '@/lib/analytics/engagement';
/**
 * Aggregation für /admin/stats: der eigene Zähler (app/api/count/route.ts) plus
 * Konten, Karten und Umsatz. Frei von Firestore, damit die Regeln ohne Emulator
 * testbar sind. Ereignisse zählen keine Personen.
 */

import { measureDay, type MeasurementDay } from '@/lib/admin/pageStats';
import type { SearchResult } from '@/lib/admin/searchConsole';
import { REVEALED_TARGET } from '@/lib/map/revealed-must-eats';
import { STARTER_PACK_CARDS } from '@/lib/starter-pack';
import { CATALOG } from '@/lib/stripe-catalog';

export interface DailyDoc {
  day: string;
  pageviews?: number;
  visitors?: number;
  paths?: Record<string, number>;
  entryPaths?: Record<string, number>;
  entryChannels?: Record<string, number>;
  continuations?: Record<string, number>;
  referrers?: Record<string, number>;
  events?: Record<string, number>;
}

interface DayPoint {
  day: string;
  pageviews: number;
  visitors: number;
}

interface EventDay {
  day: string;
  counts: Record<string, number>;
}

interface Entry {
  key: string;
  count: number;
}

export interface ExitEntry {
  key: string;
  views: number;
  continued: number;
  /** views − continued, nie negativ. */
  exits: number;
  /** Anteil der Aufrufe, die hier endeten (0–1). */
  rate: number;
}

export interface Delta {
  now: number;
  before: number;
  change: number | null;
}

export interface Mover {
  key: string;
  now: number;
  before: number;
  diff: number;
}

interface Weekday {
  /** 0 = Sonntag, wie Date.getUTCDay(). */
  index: number;
  visitors: number;
  pageviews: number;
  days: number;
}

interface FunnelStep {
  key: string;
  count: number;
  share: number;
}

export interface FunnelStage {
  key: 'free' | 'account' | 'onsite' | 'packs';
  title: string;
  offer: string;
  steps: FunnelStep[];
}

/**
 * Eine Quote zwischen zwei Stufen, die wirklich aufeinander folgen;
 * handverlesen, weil die Reise keine strenge Kette ist.
 */
interface FunnelRate {
  key: string;
  from: string;
  to: string;
  now: number;
  base: number;
  /** now / base; null ohne Basis. */
  rate: number | null;
}

export interface Funnel {
  /**
   * Ereignisse, keine Personen: Wer dreimal öffnet, zählt dreimal. Personen
   * liefert `Accounts.people`.
   */
  stages: FunnelStage[];
  rates: FunnelRate[];
}

export interface AccountRecord {
  createdDay: string;
  /**
   * `lastRefreshTime` aus Firebase Auth: Das Token wird nur erneuert, solange
   * die Seite offen ist, also eine bessere Näherung für Nutzung als die
   * monatelang gültige Anmeldung.
   */
  lastActiveDay: string | null;
  provider: 'google' | 'email';
  favorites: number;
  starterPack: boolean;
  reveals: number;
  referrals: number;
  purchases: number;
}

export interface PurchaseRecord {
  day: string;
  /** stripe = bezahlt; signup = Starter Pack; manual = von Hand. */
  source: string;
  starter: boolean;
  packId: string;
}

export interface RevealRecord {
  day: string;
}

export interface ReferralRecord {
  day: string;
  /** `invited-by` steht beim Eingeladenen (eine erfolgreiche Einladung),
   *  `invited` beim Einladenden (seine Belohnung). */
  source: string;
}

export interface CheckoutRecord {
  day: string;
  /** `open`, solange Stripe keinen Abschluss gemeldet hat. */
  status: string;
  packId: string;
}

export interface AccountsInput {
  accounts: AccountRecord[];
  purchases: PurchaseRecord[];
  reveals: RevealRecord[];
  referrals: ReferralRecord[];
  checkouts: CheckoutRecord[];
}

export interface PeopleFunnel {
  accounts: number;
  withStarterPack: number;
  withReveal: number;
  withReferral: number;
  buyers: number;
}

interface AccountsDay {
  day: string;
  newAccounts: number;
  starterPacks: number;
  reveals: number;
  referrals: number;
  purchases: number;
  revenueCents: number;
}

interface PackSales {
  packId: string;
  name: string;
  count: number;
  revenueCents: number;
}

export interface Accounts {
  total: number;
  newInWindow: number;
  activeInWindow: number;
  /**
   * Aktive Konten in festen Fenstern (heute, 7 und 30 Tage), unabhängig vom
   * gewählten Zeitraum.
   */
  active: { day: number; week: number; month: number };
  google: number;
  email: number;
  withFavorites: number;
  starterPacks: { total: number; inWindow: number };
  reveals: { total: number; inWindow: number };
  referrals: { total: number; inWindow: number };
  purchases: { total: number; inWindow: number; byPack: PackSales[] };
  /** Brutto, aus dem Katalogpreis des gekauften Packs. */
  revenue: { totalCents: number; inWindowCents: number };
  checkouts: { inWindow: number; open: number; completed: number };
  people: PeopleFunnel;
  byDay: AccountsDay[];
}

interface DeckCategory {
  slug: string;
  name: string;
  cards: number;
  spots: number;
  packId: string | null;
  /** Ein Pack ohne Karte ist nicht käuflich (`/api/stripe/checkout` → 409). */
  sellable: boolean;
}

export interface Deck {
  cards: number;
  publicCards: number;
  spots: number;
  freeCards: number;
  starterCards: number;
  byCategory: DeckCategory[];
}

export interface DaySummary {
  day: string;
  pageviews: number;
  visitors: number;
  vsPrevDay: { visitors: Delta; pageviews: Delta } | null;
  vsSameWeekday: { visitors: Delta; pageviews: Delta } | null;
  paths: Entry[];
  entryPaths: Entry[];
  referrers: Entry[];
  events: Entry[];
  exits: ExitEntry[];
  /** Ob der Tag `continuations` trägt — sonst sind `exits` leer, nicht null. */
  hasExits: boolean;
  funnel: Funnel;
  people: AccountsDay | null;
}

/**
 * Ab diesem Tag zählen `entryPaths` und `continuations` den ganzen Tag; davor
 * wäre jeder Aufruf ein Ausstieg.
 */
export const FULL_DAY_FIELDS_SINCE = '2026-08-29';

export interface Live {
  activeNow: number;
  minutes: number;
  at: string;
}

export interface StatsSummary {
  range: { start: string; end: string; days: number; today: string; includesToday: boolean };
  days: DayPoint[];
  previousDays: DayPoint[];
  eventsByDay: EventDay[];
  measurement: MeasurementDay[];
  entryChannels: Entry[];
  engagement: InsightSummary;
  search: SearchResult | null;
  /** `closedDays` laesst den laufenden Tag weg — fuer alles, was „je Tag" rechnet. */
  totals: { pageviews: number; visitors: number; days: number; closedDays: number };
  accounts: Accounts | null;
  deck: Deck | null;
  live: Live | null;
  /**
   * Der jüngste abgeschlossene Tag. `today` steht getrennt, weil ein laufender
   * Tag sonst wie ein Einbruch aussieht.
   */
  latest: {
    day: DayPoint | null;
    vsPrevDay: { visitors: Delta; pageviews: Delta } | null;
    vsSameWeekday: { visitors: Delta; pageviews: Delta } | null;
  };
  today: DayPoint | null;
  /**
   * Zeitraum gegen Vorperiode je Tag, nicht in Summen: Gleich lange Fenster
   * haben nicht gleich viele Tage mit Daten.
   */
  period: {
    visitors: Delta;
    pageviews: Delta;
    days: number;
    daysNow: number;
  } | null;
  weekdays: Weekday[];
  movers: { paths: Mover[]; referrers: Mover[]; events: Mover[] };
  paths: Entry[];
  entryPaths: Entry[];
  referrerPageviews: number;
  referrers: Entry[];
  events: Entry[];
  exits: ExitEntry[];
  /**
   * Nur Tage mit `continuations` gehen in die Ausstiegsrechnung.
   */
  exitDays: number;
  funnel: Funnel;
  dayDetails: { today: DaySummary | null; latest: DaySummary | null };
}

export interface Range {
  start: string;
  end: string;
  days: number;
}

const DEFAULT_DAYS = 7;
const MAX_DAYS = 365;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function parseDays(raw: string | null): number {
  if (!raw) return DEFAULT_DAYS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_DAYS;
  return Math.min(parsed, MAX_DAYS);
}

/**
 * `?days=7` (endet gestern) oder `?from=…&to=…`; höchstens ein Jahr, nicht über
 * heute hinaus. Hier statt in der Route, weil eine Route-Datei nur Handler
 * exportieren darf.
 */
export function parseRange(params: URLSearchParams, today: string): Range {
  if (params.get('today') === '1') return { start: today, end: today, days: 1 };
  const lastClosedDay = dayBefore(today);
  const from = params.get('from');
  const to = params.get('to');
  if (
    from &&
    to &&
    DAY_KEY.test(from) &&
    DAY_KEY.test(to) &&
    dayBefore(from, 0) === from &&
    dayBefore(to, 0) === to &&
    from <= to
  ) {
    const end = to > today ? today : to;
    const spanned = daysBetween(from, end);
    const days = Math.min(Math.max(spanned, 1), MAX_DAYS);
    return { start: sinceDay(days, end), end, days };
  }
  const days = parseDays(params.get('days'));
  return { start: sinceDay(days, lastClosedDay), end: lastClosedDay, days };
}

/**
 * Über das Datum geschnitten, nicht über die Zahl der Dokumente: Tage ohne
 * Aufruf haben kein Dokument.
 */
export function sinceDay(days: number, end: string): string {
  return dayBefore(end, days - 1);
}

/**
 * UTC-Mittag als Anker, damit keine Zeitumstellung den Tag kippt.
 */
export function dayBefore(day: string, back = 1): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date, 12) - back * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export function daysBetween(start: string, end: string): number {
  const at = (day: string) => {
    const [year, month, date] = day.split('-').map(Number);
    return Date.UTC(year, month - 1, date, 12);
  };
  return Math.round((at(end) - at(start)) / 86_400_000) + 1;
}

export function eachDay(start: string, end: string): string[] {
  const count = daysBetween(start, end);
  if (count < 1) return [];
  return Array.from({ length: count }, (_, i) => dayBefore(end, count - 1 - i));
}

export function weekdayOf(day: string): number {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date, 12)).getUTCDay();
}

const TOP_N = 15;

function addInto(target: Map<string, number>, source: Record<string, number> | undefined): void {
  if (!source) return;
  for (const [key, value] of Object.entries(source)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    target.set(key, (target.get(key) ?? 0) + value);
  }
}

function topEntries(counts: Map<string, number>, limit = TOP_N): Entry[] {
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

/**
 * Der Zähler ersetzt Punkte in Map-Schlüsseln (Firestore erlaubt keine); für
 * die Anzeige zurückdrehen.
 */
function restoreHost(key: string): string {
  return key.replace(/_/g, '.');
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * `change` bleibt null ohne Vorperiode: 0 auf 5 ist kein „+500 %".
 */
export function delta(now: number, before: number): Delta {
  return { now, before, change: before > 0 ? (now - before) / before : null };
}

function sumField(docs: DailyDoc[], field: 'pageviews' | 'visitors'): number {
  return docs.reduce((total, doc) => total + num(doc[field]), 0);
}

function pointOf(doc: DailyDoc): DayPoint {
  return { day: doc.day, pageviews: num(doc.pageviews), visitors: num(doc.visitors) };
}

function movers(now: Map<string, number>, before: Map<string, number>, limit = 8): Mover[] {
  const keys = new Set([...now.keys(), ...before.keys()]);
  return [...keys]
    .map((key) => {
      const a = now.get(key) ?? 0;
      const b = before.get(key) ?? 0;
      return { key, now: a, before: b, diff: a - b };
    })
    .filter((m) => m.diff !== 0)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff) || a.key.localeCompare(b.key))
    .slice(0, limit);
}

function exitsOf(views: Map<string, number>, continued: Map<string, number>): ExitEntry[] {
  return (
    [...views.entries()]
      .map(([key, count]) => {
        const went = continued.get(key) ?? 0;
        const raw = count - went;
        return {
          key,
          views: count,
          continued: went,
          exits: Math.max(0, raw),
          rate: count > 0 ? Math.max(0, raw) / count : 0,
        };
      })
      // Sortiert nach absoluten Ausstiegen; Quoten kleiner Seiten bedeuten
      // nichts.
      .sort((a, b) => b.exits - a.exits || a.key.localeCompare(b.key))
      .slice(0, TOP_N)
  );
}

const PACKS_PAGE = /^(?:\/en)?\/packs$/;
const PACK_PAGE = /^(?:\/en)?\/pack\/[^/]+$/;

function pathsMatching(paths: Map<string, number>, pattern: RegExp): number {
  let total = 0;
  for (const [key, count] of paths) if (pattern.test(key)) total += count;
  return total;
}

/**
 * Die Pack-Seiten feuern selbst kein Ereignis, bevor `view_item` den Kaufknopf
 * sieht; ihre Stufen kommen deshalb aus den Seitenaufrufen.
 */
export function buildFunnel(
  events: Map<string, number>,
  paths: Map<string, number>,
  visitors: number
): Funnel {
  const count = (key: string): number => events.get(key) ?? 0;
  const step = (key: string, value: number): FunnelStep => ({
    key,
    count: value,
    share: visitors > 0 ? value / visitors : 0,
  });
  const signedIn = count('login') + count('sign_up');
  const packsPage = pathsMatching(paths, PACKS_PAGE);
  const packPage = pathsMatching(paths, PACK_PAGE);

  const stages: FunnelStage[] = [
    {
      key: 'free',
      title: 'Frei',
      offer: 'Map, Spots und öffentliche Must Eats',
      steps: [
        step('visitors', visitors),
        step('map_opened', count('map_opened')),
        step('restaurant_opened', count('restaurant_opened')),
        step('must_eat_opened', count('must_eat_opened')),
      ],
    },
    {
      key: 'account',
      title: 'Konto',
      offer: `Starter Pack mit bis zu ${STARTER_PACK_CARDS} Karten`,
      steps: [
        step('must_eat_reveal_login_required', count('must_eat_reveal_login_required')),
        step('login_view', count('login_view')),
        step('login_start', count('login_start')),
        step('signed_in', signedIn),
        step('sign_up', count('sign_up')),
        step('starter_pack_granted', count('starter_pack_granted')),
      ],
    },
    {
      key: 'onsite',
      title: 'Vor Ort',
      offer: 'Mit Konto am Spot aufdecken',
      steps: [
        step('must_eat_reveal_location_requested', count('must_eat_reveal_location_requested')),
        step('must_eat_reveal_too_far', count('must_eat_reveal_too_far')),
        step('must_eat_reveal_location_missing', count('must_eat_reveal_location_missing')),
        step('must_eat_reveal_unlocked', count('must_eat_reveal_unlocked')),
        step('must_eat_reveal_failed', count('must_eat_reveal_failed')),
      ],
    },
    {
      key: 'packs',
      title: 'Booster Packs',
      offer: 'Alle Karten einer Kategorie, oder All Berlin',
      steps: [
        step('packs_page', packsPage),
        step('pack_page', packPage),
        step('view_item', count('view_item')),
        step('begin_checkout', count('begin_checkout')),
        step('purchase', count('purchase')),
        step('checkout_error', count('checkout_error')),
      ],
    },
  ];

  const rate = (key: string, from: string, base: number, to: string, now: number): FunnelRate => ({
    key,
    from,
    to,
    now,
    base,
    rate: base > 0 ? now / base : null,
  });

  return {
    stages,
    rates: [
      rate('visit_map', 'visitors', visitors, 'map_opened', count('map_opened')),
      rate(
        'map_must_eat',
        'map_opened',
        count('map_opened'),
        'must_eat_opened',
        count('must_eat_opened')
      ),
      rate(
        'must_eat_login',
        'must_eat_opened',
        count('must_eat_opened'),
        'must_eat_reveal_login_required',
        count('must_eat_reveal_login_required')
      ),
      rate('login_view_signed', 'login_view', count('login_view'), 'signed_in', signedIn),
      // Keine Quote sign_up → starter_pack_granted: Bestehende Konten bekommen
      // das Pack bei ihrer nächsten Anmeldung, die Quote läge über 100 %.
      rate(
        'pack_checkout',
        'pack_visits',
        packsPage + packPage,
        'begin_checkout',
        count('begin_checkout')
      ),
      rate(
        'checkout_purchase',
        'begin_checkout',
        count('begin_checkout'),
        'purchase',
        count('purchase')
      ),
      rate('visit_purchase', 'visitors', visitors, 'purchase', count('purchase')),
    ],
  };
}

function summarizeDay(
  doc: DailyDoc,
  lookup: (day: string) => DailyDoc | undefined,
  people: AccountsDay | null
): DaySummary {
  const paths = new Map<string, number>();
  const entryPaths = new Map<string, number>();
  const referrers = new Map<string, number>();
  const events = new Map<string, number>();
  const continued = new Map<string, number>();
  addInto(paths, doc.paths);
  addInto(entryPaths, doc.entryPaths);
  addInto(referrers, doc.referrers);
  addInto(events, doc.events);
  addInto(continued, doc.continuations);

  const point = pointOf(doc);
  const compare = (other: DailyDoc | undefined) =>
    other
      ? {
          visitors: delta(point.visitors, num(other.visitors)),
          pageviews: delta(point.pageviews, num(other.pageviews)),
        }
      : null;
  const hasExits = doc.day >= FULL_DAY_FIELDS_SINCE && Boolean(doc.continuations);

  return {
    day: doc.day,
    pageviews: point.pageviews,
    visitors: point.visitors,
    vsPrevDay: compare(lookup(dayBefore(doc.day))),
    vsSameWeekday: compare(lookup(dayBefore(doc.day, 7))),
    paths: topEntries(paths, Number.MAX_SAFE_INTEGER),
    entryPaths: topEntries(entryPaths, Number.MAX_SAFE_INTEGER),
    referrers: topEntries(referrers, 10).map((e) => ({ ...e, key: restoreHost(e.key) })),
    events: topEntries(events, Number.MAX_SAFE_INTEGER),
    exits: hasExits ? exitsOf(paths, continued).slice(0, 10) : [],
    hasExits,
    funnel: buildFunnel(events, paths, point.visitors),
    people,
  };
}

interface SummarizeOptions {
  today?: string;
  range?: { start: string; end: string };
  accounts?: Accounts | null;
  search?: SearchResult | null;
  deck?: Deck | null;
  live?: Live | null;
  insights?: InsightDoc[];
}

export function summarize(
  docs: DailyDoc[],
  before: DailyDoc[] = [],
  options: SummarizeOptions = {}
): StatsSummary {
  const { today = '', accounts = null, search = null, deck = null, live = null } = options;
  const fill = (input: DailyDoc[], start: string, end: string): DailyDoc[] => {
    const byDay = new Map(input.map((doc) => [doc.day, doc]));
    return eachDay(start, end).map((day) => byDay.get(day) ?? { day });
  };
  const window = options.range;
  const sorted = window
    ? fill(docs, window.start, window.end)
    : [...docs].sort((a, b) => a.day.localeCompare(b.day));
  const sortedBefore = window
    ? fill(
        before,
        dayBefore(window.start, daysBetween(window.start, window.end)),
        dayBefore(window.start)
      )
    : [...before].sort((a, b) => a.day.localeCompare(b.day));
  const start = options.range?.start ?? sorted[0]?.day ?? today;
  const end = options.range?.end ?? sorted.at(-1)?.day ?? today;

  const paths = new Map<string, number>();
  const entryPaths = new Map<string, number>();
  const entryChannels = new Map<string, number>();
  const referrers = new Map<string, number>();
  const events = new Map<string, number>();

  // Nur Tage, die beide Seiten der Subtraktion tragen.
  const exitViews = new Map<string, number>();
  const exitContinued = new Map<string, number>();
  let exitDays = 0;

  const days: DayPoint[] = [];
  const eventsByDay: EventDay[] = [];
  let pageviews = 0;
  let visitors = 0;

  for (const doc of sorted) {
    const point = pointOf(doc);
    pageviews += point.pageviews;
    visitors += point.visitors;
    days.push(point);
    const counts: Record<string, number> = {};
    for (const [key, value] of Object.entries(doc.events ?? {})) {
      if (typeof value === 'number' && Number.isFinite(value)) counts[key] = value;
    }
    eventsByDay.push({ day: doc.day, counts });

    addInto(paths, doc.paths);
    addInto(entryPaths, doc.entryPaths);
    addInto(entryChannels, doc.entryChannels);
    addInto(referrers, doc.referrers);
    addInto(events, doc.events);

    const fullDay = doc.day >= FULL_DAY_FIELDS_SINCE;

    if (fullDay && doc.continuations) {
      exitDays += 1;
      addInto(exitViews, doc.paths);
      addInto(exitContinued, doc.continuations);
    }
  }

  const beforePaths = new Map<string, number>();
  const beforeReferrers = new Map<string, number>();
  const beforeEvents = new Map<string, number>();
  for (const doc of sortedBefore) {
    addInto(beforePaths, doc.paths);
    addInto(beforeReferrers, doc.referrers);
    addInto(beforeEvents, doc.events);
  }

  // Der laufende Tag zählt für Verlauf und Summen, nie als Vergleichsgröße.
  const todayDoc = today ? sorted.find((d) => d.day === today) : undefined;
  const todayPoint = todayDoc ? pointOf(todayDoc) : null;
  const closed = days.filter((d) => d.day !== today);
  const latestDay = closed.at(-1) ?? null;
  // Derselbe Wochentag der Vorwoche liegt bei „7 Tage" außerhalb des Fensters.
  const docAt = (day: string): DailyDoc | undefined =>
    sorted.find((d) => d.day === day) ?? sortedBefore.find((d) => d.day === day);
  const compare = (point: DayPoint | null, other: DailyDoc | undefined) =>
    point && other
      ? {
          visitors: delta(point.visitors, num(other.visitors)),
          pageviews: delta(point.pageviews, num(other.pageviews)),
        }
      : null;
  const closedVisitors = closed.reduce((total, d) => total + d.visitors, 0);
  const closedPageviews = closed.reduce((total, d) => total + d.pageviews, 0);

  const weekdayBuckets = new Map<number, Weekday>();
  for (const point of closed) {
    const index = weekdayOf(point.day);
    const bucket = weekdayBuckets.get(index) ?? { index, visitors: 0, pageviews: 0, days: 0 };
    bucket.visitors += point.visitors;
    bucket.pageviews += point.pageviews;
    bucket.days += 1;
    weekdayBuckets.set(index, bucket);
  }

  const peopleAt = (day: string): AccountsDay | null =>
    accounts?.byDay.find((d) => d.day === day) ?? null;
  const latestDoc = latestDay ? docAt(latestDay.day) : undefined;

  return {
    range: { start, end, days: daysBetween(start, end), today, includesToday: Boolean(todayDoc) },
    days,
    previousDays: sortedBefore.map(pointOf),
    eventsByDay,
    measurement: sorted.map(measureDay),
    entryChannels: topEntries(entryChannels, Number.MAX_SAFE_INTEGER),
    engagement: summarizeInsights(options.insights ?? []),
    search,
    totals: { pageviews, visitors, days: sorted.length, closedDays: closed.length },
    accounts,
    deck,
    live,
    latest: {
      day: latestDay,
      vsPrevDay: compare(latestDay, latestDay ? docAt(dayBefore(latestDay.day)) : undefined),
      vsSameWeekday: compare(latestDay, latestDay ? docAt(dayBefore(latestDay.day, 7)) : undefined),
    },
    today: todayPoint,
    period:
      sortedBefore.length && closed.length
        ? {
            visitors: delta(
              closedVisitors / closed.length,
              sumField(sortedBefore, 'visitors') / sortedBefore.length
            ),
            pageviews: delta(
              closedPageviews / closed.length,
              sumField(sortedBefore, 'pageviews') / sortedBefore.length
            ),
            days: sortedBefore.length,
            daysNow: closed.length,
          }
        : null,
    weekdays: [...weekdayBuckets.values()].sort((a, b) => a.index - b.index),
    movers: {
      paths: movers(paths, beforePaths),
      referrers: movers(referrers, beforeReferrers).map((m) => ({
        ...m,
        key: restoreHost(m.key),
      })),
      events: movers(events, beforeEvents, Number.MAX_SAFE_INTEGER),
    },
    paths: topEntries(paths, Number.MAX_SAFE_INTEGER),
    entryPaths: topEntries(entryPaths, Number.MAX_SAFE_INTEGER),
    referrerPageviews: [...referrers.values()].reduce((total, count) => total + count, 0),
    referrers: topEntries(referrers).map((entry) => ({
      key: restoreHost(entry.key),
      count: entry.count,
    })),
    events: topEntries(events, Number.MAX_SAFE_INTEGER),
    exits: exitsOf(exitViews, exitContinued),
    exitDays,
    funnel: buildFunnel(events, paths, visitors),
    dayDetails: {
      today: todayDoc ? summarizeDay(todayDoc, docAt, peopleAt(todayDoc.day)) : null,
      latest: latestDoc ? summarizeDay(latestDoc, docAt, peopleAt(latestDoc.day)) : null,
    },
  };
}

/**
 * Umsatz aus dem Katalogpreis, nicht aus Stripe gelesen.
 */
export function packPriceCents(packId: string): number {
  return CATALOG[packId]?.amountCents ?? 0;
}

function packName(packId: string): string {
  return CATALOG[packId]?.displayName ?? packId;
}

/**
 * Admin-Konten müssen schon draußen sein, sonst ist der Betreiber jeden Tag das
 * aktive Konto.
 */
export function summarizeAccounts(
  input: AccountsInput,
  windowStart: string,
  windowEnd: string,
  today: string
): Accounts {
  const { accounts, purchases, reveals, referrals, checkouts } = input;
  const inWindow = (day: string): boolean => day >= windowStart && day <= windowEnd;

  const paid = purchases.filter((p) => p.source === 'stripe');
  const starters = purchases.filter((p) => p.starter);
  const invited = referrals.filter((r) => r.source === 'invited-by');
  const checkoutsInWindow = checkouts.filter((c) => inWindow(c.day));
  const activeSince = (since: string): number =>
    accounts.filter((a) => a.lastActiveDay !== null && a.lastActiveDay >= since).length;

  const byPack = new Map<string, PackSales>();
  for (const purchase of paid) {
    const sales = byPack.get(purchase.packId) ?? {
      packId: purchase.packId,
      name: packName(purchase.packId),
      count: 0,
      revenueCents: 0,
    };
    sales.count += 1;
    sales.revenueCents += packPriceCents(purchase.packId);
    byPack.set(purchase.packId, sales);
  }

  const byDay = new Map<string, AccountsDay>();
  for (const day of eachDay(windowStart, windowEnd)) {
    byDay.set(day, {
      day,
      newAccounts: 0,
      starterPacks: 0,
      reveals: 0,
      referrals: 0,
      purchases: 0,
      revenueCents: 0,
    });
  }
  const bump = (day: string, apply: (row: AccountsDay) => void): void => {
    const row = byDay.get(day);
    if (row) apply(row);
  };
  for (const a of accounts) bump(a.createdDay, (row) => (row.newAccounts += 1));
  for (const s of starters) bump(s.day, (row) => (row.starterPacks += 1));
  for (const r of reveals) bump(r.day, (row) => (row.reveals += 1));
  for (const r of invited) bump(r.day, (row) => (row.referrals += 1));
  for (const p of paid) {
    bump(p.day, (row) => {
      row.purchases += 1;
      row.revenueCents += packPriceCents(p.packId);
    });
  }

  const revenue = (list: PurchaseRecord[]): number =>
    list.reduce((total, p) => total + packPriceCents(p.packId), 0);

  return {
    total: accounts.length,
    newInWindow: accounts.filter((a) => inWindow(a.createdDay)).length,
    activeInWindow: accounts.filter((a) => a.lastActiveDay !== null && inWindow(a.lastActiveDay))
      .length,
    active: {
      day: activeSince(today),
      week: activeSince(sinceDay(7, today)),
      month: activeSince(sinceDay(30, today)),
    },
    google: accounts.filter((a) => a.provider === 'google').length,
    email: accounts.filter((a) => a.provider === 'email').length,
    withFavorites: accounts.filter((a) => a.favorites > 0).length,
    starterPacks: {
      total: starters.length,
      inWindow: starters.filter((s) => inWindow(s.day)).length,
    },
    reveals: { total: reveals.length, inWindow: reveals.filter((r) => inWindow(r.day)).length },
    referrals: { total: invited.length, inWindow: invited.filter((r) => inWindow(r.day)).length },
    purchases: {
      total: paid.length,
      inWindow: paid.filter((p) => inWindow(p.day)).length,
      byPack: [...byPack.values()].sort(
        (a, b) => b.revenueCents - a.revenueCents || a.name.localeCompare(b.name)
      ),
    },
    revenue: {
      totalCents: revenue(paid),
      inWindowCents: revenue(paid.filter((p) => inWindow(p.day))),
    },
    checkouts: {
      inWindow: checkoutsInWindow.length,
      open: checkoutsInWindow.filter((c) => c.status !== 'completed').length,
      completed: checkoutsInWindow.filter((c) => c.status === 'completed').length,
    },
    people: {
      accounts: accounts.length,
      withStarterPack: accounts.filter((a) => a.starterPack).length,
      withReveal: accounts.filter((a) => a.reveals > 0).length,
      withReferral: accounts.filter((a) => a.referrals > 0).length,
      buyers: accounts.filter((a) => a.purchases > 0).length,
    },
    byDay: [...byDay.values()],
  };
}

interface DeckInput {
  restaurants: { _id: string; categories?: { slug: string; name?: string }[] }[];
  mustEats: {
    _id: string;
    restaurant: { _id: string };
    revealedForAnon?: boolean;
    previewCategory?: string;
  }[];
  categories: { slug: string; name: string }[];
}

/**
 * Karten sind mehrfach kategorisiert, die Spalten summieren sich nicht zur
 * Stapelgröße.
 */
export function summarizeDeck(input: DeckInput): Deck {
  const categoryOfSpot = new Map<string, string[]>();
  const spotsPerCategory = new Map<string, number>();
  for (const r of input.restaurants) {
    const slugs = (r.categories ?? []).map((c) => c.slug).filter(Boolean);
    categoryOfSpot.set(r._id, slugs);
    for (const slug of slugs) spotsPerCategory.set(slug, (spotsPerCategory.get(slug) ?? 0) + 1);
  }
  const cardsPerCategory = new Map<string, number>();
  let publicCards = 0;
  for (const m of input.mustEats) {
    if (m.revealedForAnon || m.previewCategory) publicCards += 1;
    for (const slug of categoryOfSpot.get(m.restaurant._id) ?? []) {
      cardsPerCategory.set(slug, (cardsPerCategory.get(slug) ?? 0) + 1);
    }
  }
  const packBySlug = new Map<string, string>();
  for (const pack of Object.values(CATALOG)) if (pack.slug) packBySlug.set(pack.slug, pack.packId);

  const byCategory: DeckCategory[] = input.categories
    .map((c) => {
      const cards = cardsPerCategory.get(c.slug) ?? 0;
      const packId = packBySlug.get(c.slug) ?? null;
      return {
        slug: c.slug,
        name: c.name,
        cards,
        spots: spotsPerCategory.get(c.slug) ?? 0,
        packId,
        sellable: packId !== null && cards > 0,
      };
    })
    .sort((a, b) => b.cards - a.cards || a.name.localeCompare(b.name));

  return {
    cards: input.mustEats.length,
    publicCards,
    spots: input.restaurants.length,
    freeCards: REVEALED_TARGET,
    starterCards: STARTER_PACK_CARDS,
    byCategory,
  };
}
