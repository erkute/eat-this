/**
 * Aggregation für /admin/stats — die Leseseite des einwilligungsfreien
 * Zählers aus app/api/count/route.ts, plus Konten, Karten und Umsatz aus
 * Firebase Auth und Firestore.
 *
 * Bewusst frei von Firestore: die Route holt die Rohdaten, diese Datei
 * rechnet. Damit ist die einzige Stelle, an der aus Rohzahlen Aussagen werden,
 * ohne Emulator testbar — und genau dort sitzen die Fallen (Ausstiege, die es
 * vor dem 28.08.2026 nicht gibt; Referrer-Hosts mit ersetzten Punkten; ein
 * Trichter, der Ereignisse zählt und keine Personen).
 *
 * Das Produkt, das hier gemessen wird (Stand 07.09.2026):
 *
 *     frei      alle Spots auf der Karte, 5 Must-Eat-Karten offen
 *     Konto     +20 Karten (Starter Pack: 10 offen, 10 als Rücken)
 *     vor Ort   ein Rücken geht im 50-m-Radius auf
 *     Pack      alle Karten einer Kategorie, oder All Berlin
 *
 * Der Trichter folgt genau diesen vier Stufen.
 */

import type { SearchResult } from '@/lib/admin/searchConsole';
import { REVEALED_TARGET } from '@/lib/map/revealed-must-eats';
import { STARTER_PACK_CARDS, STARTER_PACK_FACE_UP } from '@/lib/starter-pack';
import { CATALOG } from '@/lib/stripe-catalog';

/** Ein Tagesdokument, so wie der Zähler es schreibt. Alle Zählfelder sind
 *  optional: ein Tag, an dem nur Ereignisse ankamen, trägt keine `pageviews`. */
export interface DailyDoc {
  day: string;
  pageviews?: number;
  visitors?: number;
  paths?: Record<string, number>;
  entryPaths?: Record<string, number>;
  continuations?: Record<string, number>;
  referrers?: Record<string, number>;
  events?: Record<string, number>;
}

export interface DayPoint {
  day: string;
  pageviews: number;
  visitors: number;
}

/** Alle Ereignisse eines Tages — damit das Brett jede Reihe zeichnen kann,
 *  nicht nur die, die beim Bauen wichtig schienen. */
export interface EventDay {
  day: string;
  counts: Record<string, number>;
}

export interface Entry {
  key: string;
  count: number;
}

export interface ExitEntry {
  key: string;
  /** Aufrufe der Seite in den auswertbaren Tagen. */
  views: number;
  /** Aufrufe, nach denen es intern weiterging. */
  continued: number;
  /** views − continued, nie negativ. */
  exits: number;
  /** Anteil der Aufrufe, die hier endeten (0–1). */
  rate: number;
}

/** Ein Wert im Vergleich zur gleich langen Periode davor. */
export interface Delta {
  now: number;
  before: number;
  /** Relative Veraenderung; null, wenn es vorher nichts gab (keine Division). */
  change: number | null;
}

export interface Mover {
  key: string;
  now: number;
  before: number;
  diff: number;
}

export interface Weekday {
  /** 0 = Sonntag, wie Date.getUTCDay(). */
  index: number;
  visitors: number;
  pageviews: number;
  days: number;
}

export interface FunnelStep {
  key: string;
  count: number;
  /** Anteil an den Besuchern des Zeitraums (0–1) — der einzige Nenner, der
   *  auf jeder Stufe stimmt. */
  share: number;
}

/**
 * Eine Stufe des Produkts. `offer` ist das, was die Stufe dem Menschen gibt —
 * damit auf dem Brett steht, WOFÜR die Zahlen darunter stehen.
 */
export interface FunnelStage {
  key: 'free' | 'account' | 'onsite' | 'packs';
  title: string;
  offer: string;
  steps: FunnelStep[];
}

