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

export interface Funnel {
  label: string;
  steps: { key: string; count: number }[];
}

export interface StatsSummary {
  /** Chronologisch aufsteigend — so wird der Verlauf gezeichnet. */
  days: DayPoint[];
  totals: { pageviews: number; visitors: number; days: number };
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
  /** Zustimmungsquote am Cookie-Dialog. `rate` ist null, wenn der Dialog in
   *  keinem Tag gezählt wurde — dann gibt es keinen Nenner. */
  consent: { shown: number; accepted: number; declined: number; rate: number | null };
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

export function summarize(docs: DailyDoc[]): StatsSummary {
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

  return {
    days,
    totals: { pageviews, visitors, days: sorted.length },
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
      accepted: eventCount('consent_accepted'),
      declined: eventCount('consent_declined'),
      rate: shown > 0 ? eventCount('consent_accepted') / shown : null,
    },
  };
}
