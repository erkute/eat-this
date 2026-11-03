'use client';

import { BRAND_WORDMARK } from '@/lib/constants';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth';
import { auth } from '@/lib/firebase/config';
import type { StatsSummary } from '@/lib/admin/stats.server';
import { hasNoCountCookie, NO_COUNT_COOKIE } from '@/lib/analytics/noCount';
import { dayBefore, sinceDay } from '@/lib/admin/stats.server';
import { NUMBER, longDay, shortDay } from './stats/format';
import Overview from './stats/reports/Overview';
import Search from './stats/reports/Search';
import Acquisition from './stats/reports/Acquisition';
import Insights from './stats/reports/Insights';
import { Visitors, AccountsReport, MeasurementReport } from './stats/reports/ReportGroups';
import styles from './StatsDashboard.module.css';
import { ThemeSwitch } from '../ThemeSwitch';

/** Besucher, Herkunft und Nutzung mit getrennten Quellen und Messgrenzen.
 * Detailberichte für Keywords und Heatmaps werden erst bei Bedarf geladen. */

export type ReportKey =
  | 'overview'
  | 'days'
  | 'cards'
  | 'search'
  | 'acquisition'
  | 'home'
  | 'measurement';

interface Report {
  key: ReportKey;
  label: string;
  /** Beginnt eine neue Gruppe in der Leiste. */
  group?: string;
  sub: string;
}

const REPORTS: Report[] = [
  {
    key: 'overview',
    label: 'Übersicht',
    sub: 'Besucher, Entwicklung und die wichtigsten Prüfhinweise',
  },
  {
    key: 'days',
    label: 'Besucher & Seiten',
    sub: 'Alle Einstiege und Aufrufe; einzelne Tage im Detail',
  },
  {
    key: 'search',
    label: 'Google-Suche',
    sub: 'Suchbegriffe nach Tagen und Wochen, Klicks und Zielseiten',
  },
  {
    key: 'acquisition',
    label: 'Kanäle',
    sub: 'Woher Tagesbesucher kommen und welche Herkunft noch fehlt',
  },
  {
    key: 'home',
    label: 'Nutzung & Heatmaps',
    sub: 'Artikel, Magazin, Map und Startseite: Was wird gesehen und genutzt?',
  },
  {
    key: 'cards',
    label: 'Konten & Käufe',
    sub: 'Bestätigte Konten, Starter Packs, Aufdeckungen und Käufe',
  },
  {
    key: 'measurement',
    label: 'Messung',
    sub: 'Zahlenabgleich, Messgrenzen und technische Details',
  },
];

const PRESETS = [0, 1, 7, 28, 90, 365] as const;

type RangeChoice =
  | { kind: 'today' }
  | { kind: 'preset'; days: number }
  | { kind: 'custom'; from: string; to: string };

