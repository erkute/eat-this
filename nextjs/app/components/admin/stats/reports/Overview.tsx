import { useMemo, useState } from 'react';
import { delta, eachDay, dayBefore, sinceDay, type StatsSummary } from '@/lib/admin/stats.server';
import type { ReportKey } from '../../StatsDashboard';
import { BOT_FILTER_LIVE_SINCE, LIGHTHOUSE_FILTER_LIVE_SINCE } from '../../StatsDashboard';
import { BarRows, Card, Change, Columns, Kpi, LineChart, type Series } from '../charts';
import {
  NUMBER,
  WEEKDAYS_SHORT,
  dayTitle,
  decimal,
  euro,
  labelFor,
  percent,
  shortDay,
} from '../format';
import styles from '../../StatsDashboard.module.css';

type Metric =
  | 'visitors'
  | 'pageviews'
  | 'ga_users'
  | 'search_clicks'
  | 'search_impressions'
  | `event:${string}`;

const METRIC_LABELS: Record<string, string> = {
  visitors: 'Tagesbesucher',
  pageviews: 'Seitenaufrufe',
  ga_users: 'GA-Nutzer',
  search_clicks: 'Google-Klicks',
  search_impressions: 'Google-Impressionen',
};

/** Ereignisse, die im Auswahlmenü zuerst stehen — der Kern des Trichters. */
const FEATURED_EVENTS = [
  'map_opened',
  'must_eat_opened',
  'must_eat_reveal_login_required',
  'sign_up',
  'starter_pack_granted',
  'must_eat_reveal_unlocked',
  'begin_checkout',
  'purchase',
];