/**
 * Eine Quote zwischen zwei Stufen, die wirklich aufeinander folgen. Bewusst
 * eine kurze, handverlesene Liste: die Reise ist keine strenge Kette, und
 * eine Quote „je Vorstufe" für jeden Schritt hätte Werte wie 4.500 %
 * produziert (siehe `view_item`, das je Pack-Angebot feuert).
 */
export interface FunnelRate {
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
   * Alles Ereignisse, keine Personen: wer die Karte dreimal öffnet, zählt
   * dreimal. Der Zähler kennt bewusst keine Person (visitorHash.ts), ein
   * echter Personen-Trichter ist damit nicht messbar — den liefert
   * `Accounts.people` aus Firestore, für die Konten.
   */
  stages: FunnelStage[];
  rates: FunnelRate[];
}

/** Ein Konto, wie Firebase Auth es kennt — ohne Adresse, ohne uid — plus
 *  das, was Firestore über es weiß. */
export interface AccountRecord {
  /** Kalendertag der Anlage (Berlin). */
  createdDay: string;
  /**
   * Der letzte Tag, an dem das Konto ein ID-Token erneuert hat — `lastRefreshTime`
   * in Firebase Auth. Eine bessere Naeherung fuer „hat die App benutzt" als
   * `lastSignInTime`: die Anmeldung haelt Monate, das Token laeuft stuendlich
   * ab und wird nur erneuert, solange die Seite offen ist.
   */
  lastActiveDay: string | null;
  provider: 'google' | 'email';
  /** Gespeicherte Spots. */
  favorites: number;
  /** Hat sein Starter Pack (entitlements/starter). */
  starterPack: boolean;
  /** Karten vor Ort aufgedeckt (users/<uid>/unlockedMustEats). */
  reveals: number;
  /** Erfolgreiche Einladungen als Einladender (referralBonuses, source `invited`). */
  referrals: number;
  /** Bezahlte Packs. */
  purchases: number;
}