function queryOf(range: RangeChoice): string {
  if (range.kind === 'today') return 'today=1';
  return range.kind === 'preset'
    ? `days=${range.days}`
    : `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
}

/** Wie oft „Gerade aktiv" nachgefragt wird. */
const LIVE_REFRESH_MS = 60_000;

function readHash(): ReportKey {
  if (typeof window === 'undefined') return 'overview';
  const key = window.location.hash.replace('#', '');
  return REPORTS.some((r) => r.key === key) ? (key as ReportKey) : 'overview';
}

export default function StatsDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [report, setReport] = useState<ReportKey>('overview');
  const [range, setRangeChoice] = useState<RangeChoice>({ kind: 'preset', days: 28 });
  const [draft, setDraft] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [data, setData] = useState<StatsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  useEffect(() => {
    setReport(readHash());
    const onHash = () => setReport(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const open = useCallback((key: ReportKey) => {
    setReport(key);
    if (typeof window !== 'undefined') window.history.replaceState(null, '', `#${key}`);
    window.scrollTo({ top: 0 });
  }, []);

  const load = useCallback(async (current: RangeChoice) => {
    if (!auth.currentUser) return;
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`/api/admin/stats?${queryOf(current)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (id !== requestId.current) return;
      if (response.status === 404) {
        // Die Route antwortet Nicht-Admins bewusst mit 404. Hier heißt das
        // nicht „weg", sondern „nicht für dieses Konto".
        setError('Dieses Konto hat keinen Zugriff auf die Zahlen.');
        setData(null);
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = (await response.json()) as StatsSummary;
      if (id !== requestId.current) return;
      setData(result);
      setLoadedAt(new Date());
    } catch (cause) {
      if (id !== requestId.current) return;
      setError(`Die Zahlen ließen sich nicht laden: ${(cause as Error).message}`);
      setData(null);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    void load(range);
  }, [authLoading, user, range, load]);

  // „Gerade aktiv" altert in Minuten, der Rest in Stunden: nur die eine Zahl
  // wird jede Minute nachgefragt, und nur, solange der Tab sichtbar ist.
  const hasData = data !== null;
  useEffect(() => {
    if (!user || !hasData) return;
    const refresh = async () => {
      if (document.visibilityState !== 'visible' || !auth.currentUser) return;
      try {
        const token = await auth.currentUser.getIdToken();
        const response = await fetch('/api/admin/stats?only=live', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const { live } = (await response.json()) as Pick<StatsSummary, 'live'>;
        setData((current) => (current ? { ...current, live } : current));
      } catch {
        // Die letzte Zahl bleibt stehen; ihr „Stand" zeigt, wie alt sie ist.
      }
    };
    const timer = window.setInterval(() => void refresh(), LIVE_REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [user, hasData]);

  const current = useMemo(() => REPORTS.find((r) => r.key === report) ?? REPORTS[0], [report]);

  if (authLoading) return null;

  if (!user) {
    return (
      <main className={styles.gate} data-page="admin">
        <p className={styles.notice}>Zum Ansehen der Zahlen bitte anmelden.</p>
      </main>
    );
  }

  const applyCustom = () => {
    if (!draft.from || !draft.to || draft.from > draft.to) return;
    setRangeChoice({ kind: 'custom', from: draft.from, to: draft.to });
  };

  return (
    <div className={styles.app} data-page="admin">
      <aside className={styles.side}>
        {/* Der Weg zurück auf die Seite: dieselbe Wortmarke, die im Burger
            zur Startseite führt. Die Stats-Seite hat sonst keine Leiste. */}
        <Link href="/" className={styles.home} aria-label="Eat This — Startseite">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img {...BRAND_WORDMARK} alt="Eat This" />
        </Link>
        <h1 className={styles.brand}>Stats</h1>
        <div className={styles.themeControls}>
          <ThemeSwitch de />
        </div>
        <nav className={styles.nav} aria-label="Berichte">
          {REPORTS.map((r) => (
            <NavEntry key={r.key} report={r} active={r.key === report} data={data} onOpen={open} />
          ))}
        </nav>
        <div className={styles.sideFoot}>
          <NoCountToggle />
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h2 className={styles.title}>{current.label}</h2>
            <p className={styles.titleSub}>{current.sub}</p>
          </div>
          <div className={styles.controls}>
            <div className={styles.seg} role="group" aria-label="Zeitraum">
              {PRESETS.map((days) => {
                const on =
                  days === 0
                    ? range.kind === 'today'
                    : range.kind === 'preset' && range.days === days;
                return (
                  <button
                    key={days}
                    type="button"
                    className={on ? styles.segBtnOn : styles.segBtn}
                    aria-pressed={on}
                    onClick={() =>
                      setRangeChoice(days === 0 ? { kind: 'today' } : { kind: 'preset', days })
                    }
                  >
                    {days === 0
                      ? 'Heute'
                      : days === 1
                        ? 'Gestern'
                        : days === 365
                          ? '1 Jahr'
                          : `${days} Tage`}
                  </button>
                );
              })}
            </div>
            <details className={styles.customRange}>
              <summary className="et-btn et-btn-sm et-btn-alt">Eigener Zeitraum</summary>
              <div>
                <input
                  type="date"
                  className={styles.dateInput}
                  aria-label="Von"
                  value={draft.from}
                  max={draft.to || undefined}
                  onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                />
                <input
                  type="date"
                  className={styles.dateInput}
                  aria-label="Bis"
                  value={draft.to}
                  min={draft.from || undefined}
                  max={data?.range.today}
                  onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                />
                <button
                  type="button"
                  className={`et-btn et-btn-sm${range.kind === 'custom' ? '' : ' et-btn-alt'}`}
                  onClick={applyCustom}
                  disabled={!draft.from || !draft.to || draft.from > draft.to}
                >
                  Anwenden
                </button>
              </div>
            </details>
            <button
              type="button"
              className="et-btn et-btn-sm et-btn-alt"
              onClick={() => void load(range)}
              disabled={loading}
            >
              {loading ? 'Lädt …' : 'Aktualisieren'}
            </button>
          </div>
          {data && (
            <p className={styles.meta}>
              {longDay(data.range.start)} – {longDay(data.range.end)} ·{' '}
              {NUMBER.format(data.range.days)}{' '}
              {data.range.days === 1 ? 'Kalendertag' : 'Kalendertage'}
              {data.range.includesToday ? ' · heute unvollständig' : ' · nur abgeschlossene Tage'} ·
              Vergleich: {shortDay(sinceDay(data.range.days * 2, data.range.end))}–
              {shortDay(dayBefore(data.range.start))}
              {loadedAt && (
                <>
                  {' '}
                  · Stand{' '}
                  {loadedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </>
              )}
            </p>
          )}
        </header>

        <div className={loading && data ? styles.stale : undefined} aria-busy={loading}>
          {loading && data && (
            <p className={styles.notice} role="status">
              Der neue Zeitraum wird geladen. Bis dahin siehst du die bisherigen Zahlen.
            </p>
          )}
          <div className={styles.grid}>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            {loading && !data && (
              <p className={styles.notice} role="status">
                Wird geladen …
              </p>
            )}
            {data && (
              <ReportBody
                report={report}
                data={data}
                refreshKey={loadedAt?.getTime() ?? 0}
                onOpen={open}
                onDay={(day) =>
                  setRangeChoice(
                    day === data.range.today
                      ? { kind: 'today' }
                      : { kind: 'custom', from: day, to: day }
                  )
                }
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ReportBody({
  report,
  data,
  onOpen,
  onDay,
  refreshKey,
}: {
  refreshKey: number;
  report: ReportKey;
  data: StatsSummary;
  onOpen: (key: ReportKey) => void;
  onDay: (day: string) => void;
}) {
  switch (report) {
    case 'days':
      return <Visitors data={data} onDay={onDay} />;
    case 'cards':
      return <AccountsReport data={data} />;
    case 'search':
      return <Search data={data} />;
    case 'acquisition':
      return <Acquisition data={data} />;
    case 'home':
      return <Insights data={data} refreshKey={refreshKey} />;
    case 'measurement':
      return <MeasurementReport data={data} />;
    default:
      return <Overview data={data} onOpen={onOpen} />;
  }
}
function navCount(key: ReportKey, data: StatsSummary | null): string | null {
  if (!data) return null;
  if (key === 'overview' || key === 'days') return NUMBER.format(data.totals.visitors);
  if (key === 'search' && data.search?.ok) return NUMBER.format(data.search.data.totals.clicks);
  return null;
}

function NavEntry({
  report,
  active,
  data,
  onOpen,
}: {
  report: Report;
  active: boolean;
  data: StatsSummary | null;
  onOpen: (key: ReportKey) => void;
}) {
  const count = navCount(report.key, data);
  return (
    <>
      {report.group && <span className={styles.navGroup}>{report.group}</span>}
      <button
        type="button"
        className={active ? styles.navItemOn : styles.navItem}
        aria-current={active ? 'page' : undefined}
        onClick={() => onOpen(report.key)}
      >
        <span>{report.label}</span>
        {count !== null && <span className={styles.navCount}>{count}</span>}
      </button>
    </>
  );
}

/**
 * Der eigene Browser gehört nicht in die Zahlen. Das Cookie liest die
 * Zähl-Route wie GPC; gesetzt wird es nur hier, auf Knopfdruck — der Zähler
 * selbst bleibt speicherfrei (lib/analytics/noCount.ts).
 */
function NoCountToggle() {
  const [off, setOff] = useState<boolean | null>(null);
  useEffect(() => {
    setOff(hasNoCountCookie(document.cookie));
  }, []);
  if (off === null) return null;
  const toggle = () => {
    // Kein `Secure`: localhost ist http und verschluckt das Cookie sonst still.
    document.cookie = off
      ? `${NO_COUNT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`
      : `${NO_COUNT_COOKIE}=1; Max-Age=31536000; Path=/; SameSite=Lax`;
    setOff(!off);
  };
  return (
    <p>
      {off
        ? 'Dieser Browser wird nicht mitgezählt.'
        : 'Dieser Browser zählt mit — jeder eigene Klick landet in den Zahlen.'}{' '}
      <button
        type="button"
        className={`et-btn et-btn-sm et-btn-alt ${styles.optOutButton}`}
        onClick={toggle}
      >
        {off ? 'Wieder mitzählen' : 'Nicht mitzählen'}
      </button>
    </p>
  );
}