export default function Overview({
  data,
  onOpen,
}: {
  data: StatsSummary;
  onOpen: (key: ReportKey) => void;
}) {
  const { totals, period, accounts, latest, today } = data;
  const search = data.search?.ok ? data.search.data : null;
  const ga = data.ga?.ok ? data.ga : null;
  const [metric, setMetric] = useState<Metric>('visitors');
  const [compare, setCompare] = useState(true);

  // Ohne den laufenden Tag: der stand morgens als ganzer Tag im Nenner und
  // drueckte den Schnitt, ohne dass irgendwer weggeblieben waere.
  const closedVisitors = totals.visitors - (today?.visitors ?? 0);
  const perDay = totals.closedDays > 0 ? Math.round(closedVisitors / totals.closedDays) : 0;
  const perVisitor = totals.visitors > 0 ? totals.pageviews / totals.visitors : 0;

  const eventKeys = useMemo(() => {
    const present = new Set(data.events.map((e) => e.key));
    const featured = FEATURED_EVENTS.filter((k) => present.has(k));
    const rest = data.events.map((e) => e.key).filter((k) => !FEATURED_EVENTS.includes(k));
    return [...featured, ...rest];
  }, [data.events]);

  const chart = useMemo(() => {
    const days = eachDay(data.range.start, data.range.end);
    if (metric === 'visitors' || metric === 'pageviews') {
      return {
        days,
        now: days.map((day) => data.days.find((d) => d.day === day)?.[metric] ?? 0),
        before: eachDay(
          sinceDay(data.range.days * 2, data.range.end),
          dayBefore(data.range.start)
        ).map((day) => data.previousDays.find((d) => d.day === day)?.[metric] ?? 0),
        label: METRIC_LABELS[metric],
      };
    }
    if (metric === 'ga_users') {
      // GA dedupliziert Nutzer anders als der eigene Tageszähler.
      const gaByDay = new Map(ga?.days.map((d) => [d.day, d.users]) ?? []);
      return {
        days,
        now: days.map((day) => gaByDay.get(day) ?? 0),
        before: [],
        label: METRIC_LABELS[metric],
      };
    }
    if (metric === 'search_clicks' || metric === 'search_impressions') {
      const field = metric === 'search_clicks' ? 'clicks' : 'impressions';
      const searchDays = search ? eachDay(search.range.start, search.range.end) : [];
      return {
        days: searchDays,
        now: searchDays.map((day) => search?.days.find((d) => d.day === day)?.[field] ?? 0),
        before: search?.before
          ? searchDays.map(
              (day) =>
                search.previousDays.find((b) => b.day === dayBefore(day, search.range.days))?.[
                  field
                ] ?? 0
            )
          : [],
        label: METRIC_LABELS[metric],
      };
    }
    const key = metric.slice('event:'.length);
    return {
      days,
      now: days.map((day) => data.eventsByDay.find((d) => d.day === day)?.counts[key] ?? 0),
      before: [],
      label: labelFor(key),
    };
  }, [metric, data, search, ga]);

  const openIndex = data.today ? chart.days.indexOf(data.today.day) : -1;
  const series: Series[] = [{ label: chart.label, values: chart.now }];
  if (compare && chart.before.length > 0) {
    series.push({
      label: 'Vorperiode',
      values: chart.before,
      dashed: true,
      days: chart.days.map((day) =>
        dayBefore(day, metric.startsWith('search_') && search ? search.range.days : data.range.days)
      ),
    });
  }

  const revealShare = data.funnel.rates.find((r) => r.key === 'login_view_signed');
  const checkoutRate = data.funnel.rates.find((r) => r.key === 'checkout_purchase');
  const mapRate = data.funnel.rates.find((r) => r.key === 'visit_map');

  return (
    <>
      <div className={styles.kpis}>
        <Kpi
          label="Tagesbesucher"
          value={NUMBER.format(totals.visitors)}
          delta={period?.visitors ?? null}
          hint={`Summe · Ø ${NUMBER.format(perDay)} pro Tag`}
          spark={data.days.map((d) => d.visitors)}
        />
        <Kpi
          label="Seitenaufrufe"
          value={NUMBER.format(totals.pageviews)}
          delta={period?.pageviews ?? null}
          hint={`${decimal(perVisitor)} je Tagesbesucher`}
          spark={data.days.map((d) => d.pageviews)}
        />
        {search && (
          <Kpi
            label="Google-Klicks"
            value={NUMBER.format(search.totals.clicks)}
            delta={search.before ? delta(search.totals.clicks, search.before.clicks) : null}
            hint={`${shortDay(search.range.start)}–${shortDay(search.range.end)} · endgültige Suchdaten`}
            spark={eachDay(search.range.start, search.range.end).map(
              (day) => search.days.find((d) => d.day === day)?.clicks ?? 0
            )}
          />
        )}
        {accounts && (
          <>
            <Kpi
              label="Neue Konten"
              value={NUMBER.format(accounts.newInWindow)}
              hint={`${NUMBER.format(accounts.total)} insgesamt`}
              spark={accounts.byDay.map((d) => d.newAccounts)}
            />
            <Kpi
              label="Vor Ort aufgedeckt"
              value={NUMBER.format(accounts.reveals.inWindow)}
              hint={`${NUMBER.format(accounts.reveals.total)} insgesamt`}
              spark={accounts.byDay.map((d) => d.reveals)}
            />
            <Kpi
              label="Käufe"
              value={NUMBER.format(accounts.purchases.inWindow)}
              hint={`${NUMBER.format(accounts.purchases.total)} insgesamt`}
              spark={accounts.byDay.map((d) => d.purchases)}
            />
          </>
        )}
      </div>

      <Card
        title="Verlauf"
        span={2}
        sub={
          metric.startsWith('search_') && search
            ? `Google: ${shortDay(search.range.start)}–${shortDay(search.range.end)} Endgültige Daten; gestrichelt die gleich lange Vorperiode.`
            : chart.before.length > 0
              ? 'Abgeschlossene Tage. Gestrichelt die gleich lange Vorperiode, nach Tagen überlagert.'
              : 'Abgeschlossene Tage. Für diese Kennzahl liegt keine Vergleichsreihe vor.'
        }
        tools={
          <>
            <select
              className={styles.select}
              aria-label="Kennzahl"
              value={metric}
              onChange={(e) => setMetric(e.target.value as Metric)}
            >
              <option value="visitors">Tagesbesucher</option>
              <option value="pageviews">Seitenaufrufe</option>
              {ga && <option value="ga_users">GA-Nutzer</option>}
              {search && (
                <>
                  <option value="search_clicks">Google-Klicks</option>
                  <option value="search_impressions">Google-Impressionen</option>
                </>
              )}
              <optgroup label="Ereignisse">
                {eventKeys.map((key) => (
                  <option key={key} value={`event:${key}`}>
                    {labelFor(key)}
                  </option>
                ))}
              </optgroup>
            </select>
            <label className={styles.muted}>
              <input
                type="checkbox"
                checked={compare}
                onChange={(e) => setCompare(e.target.checked)}
                disabled={chart.before.length === 0}
              />{' '}
              Vorperiode
            </label>
          </>
        }
      >
        <LineChart
          days={chart.days}
          series={series}
          openIndex={openIndex >= 0 ? openIndex : null}
        />
      </Card>

      <Card
        title={latest.day ? dayTitle(latest.day.day) : 'Gestern'}
        sub="Der jüngste abgeschlossene Tag."
      >
        {latest.day ? (
          <>
            <p className={styles.big}>
              {NUMBER.format(latest.day.visitors)}
              <span className={styles.bigUnit}>Besucher</span>
            </p>
            <p className={styles.note}>{NUMBER.format(latest.day.pageviews)} Seitenaufrufe.</p>
            <div className={styles.changes}>
              {latest.vsPrevDay && <Change delta={latest.vsPrevDay.visitors} label="zum Vortag" />}
              {latest.vsSameWeekday && (
                <Change delta={latest.vsSameWeekday.visitors} label="zum selben Wochentag" />
              )}
            </div>
            {today && (
              <p className={styles.note}>
                Heute bisher {NUMBER.format(today.visitors)} Besucher,{' '}
                {NUMBER.format(today.pageviews)} Aufrufe.
              </p>
            )}
            <p className={styles.note}>
              <button
                type="button"
                className={`et-btn et-btn-sm et-btn-alt ${styles.optOutButton}`}
                onClick={() => onOpen('days')}
              >
                Tag im Detail
              </button>
            </p>
          </>
        ) : (
          <p className={styles.empty}>Kein abgeschlossener Tag im Zeitraum.</p>
        )}
      </Card>

      <Card
        title="Der Trichter in drei Zahlen"
        sub="Verhältnisse gezählter Ereignisse, keine Personen-Conversions."
      >
        <div className={styles.rates}>
          <RateTile rate={mapRate?.rate ?? null} label="Map-Aufrufe je 100 Tagesbesucher" />
          <RateTile rate={revealShare?.rate ?? null} label="Anmeldungen je 100 Formularaufrufe" />
          <RateTile rate={checkoutRate?.rate ?? null} label="Käufe je 100 Checkout-Starts" />
        </div>
        <p className={styles.note}>
          <button
            type="button"
            className={`et-btn et-btn-sm et-btn-alt ${styles.optOutButton}`}
            onClick={() => onOpen('funnel')}
          >
            Ganzer Funnel
          </button>
        </p>
      </Card>

      <Card title="Nach Wochentag" sub="Besucher im Schnitt je Wochentag, ohne den laufenden Tag.">
        {data.weekdays.length < 2 ? (
          <p className={styles.empty}>Noch zu wenige Tage.</p>
        ) : (
          <Columns
            // Montag zuerst — Date zählt ab Sonntag, gelesen wird die Woche anders.
            rows={[...data.weekdays]
              .sort((a, b) => ((a.index + 6) % 7) - ((b.index + 6) % 7))
              .map((w) => ({
                label: WEEKDAYS_SHORT[w.index],
                value: w.days > 0 ? w.visitors / w.days : 0,
                title: `${NUMBER.format(w.days)} Tage`,
              }))}
          />
        )}
      </Card>

      <Card title="Meistgesehen" sub="Aufrufe je Seite.">
        <BarRows rows={data.paths.slice(0, 8)} empty="Nichts gezählt." />
        <p className={styles.note}>
          <button
            type="button"
            className={`et-btn et-btn-sm et-btn-alt ${styles.optOutButton}`}
            onClick={() => onOpen('content')}
          >
            Alle Seiten
          </button>
        </p>
      </Card>

      <Card title="Herkunft" sub="Seitenaufrufe mit externem Verweis, keine eindeutigen Personen.">
        <BarRows rows={data.referrers.slice(0, 8)} empty="Keine externen Verweise." />
        <p className={styles.note}>
          <button
            type="button"
            className={`et-btn et-btn-sm et-btn-alt ${styles.optOutButton}`}
            onClick={() => onOpen('acquisition')}
          >
            Herkunft und Einstiege
          </button>
        </p>
      </Card>

      {search && (
        <Card
          title="Google-Suche"
          sub={`${NUMBER.format(search.totals.impressions)} Impressionen, Klickrate ${percent(search.totals.ctr)}.`}
        >
          <BarRows
            rows={search.queries.slice(0, 8).map((q) => ({ key: q.key, count: q.clicks }))}
            empty="Noch keine Klicks aus der Suche."
          />
          <p className={styles.note}>
            <button
              type="button"
              className={`et-btn et-btn-sm et-btn-alt ${styles.optOutButton}`}
              onClick={() => onOpen('search')}
            >
              Anfragen, Seiten, Trends
            </button>
          </p>
        </Card>
      )}

      <Card
        title="Weitere Kennzahlen"
        span={3}
        sub="Live-Aktivität ist getrennt vom abgeschlossenen Zeitraum. GA zählt nur mit Einwilligung."
      >
        <div className={styles.kpis}>
          {data.live && (
            <Kpi
              label="Gerade aktiv"
              value={NUMBER.format(data.live.activeNow)}
              hint={[
                `letzte ${data.live.minutes} Min`,
                data.live.ga !== null ? `GA ${NUMBER.format(data.live.ga)}` : null,
                `Stand ${new Date(data.live.at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          )}
          {ga && (
            <Kpi
              label="GA-Nutzer"
              value={NUMBER.format(ga.users)}
              hint="Aktive Nutzer mit Einwilligung · im Zeitraum dedupliziert"
              spark={eachDay(data.range.start, data.range.end).map(
                (day) => ga.days.find((d) => d.day === day)?.users ?? 0
              )}
            />
          )}
          {accounts && (
            <Kpi
              label="Katalogwert der Käufe"
              value={euro(accounts.revenue.inWindowCents)}
              hint={`${euro(accounts.revenue.totalCents)} insgesamt`}
            />
          )}
        </div>
      </Card>

      <p className={styles.notice}>
        Tagesbesucher sind über mehrere Tage nicht eindeutig. Veränderungen an den Kacheln: Schnitt
        je vollem Tag gegen die Periode davor. Bis {BOT_FILTER_LIVE_SINCE} zählten Bots mit, bis{' '}
        {LIGHTHOUSE_FILTER_LIVE_SINCE} die eigene Lighthouse-CI.
      </p>
    </>
  );
}

function RateTile({ rate, label }: { rate: number | null; label: string }) {
  return (
    <div className={styles.rate}>
      <span className={styles.rateValue}>{rate === null ? '—' : decimal(rate * 100, 1)}</span>
      <span className={styles.rateLabel}>{label}</span>
    </div>
  );
}