export interface PurchaseRecord {
  day: string;
  /** stripe = bezahlt; signup = Starter Pack; manual = von Hand. */
  source: string;
  /** Die Doc-ID des Entitlements — `category-pizza`, `all-berlin`, `starter`. */
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

/** Personen statt Ereignisse: wie viele Konten haben welche Stufe erreicht. */
export interface PeopleFunnel {
  accounts: number;
  withStarterPack: number;
  withReveal: number;
  withReferral: number;
  buyers: number;
}

export interface AccountsDay {
  day: string;
  newAccounts: number;
  starterPacks: number;
  reveals: number;
  /** Erfolgreiche Einladungen (Eingeladene). */
  referrals: number;
  purchases: number;
  revenueCents: number;
}

export interface PackSales {
  packId: string;
  name: string;
  count: number;
  revenueCents: number;
}

export interface Accounts {
  total: number;
  newInWindow: number;
  /** Konten mit Token-Erneuerung im Zeitraum, siehe AccountRecord.lastActiveDay. */
  activeInWindow: number;
  /**
   * Aktive Nutzer in festen Fenstern, unabhaengig vom gewaehlten Zeitraum —
   * heute, die letzten 7 und die letzten 30 Tage, jeweils einschliesslich
   * heute. „Aktiv" heisst wie oben: die App hat ein Token erneuert. Feste
   * Fenster, damit die Zahl beim Umschalten von 7 auf 90 Tage nicht mitwandert
   * und sich mit dem letzten Blick vergleichen laesst.
   */
  active: { day: number; week: number; month: number };
  google: number;
  email: number;
  withFavorites: number;
  /** Eingelöste Starter Packs (je 20 Karten). */
  starterPacks: { total: number; inWindow: number };
  /** Karten, die vor Ort umgedreht wurden. */
  reveals: { total: number; inWindow: number };
  /** Erfolgreiche Einladungen. */
  referrals: { total: number; inWindow: number };
  /** Bezahlte Kaeufe (Stripe). */
  purchases: { total: number; inWindow: number; byPack: PackSales[] };
  /** Brutto, aus dem Katalogpreis des gekauften Packs. */
  revenue: { totalCents: number; inWindowCents: number };
  /** Angelegte Stripe-Sitzungen im Zeitraum, davon nie abgeschlossen. */
  checkouts: { inWindow: number; open: number; completed: number };
  people: PeopleFunnel;
  /** Ein Eintrag je Kalendertag des Zeitraums, auch ohne Bewegung. */
  byDay: AccountsDay[];
}

export interface DeckCategory {
  slug: string;
  name: string;
  cards: number;
  spots: number;
  packId: string | null;
  /** Ein Pack ohne Karte ist nicht käuflich (`/api/stripe/checkout` → 409). */
  sellable: boolean;
}

/** Der Stapel, wie er heute im Katalog liegt — die Ware, um die es geht. */
export interface Deck {
  cards: number;
  /** Ohne Konto offen (revealedForAnon). */
  publicCards: number;
  spots: number;
  /** Die Sollzahl des Schaufensters. */
  freeCards: number;
  starterCards: number;
  starterFaceUp: number;
  byCategory: DeckCategory[];
}

/**
 * Ein einzelner Tag, ausgebreitet — für „heute" und „gestern". Dieselben
 * Ranglisten wie fürs ganze Fenster, nur über ein Dokument, plus die zwei
 * Vergleiche, die einen Tag einordnen.
 */
export interface DaySummary {
  day: string;
  pageviews: number;
  visitors: number;
  /** Gegen den Tag davor. */
  vsPrevDay: { visitors: Delta; pageviews: Delta } | null;
  /** Gegen denselben Wochentag der Vorwoche — der ehrlichere Vergleich,
   *  weil der Verkehr einem Wochenrhythmus folgt. */
  vsSameWeekday: { visitors: Delta; pageviews: Delta } | null;
  paths: Entry[];
  entryPaths: Entry[];
  referrers: Entry[];
  events: Entry[];
  exits: ExitEntry[];
  /** Ob der Tag `continuations` trägt — sonst sind `exits` leer, nicht null. */
  hasExits: boolean;
  funnel: Funnel;
  /** Konten, Aufdeckungen, Käufe dieses Tages aus Firestore. */
  people: AccountsDay | null;
}

/**
 * Der erste Tag, an dem `entryPaths`, `continuations` und der Cookie-Dialog
 * den GANZEN Tag gezaehlt wurden. Der Rollout kam am Abend des 28.08.2026: der
 * Tag traegt 19 Fortsetzungen auf 874 Aufrufe und 127 Einblendungen bei 111
 * Besuchern. Halb gezaehlt macht er jeden Aufruf des Vormittags zum Ausstieg
 * und jeden Besucher zum Nicht-Antworter — darum faellt er raus, obwohl er die
 * Felder traegt.
 */
export const FULL_DAY_FIELDS_SINCE = '2026-08-29';

export interface StatsSummary {
  /** Das gewählte Fenster. `includesToday` sagt, ob der laufende Tag drinliegt. */
  range: { start: string; end: string; days: number; today: string; includesToday: boolean };
  /** Chronologisch aufsteigend — so wird der Verlauf gezeichnet. */
  days: DayPoint[];
  /** Die Vorperiode, für die gestrichelte Linie dahinter. */
  previousDays: DayPoint[];
  eventsByDay: EventDay[];
  /**
   * Die Google-Suche, aus der Search Console — oder der Grund, warum sie
   * fehlt (lib/admin/searchConsole.ts). null, wenn die Route sie nicht
   * angefragt hat.
   */
  search: SearchResult | null;
  /** `closedDays` laesst den laufenden Tag weg — fuer alles, was „je Tag" rechnet. */
  totals: { pageviews: number; visitors: number; days: number; closedDays: number };
  /** Aus Firebase Auth und Firestore, nicht aus dem Zaehler; ohne Admin-Konten. */
  accounts: Accounts | null;
  /** Der Katalog — null, wenn Sanity nicht antwortete. */
  deck: Deck | null;
  /**
   * Der jüngste abgeschlossene Tag — beim Morgenkaffee die Zahl, die zählt.
   * `today` steht getrennt daneben, weil ein laufender Tag naturgemäß niedrig
   * aussieht und sonst wie ein Einbruch gelesen wird.
   */
  latest: {
    day: DayPoint | null;
    vsPrevDay: { visitors: Delta; pageviews: Delta } | null;
    vsSameWeekday: { visitors: Delta; pageviews: Delta } | null;
  };
  /** Der laufende Tag, falls er im Fenster liegt. Unvollständig. */
  today: DayPoint | null;
  /**
   * Der gewählte Zeitraum gegen die Periode davor — **je Tag**, nicht in
   * Summen.
   *
   * Der Grund ist keine Feinheit: das Fenster ist kalendarisch gleich lang,
   * die Zahl der Tage MIT Daten ist es nicht. Der Zähler läuft erst seit dem
   * 21.08.2026, also standen bei „7 Tage" sieben gemessene Tage gegen vier —
   * und alles stieg um rund zwei Drittel, ohne dass irgendetwas gestiegen
   * wäre. Auf Tagesdurchschnitt gerechnet stimmt der Vergleich in jedem Fall,
   * auch wenn ein Tag in der Mitte fehlt.
   */
  period: {
    visitors: Delta;
    pageviews: Delta;
    /** Tage mit Daten in der Vorperiode. */
    days: number;
    /** Tage mit Daten im gewählten Zeitraum — zum Einordnen des Vergleichs. */
    daysNow: number;
  } | null;
  /** Durchschnitt je Wochentag — zeigt, wann Menschen wirklich kommen. */
  weekdays: Weekday[];
  /** Was gegenüber der Vorperiode am stärksten gewonnen und verloren hat. */
  movers: { paths: Mover[]; referrers: Mover[]; events: Mover[] };
  paths: Entry[];
  entryPaths: Entry[];
  referrers: Entry[];
  events: Entry[];
  exits: ExitEntry[];
  /**
   * Wie viele der `totals.days` Tage überhaupt `continuations` tragen. Die
   * Ausstiegsrechnung läuft NUR über diese; vor dem 28.08.2026 hat der Zähler
   * das Feld nicht geschrieben, und ohne diesen Zuschnitt sähe jeder Aufruf
   * von damals wie ein Ausstieg aus.
   */
  exitDays: number;
  funnel: Funnel;
  /** Heute (falls im Fenster) und der jüngste abgeschlossene Tag, ausgebreitet. */
  dayDetails: { today: DaySummary | null; latest: DaySummary | null };
  /**
   * Der Cookie-Dialog. Zwei Nenner, weil zwei verschiedene Fragen dahinter
   * stehen — und weil der naheliegende der falsche ist.
   *
   * `shown` zaehlt ERSCHEINUNGEN, nicht gefragte Menschen: der Dialog
   * blockiert (kein Escape, kein Aussenklick, siehe CookieConsent.tsx) und
   * erscheint bei jedem Seitenaufruf erneut, solange niemand geantwortet hat
   * — gemessen 3,3 Mal je Besucher. Eine Quote gegen `shown` beantwortet
   * darum „wie oft wird auf eine Einblendung geklickt", nicht „wie viele
   * Menschen stimmen zu", und faellt um rund zwei Drittel zu niedrig aus.
   *
   * `visitors` sind die Besucher **der Tage, die den Dialog ueberhaupt
   * zaehlen** — `consent_gate_shown` gibt es erst seit dem 28.08.2026.
   * Dieselbe Falle wie bei den Ausstiegen: ueber alle Tage gerechnet stuenden
   * Zaehler und Nenner auf verschiedenen Zeitraeumen.
   */
  consent: {
    shown: number;
    accepted: number;
    declined: number;
    visitors: number;
    days: number;
    /** Zustimmungen je Besucher — die Antwort auf „wie viele Menschen". */
    rate: number | null;
    /** Zustimmungen je Einblendung — deutlich niedriger, siehe oben. */
    ratePerView: number | null;
    /** Einblendungen je Besucher. Ueber 1 heisst: mehrfach gefragt. */
    viewsPerVisitor: number | null;
  };
}

/* ── Kalender ─────────────────────────────────────────────────────────── */

export interface Range {
  start: string;
  end: string;
  days: number;
}

const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function parseDays(raw: string | null): number {
  if (!raw) return DEFAULT_DAYS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_DAYS;
  return Math.min(parsed, MAX_DAYS);
}

/**
 * Der Zeitraum aus der Anfrage: `?days=30` (endet heute) oder
 * `?from=…&to=…`. `from`/`to` schlagen `days`; ein Fenster, das in der
 * Zukunft endet, wird auf heute gekappt, eins, das länger als ein Jahr ist,
 * am Anfang. Liegt hier und nicht in der Route, weil Next aus einer
 * Route-Datei nur die Handler exportiert sehen will.
 */
export function parseRange(params: URLSearchParams, today: string): Range {
  const from = params.get('from');
  const to = params.get('to');
  if (from && to && DAY_KEY.test(from) && DAY_KEY.test(to) && from <= to) {
    const end = to > today ? today : to;
    const spanned = daysBetween(from, end);
    const days = Math.min(Math.max(spanned, 1), MAX_DAYS);
    return { start: sinceDay(days, end), end, days };
  }
  const days = parseDays(params.get('days'));
  return { start: sinceDay(days, today), end: today, days };
}

/**
 * Der erste Tag eines Fensters von `days` Tagen, das mit `end` endet — als
 * YYYY-MM-DD, also im Format der Dokument-IDs.
 *
 * Der Zeitraum wird über das Datum geschnitten, nicht über die Anzahl
 * vorhandener Dokumente: an einem Tag ohne einen einzigen Aufruf legt der
 * Zähler kein Dokument an, und ein blosses `limit(30)` griffe dann weiter
 * zurück als 30 Tage, ohne dass es jemand sähe.
 */
export function sinceDay(days: number, end: string): string {
  return dayBefore(end, days - 1);
}

/** Der Tag davor, als YYYY-MM-DD. UTC-Mittag als Anker: die Rechnung soll nie
 *  über eine Zeitumstellung stolpern, das Ergebnis ist ohnehin nur ein
 *  Kalendertag. */
export function dayBefore(day: string, back = 1): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date, 12) - back * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** Kalendertage von `start` bis `end`, beide einschließlich. */
export function daysBetween(start: string, end: string): number {
  const at = (day: string) => {
    const [year, month, date] = day.split('-').map(Number);
    return Date.UTC(year, month - 1, date, 12);
  };
  return Math.round((at(end) - at(start)) / 86_400_000) + 1;
}

