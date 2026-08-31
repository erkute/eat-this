/**
 * Aggregation für /admin/stats — die Leseseite des einwilligungsfreien
 * Zählers aus app/api/count/route.ts.
 *
 * Bewusst frei von Firestore: die Route holt die Tagesdokumente, diese Datei
 * rechnet. Damit ist die einzige Stelle, an der aus Rohzahlen Aussagen werden,
 * ohne Emulator testbar — und genau dort sitzen die Fallen (Ausstiege, die es
 * vor dem 28.08.2026 nicht gibt; Referrer-Hosts mit ersetzten Punkten).
 */

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

export interface Funnel {
  label: string;
  steps: { key: string; count: number }[];
}

export interface StatsSummary {
  /** Chronologisch aufsteigend — so wird der Verlauf gezeichnet. */
  days: DayPoint[];
  totals: { pageviews: number; visitors: number; days: number };
  /**
   * Der jüngste abgeschlossene Tag — beim Morgenkaffee die Zahl, die zählt.
   * `today` steht getrennt daneben, weil ein laufender Tag naturgemäß niedrig
   * aussieht und sonst wie ein Einbruch gelesen wird.
   */
  latest: {
    day: DayPoint | null;
    /** Gegen den Tag davor. */
    vsPrevDay: { visitors: Delta; pageviews: Delta } | null;
    /** Gegen denselben Wochentag der Vorwoche — der ehrlichere Vergleich,
     *  weil der Verkehr einem Wochenrhythmus folgt. */
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
  movers: { paths: Mover[]; referrers: Mover[] };
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
  funnels: Funnel[];
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
    /** Besucher der Tage mit gezaehltem Dialog. */
    visitors: number;
    /** Tage, die den Dialog zaehlen. */
    days: number;
    /** Zustimmungen je Besucher — die Antwort auf „wie viele Menschen". */
    rate: number | null;
    /** Zustimmungen je Einblendung — deutlich niedriger, siehe oben. */
    ratePerView: number | null;
    /** Einblendungen je Besucher. Ueber 1 heisst: mehrfach gefragt. */
    viewsPerVisitor: number | null;
  };
}

/**
 * Der erste Tag eines Fensters von `days` Tagen, das mit `today` endet — als
 * YYYY-MM-DD, also im Format der Dokument-IDs.
 *
 * Der Zeitraum wird über das Datum geschnitten, nicht über die Anzahl
 * vorhandener Dokumente: an einem Tag ohne einen einzigen Aufruf legt der
 * Zähler kein Dokument an, und ein blosses `limit(30)` griffe dann weiter
 * zurück als 30 Tage, ohne dass es jemand sähe.
 */
export function sinceDay(days: number, today: string): string {
  const [year, month, date] = today.split('-').map(Number);
  // UTC-Mittag als Anker: die Rechnung soll nie über eine Zeitumstellung
  // stolpern, das Ergebnis ist ohnehin nur ein Kalendertag.
  const anchor = Date.UTC(year, month - 1, date, 12);
  const start = new Date(anchor - (days - 1) * 86_400_000);
  return start.toISOString().slice(0, 10);
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
function delta(now: number, before: number): Delta {
  return { now, before, change: before > 0 ? (now - before) / before : null };
}

function sumField(docs: DailyDoc[], field: 'pageviews' | 'visitors'): number {
  return docs.reduce((total, doc) => total + num(doc[field]), 0);
}

/** Wochentag eines YYYY-MM-DD, 0 = Sonntag. UTC-Mittag als Anker, damit keine
 *  Zeitzone den Tag kippt. */
export function weekdayOf(day: string): number {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date, 12)).getUTCDay();
}

/** Der Tag davor, als YYYY-MM-DD. */
function dayBefore(day: string, back = 1): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date, 12) - back * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** Die groessten Zugewinne und Verluste gegenueber der Vorperiode. Beides
 *  zusammen, weil ein Wegbruch genauso interessant ist wie ein Anstieg. */
