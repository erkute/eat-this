'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { auth } from '@/lib/firebase/config';
import type { StatsSummary } from '@/lib/admin/stats.server';
import { hasNoCountCookie, NO_COUNT_COOKIE } from '@/lib/analytics/noCount';
import { NUMBER, longDay } from './stats/format';
import Overview from './stats/reports/Overview';
import Days from './stats/reports/Days';
import FunnelReport from './stats/reports/FunnelReport';
import Cards from './stats/reports/Cards';
import Revenue from './stats/reports/Revenue';
import Search from './stats/reports/Search';
import Acquisition from './stats/reports/Acquisition';
import Content from './stats/reports/Content';
import EventsReport from './stats/reports/EventsReport';
import ConsentReport from './stats/reports/ConsentReport';
import styles from './StatsDashboard.module.css';

/**
 * Die Leseseite des einwilligungsfreien Zählers — als Werkzeug mit Berichten
 * in der Seitenleiste, Zeitraum in der Kopfzeile und dem Trichter des
 * Produkts in der Mitte (frei → Konto → vor Ort → Pack).
 *
 * Bewusst nüchtern: das ist ein Werkzeug, keine Marketingfläche. Die Daten
 * kommen in einem Aufruf von /api/admin/stats; die Berichte schneiden sie nur
 * verschieden zu.
 */

export type ReportKey =
  | 'overview'
  | 'days'
  | 'funnel'
  | 'cards'
  | 'revenue'
  | 'search'
  | 'acquisition'
  | 'content'
  | 'events'
  | 'consent';

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
    group: 'Berichte',
    sub: 'Besucher, Konten, Karten, Umsatz auf einen Blick',
  },
  {
    key: 'days',
    label: 'Heute & Gestern',
    sub: 'Zwei Tage, ganz ausgebreitet — mit der Suche des frischesten Tages',
  },
  { key: 'funnel', label: 'Funnel', sub: 'Frei → Konto (+20 Karten) → vor Ort → Pack' },
  {
    key: 'cards',
    label: 'Karten & Konten',
    sub: 'Der Stapel, wer ihn sammelt, und wer wiederkommt',
  },
  { key: 'revenue', label: 'Umsatz', sub: 'Packs, Käufe, Checkouts' },
  {
    key: 'search',
    label: 'Google-Suche',
    group: 'Akquisition',
    sub: 'Search Console: Anfragen, Seiten, Geräte, Länder, Trends',
  },
  { key: 'acquisition', label: 'Herkunft', sub: 'Woher die Besucher kommen und wo sie einsteigen' },
  {
    key: 'content',
    label: 'Inhalte',
    group: 'Verhalten',
    sub: 'Welche Seiten gesehen werden und wo Besuche enden',
  },
  {
    key: 'events',
    label: 'Ereignisse',
    sub: 'Jede gezählte Handlung, je 100 Besucher, gegen die Vorperiode',
  },
  {
    key: 'consent',
    label: 'Cookie-Dialog',
    sub: 'Wie viele Menschen zustimmen — und wie viele Google Analytics sieht',
  },
];

const PRESETS = [7, 14, 30, 90, 365] as const;

type RangeChoice = { kind: 'preset'; days: number } | { kind: 'custom'; from: string; to: string };