/** Alle Kalendertage eines Fensters, aufsteigend. */
export function eachDay(start: string, end: string): string[] {
  const count = daysBetween(start, end);
  if (count < 1) return [];
  return Array.from({ length: count }, (_, i) => dayBefore(end, count - 1 - i));
}

/** Wochentag eines YYYY-MM-DD, 0 = Sonntag. UTC-Mittag als Anker, damit keine
 *  Zeitzone den Tag kippt. */
export function weekdayOf(day: string): number {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date, 12)).getUTCDay();
}

/* ── Rechenhilfen ─────────────────────────────────────────────────────── */

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

/** Firestore-Map-Schlüssel dürfen keine Punkte enthalten, der Zähler ersetzt
 *  sie beim Schreiben. Für die Anzeige zurückdrehen — `www_google_com` ist
 *  kein Hostname, den jemand lesen will. */
function restoreHost(key: string): string {
  return key.replace(/_/g, '.');
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Relative Veraenderung gegen die Vorperiode. `change` bleibt null, wenn es
 *  vorher nichts gab — 0 auf 5 ist kein "+500 %", sondern ein Neuanfang. */
export function delta(now: number, before: number): Delta {
  return { now, before, change: before > 0 ? (now - before) / before : null };
}

function sumField(docs: DailyDoc[], field: 'pageviews' | 'visitors'): number {
  return docs.reduce((total, doc) => total + num(doc[field]), 0);
}

function pointOf(doc: DailyDoc): DayPoint {
  return { day: doc.day, pageviews: num(doc.pageviews), visitors: num(doc.visitors) };
}

/** Die groessten Zugewinne und Verluste gegenueber der Vorperiode. Beides
 *  zusammen, weil ein Wegbruch genauso interessant ist wie ein Anstieg. */
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
        // Ein Reload behält den ursprünglichen Referrer und zählt nicht als
        // Fortsetzung — Ausstiege sind darum eher über- als unterschätzt. Die
        // Klemme auf 0 fängt zusätzlich den Fall, dass eine Fortsetzung am
        // Folgetag verbucht wurde, ihr Aufruf aber vor dem Fenster liegt.
        const raw = count - went;
        return {
          key,
          views: count,
          continued: went,
          exits: Math.max(0, raw),
          rate: count > 0 ? Math.max(0, raw) / count : 0,
        };
      })
      // Seiten mit einer Handvoll Aufrufen erzeugen Quoten wie 100 %, die nichts
      // bedeuten. Die Sortierung geht darum über absolute Ausstiege.
      .sort((a, b) => b.exits - a.exits || a.key.localeCompare(b.key))
      .slice(0, TOP_N)
  );
}