function movers(now: Map<string, number>, before: Map<string, number>, limit = 6): Mover[] {
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

/**
 * @param docs   Die Tage des gewaehlten Zeitraums.
 * @param before Die gleich lange Periode davor — fuer die Vergleiche. Leer
 *               lassen, wenn es sie nicht gibt; dann entfaellt `period`.
 * @param today  Heutiger Kalendertag in Berlin. Trennt den laufenden Tag vom
 *               juengsten abgeschlossenen, damit ein halber Tag nicht wie ein
 *               Einbruch aussieht.
 */
export function summarize(
  docs: DailyDoc[],
  before: DailyDoc[] = [],
  today = ''
): StatsSummary {
  const sorted = [...docs].sort((a, b) => a.day.localeCompare(b.day));

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
  let pageviews = 0;
  let visitors = 0;
  // Getrennt gezaehlt, damit die Zustimmungsquote denselben Zeitraum trifft
  // wie ihr Zaehler — `consent_gate_shown` gibt es erst seit dem 28.08.2026.
  let consentVisitors = 0;
  let consentDays = 0;

  for (const doc of sorted) {
    const pv = num(doc.pageviews);
    const vis = num(doc.visitors);
    pageviews += pv;
    visitors += vis;
    days.push({ day: doc.day, pageviews: pv, visitors: vis });

    addInto(paths, doc.paths);
    addInto(entryPaths, doc.entryPaths);
    addInto(referrers, doc.referrers);
    addInto(events, doc.events);

    if (doc.continuations) {
      exitDays += 1;
      addInto(exitViews, doc.paths);
      addInto(exitContinued, doc.continuations);
    }

    if (num(doc.events?.consent_gate_shown) > 0) {
      consentDays += 1;
      consentVisitors += vis;
    }
  }

  // Dieselben Toepfe fuer die Vorperiode — nur, was fuer Vergleiche gebraucht
  // wird, nicht die ganze Auswertung doppelt.
  const beforePaths = new Map<string, number>();
  const beforeReferrers = new Map<string, number>();
  for (const doc of before) {
    addInto(beforePaths, doc.paths);
    addInto(beforeReferrers, doc.referrers);
  }

  // Der laufende Tag zaehlt fuer Verlauf und Summen mit, aber nie als
  // Vergleichsgroesse: er ist per Definition unvollstaendig.
  const todayPoint = today ? (days.find((d) => d.day === today) ?? null) : null;
  const closed = days.filter((d) => d.day !== today);
  const latestDay = closed.at(-1) ?? null;
  const pointAt = (day: string): DayPoint | undefined => days.find((d) => d.day === day);
  const prevDay = latestDay ? pointAt(dayBefore(latestDay.day)) : undefined;
  const sameWeekday = latestDay ? pointAt(dayBefore(latestDay.day, 7)) : undefined;

  const weekdayBuckets = new Map<number, Weekday>();
  for (const point of closed) {
    const index = weekdayOf(point.day);
    const bucket = weekdayBuckets.get(index) ?? {
      index,
      visitors: 0,
      pageviews: 0,
      days: 0,
    };
    bucket.visitors += point.visitors;
    bucket.pageviews += point.pageviews;
    bucket.days += 1;
    weekdayBuckets.set(index, bucket);
  }

  const exits: ExitEntry[] = [...exitViews.entries()]
    .map(([key, views]) => {
      const continued = exitContinued.get(key) ?? 0;
      // Ein Reload behält den ursprünglichen Referrer und zählt nicht als
      // Fortsetzung — Ausstiege sind darum eher über- als unterschätzt. Die
      // Klemme auf 0 fängt zusätzlich den Fall, dass eine Fortsetzung am
      // Folgetag verbucht wurde, ihr Aufruf aber vor dem Fenster liegt.
      const raw = views - continued;
      return {
        key,
        views,
        continued,
        exits: Math.max(0, raw),
        rate: views > 0 ? Math.max(0, raw) / views : 0,
      };
    })
    // Seiten mit einer Handvoll Aufrufen erzeugen Quoten wie 100 %, die nichts
    // bedeuten. Die Sortierung geht darum über absolute Ausstiege.
    .sort((a, b) => b.exits - a.exits || a.key.localeCompare(b.key))
    .slice(0, TOP_N);

  const eventCount = (key: string): number => events.get(key) ?? 0;
  const shown = eventCount('consent_gate_shown');
  const accepted = eventCount('consent_accepted');
  const declined = eventCount('consent_declined');

  return {
    days,
    totals: { pageviews, visitors, days: sorted.length },
    latest: {
      day: latestDay,
      vsPrevDay:
        latestDay && prevDay
          ? {
              visitors: delta(latestDay.visitors, prevDay.visitors),
              pageviews: delta(latestDay.pageviews, prevDay.pageviews),
            }
          : null,
      vsSameWeekday:
        latestDay && sameWeekday
          ? {
              visitors: delta(latestDay.visitors, sameWeekday.visitors),
              pageviews: delta(latestDay.pageviews, sameWeekday.pageviews),
            }
          : null,
    },
    today: todayPoint,
    period:
      before.length && sorted.length
        ? {
            // Je Tag, nicht in Summen — siehe die Begruendung am Typ.
            visitors: delta(
              visitors / sorted.length,
              sumField(before, 'visitors') / before.length
            ),
            pageviews: delta(
              pageviews / sorted.length,
              sumField(before, 'pageviews') / before.length
            ),
            days: before.length,
            daysNow: sorted.length,
          }
        : null,
    weekdays: [...weekdayBuckets.values()].sort((a, b) => a.index - b.index),
    movers: {
      paths: movers(paths, beforePaths),
      referrers: movers(referrers, beforeReferrers).map((m) => ({
        ...m,
        key: restoreHost(m.key),
      })),
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
    exits,
    exitDays,
    funnels: [
      {
        label: 'Entdecken',
        steps: [
          { key: 'map_opened', count: eventCount('map_opened') },
          { key: 'restaurant_opened', count: eventCount('restaurant_opened') },
          { key: 'must_eat_opened', count: eventCount('must_eat_opened') },
        ],
      },
      {
        label: 'Kauf',
        steps: [
          { key: 'locked_spot_opened', count: eventCount('locked_spot_opened') },
          { key: 'locked_spot_pack_clicked', count: eventCount('locked_spot_pack_clicked') },
          { key: 'begin_checkout', count: eventCount('begin_checkout') },
          { key: 'purchase', count: eventCount('purchase') },
        ],
      },
      {
        label: 'Anmeldung',
        steps: [
          { key: 'login_view', count: eventCount('login_view') },
          { key: 'login_start', count: eventCount('login_start') },
          { key: 'login_link_sent', count: eventCount('login_link_sent') },
          { key: 'sign_up', count: eventCount('sign_up') },
        ],
      },
    ],
    consent: {
      shown,
      accepted,
      declined,
      visitors: consentVisitors,
      days: consentDays,
      rate: consentVisitors > 0 ? accepted / consentVisitors : null,
      ratePerView: shown > 0 ? accepted / shown : null,
      viewsPerVisitor: consentVisitors > 0 ? shown / consentVisitors : null,
    },
  };
}