function queryOf(range: RangeChoice): string {
  return range.kind === 'preset'
    ? `days=${range.days}`
    : `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
}

/**
 * Der Tag, seit dem der Bot-Filter wirklich greift. Bis dahin ersetzte die
 * App-Hosting-Edge den User-Agent, und Bingbot, Baidu-Render und ein
 * Azure-Crawler mit Lighthouse-Kennung zaehlten als Besucher — am 01.09.2026
 * rund ein Drittel aller Beacons (Edge-Log). Seitdem schickt der Browser den
 * User-Agent im Beacon mit (lib/analytics.ts). Muss auf den Rollout-Tag
 * zeigen, sonst luegt die Fussnote.
 */
export const BOT_FILTER_LIVE_SINCE = '02.09.2026';

/**
 * Der zweite Schnitt: bis hierher zaehlte die EIGENE Lighthouse-CI mit
 * (lib/analytics/botFilter.ts, belegt 03.09.2026). Muss auf den Rollout-Tag
 * des Filters zeigen.
 */
export const LIGHTHOUSE_FILTER_LIVE_SINCE = '04.09.2026';

function readHash(): ReportKey {
  if (typeof window === 'undefined') return 'overview';
  const key = window.location.hash.replace('#', '');
  return REPORTS.some((r) => r.key === key) ? (key as ReportKey) : 'overview';
}

export default function StatsDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [report, setReport] = useState<ReportKey>('overview');
  const [range, setRangeChoice] = useState<RangeChoice>({ kind: 'preset', days: 30 });
  const [draft, setDraft] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [data, setData] = useState<StatsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`/api/admin/stats?${queryOf(current)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 404 || response.status === 401) {
        // Die Route antwortet Nicht-Admins bewusst mit 404. Hier heißt das
        // nicht „weg", sondern „nicht für dieses Konto".
        setError('Dieses Konto hat keinen Zugriff auf die Zahlen.');
        setData(null);
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setData((await response.json()) as StatsSummary);
      setLoadedAt(new Date());
    } catch (cause) {
      setError(`Die Zahlen ließen sich nicht laden: ${(cause as Error).message}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    void load(range);
  }, [authLoading, user, range, load]);

  const current = useMemo(() => REPORTS.find((r) => r.key === report) ?? REPORTS[0], [report]);

  if (authLoading) return null;

  if (!user) {
    return (
      <main className={styles.gate}>
        <p className={styles.notice}>Zum Ansehen der Zahlen bitte anmelden.</p>
      </main>
    );
  }

  const applyCustom = () => {
    if (!draft.from || !draft.to || draft.from > draft.to) return;
    setRangeChoice({ kind: 'custom', from: draft.from, to: draft.to });
  };

  return (
    <div className={styles.app}>
      <aside className={styles.side}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true" />
          <h1 className={styles.brandName}>Zahlen</h1>
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
                const on = range.kind === 'preset' && range.days === days;
                return (
                  <button
                    key={days}
                    type="button"
                    className={on ? styles.segBtnOn : styles.segBtn}
                    aria-pressed={on}
                    onClick={() => setRangeChoice({ kind: 'preset', days })}
                  >
                    {days === 365 ? '1 Jahr' : `${days} Tage`}
                  </button>
                );
              })}
            </div>
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
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
            />
            <button
              type="button"
              className={range.kind === 'custom' ? styles.btn : styles.btnGhost}
              onClick={applyCustom}
              disabled={!draft.from || !draft.to || draft.from > draft.to}
            >
              Zeitraum
            </button>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => void load(range)}
              disabled={loading}
            >
              {loading ? 'Lädt …' : 'Aktualisieren'}
            </button>
          </div>
          {data && (
            <p className={styles.meta}>
              {longDay(data.range.start)} – {longDay(data.range.end)} ·{' '}
              {NUMBER.format(data.range.days)} Tage · Vergleich mit den{' '}
              {NUMBER.format(data.range.days)} Tagen davor
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

        <div className={loading && data ? styles.stale : undefined}>
          <div className={styles.grid}>
            {error && <p className={styles.error}>{error}</p>}
            {loading && !data && <p className={styles.notice}>Wird geladen …</p>}
            {data && <ReportBody report={report} data={data} onOpen={open} />}
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
}: {
  report: ReportKey;
  data: StatsSummary;
  onOpen: (key: ReportKey) => void;
}) {
  switch (report) {
    case 'days':
      return <Days data={data} />;
    case 'funnel':
      return <FunnelReport data={data} />;
    case 'cards':
      return <Cards data={data} />;
    case 'revenue':
      return <Revenue data={data} />;
    case 'search':
      return <Search data={data} />;
    case 'acquisition':
      return <Acquisition data={data} />;
    case 'content':
      return <Content data={data} />;
    case 'events':
      return <EventsReport data={data} />;
    case 'consent':
      return <ConsentReport data={data} />;
    default:
      return <Overview data={data} onOpen={onOpen} />;
  }
}

/** Die kleine Zahl rechts neben einem Bericht — das, was er beantwortet. */
function navCount(key: ReportKey, data: StatsSummary | null): string | null {
  if (!data) return null;
  switch (key) {
    case 'overview':
      return NUMBER.format(data.totals.visitors);
    case 'days':
      return data.today ? NUMBER.format(data.today.visitors) : null;
    case 'funnel': {
      const signed = data.funnel.stages.flatMap((s) => s.steps).find((s) => s.key === 'signed_in');
      return signed ? NUMBER.format(signed.count) : null;
    }
    case 'cards':
      return data.accounts ? NUMBER.format(data.accounts.reveals.inWindow) : null;
    case 'revenue':
      return data.accounts ? NUMBER.format(data.accounts.purchases.inWindow) : null;
    case 'search':
      return data.search?.ok ? NUMBER.format(data.search.data.totals.clicks) : null;
    case 'events':
      return NUMBER.format(data.events.reduce((t, e) => t + e.count, 0));
    default:
      return null;
  }
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
      <button type="button" className={styles.optOutButton} onClick={toggle}>
        {off ? 'Wieder mitzählen' : 'Nicht mitzählen'}
      </button>
    </p>
  );
}