/* ── Der Trichter ─────────────────────────────────────────────────────── */

/** /packs und /en/packs — die Übersicht aller Packs. */
const PACKS_PAGE = /^(?:\/en)?\/packs$/;
/** /pack/<slug> — die Seite eines Packs mit dem Kaufknopf. */
const PACK_PAGE = /^(?:\/en)?\/pack\/[^/]+$/;

function pathsMatching(paths: Map<string, number>, pattern: RegExp): number {
  let total = 0;
  for (const [key, count] of paths) if (pattern.test(key)) total += count;
  return total;
}

/**
 * Die vier Stufen des Produkts, als Ereignisse je Besucher.
 *
 * Zwei Schritte kommen aus den Seitenaufrufen statt aus Ereignissen:
 * `packs_page` und `pack_page`. Die Pack-Seiten feuern selbst nichts, bevor
 * `view_item` den Kaufknopf sieht — und der Weg dorthin gehört in den
 * Trichter.
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
      offer: `Alle Spots, ${REVEALED_TARGET} Karten offen`,
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
      offer: `+${STARTER_PACK_CARDS} Karten, ${STARTER_PACK_FACE_UP} davon offen`,
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
      offer: 'Ein Rücken geht im 50-m-Radius auf',
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
      title: 'Packs',
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
      rate(
        'signed_starter',
        'sign_up',
        count('sign_up'),
        'starter_pack_granted',
        count('starter_pack_granted')
      ),
      rate('pack_checkout', 'pack_page', packPage, 'begin_checkout', count('begin_checkout')),
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

/* ── Ein Tag ──────────────────────────────────────────────────────────── */

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
    paths: topEntries(paths, 10),
    entryPaths: topEntries(entryPaths, 10),
    referrers: topEntries(referrers, 10).map((e) => ({ ...e, key: restoreHost(e.key) })),
    events: topEntries(events, Number.MAX_SAFE_INTEGER),
    exits: hasExits ? exitsOf(paths, continued).slice(0, 10) : [],
    hasExits,
    funnel: buildFunnel(events, paths, point.visitors),
    people,
  };
}

/* ── Das Fenster ──────────────────────────────────────────────────────── */

export interface SummarizeOptions {
  /** Heutiger Kalendertag in Berlin. Trennt den laufenden Tag vom juengsten
   *  abgeschlossenen, damit ein halber Tag nicht wie ein Einbruch aussieht. */
  today?: string;
  /** Das gewählte Fenster. Fehlt es, spannt es sich über die Dokumente. */
  range?: { start: string; end: string };
  accounts?: Accounts | null;
  search?: SearchResult | null;
  deck?: Deck | null;
}

/**
 * @param docs   Die Tage des gewaehlten Zeitraums.
 * @param before Die gleich lange Periode davor — fuer die Vergleiche. Leer
 *               lassen, wenn es sie nicht gibt; dann entfaellt `period`.
 */
export function summarize(
  docs: DailyDoc[],
  before: DailyDoc[] = [],
  options: SummarizeOptions = {}
): StatsSummary {
  const { today = '', accounts = null, search = null, deck = null } = options;
  const sorted = [...docs].sort((a, b) => a.day.localeCompare(b.day));
  const sortedBefore = [...before].sort((a, b) => a.day.localeCompare(b.day));
  const start = options.range?.start ?? sorted[0]?.day ?? today;
  const end = options.range?.end ?? sorted.at(-1)?.day ?? today;

  const paths = new Map<string, number>();
  const entryPaths = new Map<string, number>();
  const referrers = new Map<string, number>();
  const events = new Map<string, number>();

  // Getrennte Töpfe für die Ausstiegsrechnung: nur Tage, die BEIDE Seiten der
  // Subtraktion tragen, dürfen hinein.
  const exitViews = new Map<string, number>();
  const exitContinued = new Map<string, number>();
  let exitDays = 0;

  const days: DayPoint[] = [];
  const eventsByDay: EventDay[] = [];
  let pageviews = 0;
  let visitors = 0;
  // Getrennt gezaehlt, damit die Zustimmungsquote denselben Zeitraum trifft
  // wie ihr Zaehler — `consent_gate_shown` gibt es erst seit dem 28.08.2026.
  let consentVisitors = 0;
  let consentDays = 0;
  let consentShown = 0;
  let consentAccepted = 0;
  let consentDeclined = 0;

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
    addInto(referrers, doc.referrers);
    addInto(events, doc.events);

    const fullDay = doc.day >= FULL_DAY_FIELDS_SINCE;

    if (fullDay && doc.continuations) {
      exitDays += 1;
      addInto(exitViews, doc.paths);
      addInto(exitContinued, doc.continuations);
    }

    if (fullDay && num(doc.events?.consent_gate_shown) > 0) {
      consentDays += 1;
      consentVisitors += point.visitors;
      consentShown += num(doc.events?.consent_gate_shown);
      consentAccepted += num(doc.events?.consent_accepted);
      consentDeclined += num(doc.events?.consent_declined);
    }
  }

  // Dieselben Toepfe fuer die Vorperiode — nur, was fuer Vergleiche gebraucht
  // wird, nicht die ganze Auswertung doppelt.
  const beforePaths = new Map<string, number>();
  const beforeReferrers = new Map<string, number>();
  const beforeEvents = new Map<string, number>();
  for (const doc of sortedBefore) {
    addInto(beforePaths, doc.paths);
    addInto(beforeReferrers, doc.referrers);
    addInto(beforeEvents, doc.events);
  }

  // Der laufende Tag zaehlt fuer Verlauf und Summen mit, aber nie als
  // Vergleichsgroesse: er ist per Definition unvollstaendig.
  const todayDoc = today ? sorted.find((d) => d.day === today) : undefined;
  const todayPoint = todayDoc ? pointOf(todayDoc) : null;
  const closed = days.filter((d) => d.day !== today);
  const latestDay = closed.at(-1) ?? null;
  // Auch in der Vorperiode suchen: bei „7 Tage" liegt derselbe Wochentag der
  // Vorwoche immer ausserhalb des Fensters, und der Vergleich fiel still weg.
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
    search,
    totals: { pageviews, visitors, days: sorted.length, closedDays: closed.length },
    accounts,
    deck,
    latest: {
      day: latestDay,
      vsPrevDay: compare(latestDay, latestDay ? docAt(dayBefore(latestDay.day)) : undefined),
      vsSameWeekday: compare(latestDay, latestDay ? docAt(dayBefore(latestDay.day, 7)) : undefined),
    },
    today: todayPoint,
    period:
      sortedBefore.length && closed.length
        ? {
            // Je Tag, nicht in Summen — siehe die Begruendung am Typ. Und nur
            // abgeschlossene Tage: der laufende zog den Schnitt morgens um
            // ein Zehntel nach unten, als waere er ein ganzer Tag gewesen.
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
      events: movers(events, beforeEvents),
    },
    paths: topEntries(paths),
    entryPaths: topEntries(entryPaths),
    referrers: topEntries(referrers).map((entry) => ({
      key: restoreHost(entry.key),
      count: entry.count,
    })),
    // Ereignisse werden vollständig gezeigt, nicht nur die Spitze: die Liste
    // ist durch die Allowlist in count/route.ts ohnehin begrenzt, und die
    // interessanten Fälle stehen unten (purchase, sign_up).
    events: topEntries(events, Number.MAX_SAFE_INTEGER),
    exits: exitsOf(exitViews, exitContinued),
    exitDays,
    funnel: buildFunnel(events, paths, visitors),
    dayDetails: {
      today: todayDoc ? summarizeDay(todayDoc, docAt, peopleAt(todayDoc.day)) : null,
      latest: latestDoc ? summarizeDay(latestDoc, docAt, peopleAt(latestDoc.day)) : null,
    },
    consent: {
      shown: consentShown,
      accepted: consentAccepted,
      declined: consentDeclined,
      visitors: consentVisitors,
      days: consentDays,
      rate: consentVisitors > 0 ? consentAccepted / consentVisitors : null,
      ratePerView: consentShown > 0 ? consentAccepted / consentShown : null,
      viewsPerVisitor: consentVisitors > 0 ? consentShown / consentVisitors : null,
    },
  };
}

/* ── Konten, Karten, Umsatz ───────────────────────────────────────────── */

/** Der Katalogpreis eines Packs — der Umsatz wird daraus gerechnet, nicht aus
 *  Stripe gelesen; die vier Käufe seit Mai stehen alle im Katalog. */
export function packPriceCents(packId: string): number {
  return CATALOG[packId]?.amountCents ?? 0;
}

function packName(packId: string): string {
  return CATALOG[packId]?.displayName ?? packId;
}

/**
 * Konten, Karten, Kaeufe und Checkout-Versuche im Zeitraum. Die Rohdaten holt
 * die Route (Firebase Auth, Firestore); hier wird nur gezaehlt, damit die
 * Regeln — was „aktiv" heisst, was ein Kauf ist — ohne Emulator testbar
 * bleiben.
 *
 * Admin-Konten muessen schon draussen sein: der Betreiber ist sonst jeden Tag
 * das „aktive" Konto.
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
  const starters = purchases.filter((p) => p.packId === 'starter');
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
      open: checkoutsInWindow.filter((c) => c.status === 'open').length,
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

export interface DeckInput {
  restaurants: { _id: string; categories?: { slug: string; name?: string }[] }[];
  mustEats: { _id: string; restaurant: { _id: string }; revealedForAnon?: boolean }[];
  categories: { slug: string; name: string }[];
}

/**
 * Der Stapel nach Kategorien — die Stellschraube für die Packs: ein Pack
 * verkauft die Karten seiner Kategorie, und eine Kategorie ohne Karte ist
 * nicht käuflich. Karten sind mehrfachkategorisiert (ein Lunch-Spot, der
 * auch Breakfast trägt, liegt in beiden Packs), die Spalten summieren sich
 * darum nicht zur Stapelgröße.
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
    if (m.revealedForAnon) publicCards += 1;
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
    starterFaceUp: STARTER_PACK_FACE_UP,
    byCategory,
  };
}
