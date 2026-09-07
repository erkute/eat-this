import { useMemo, useState } from 'react';
import type { StatsSummary } from '@/lib/admin/stats.server';
import type { ReportKey } from '../../StatsDashboard';
import { BOT_FILTER_LIVE_SINCE, LIGHTHOUSE_FILTER_LIVE_SINCE } from '../../StatsDashboard';
import { BarRows, Card, Change, Columns, Kpi, LineChart } from '../charts';
import {
  NUMBER,
  WEEKDAYS_SHORT,
  change,
  dayTitle,
  decimal,
  euro,
  labelFor,
  percent,
} from '../format';
import styles from '../../StatsDashboard.module.css';

type Metric = 'visitors' | 'pageviews' | 'search_clicks' | 'search_impressions' | `event:${string}`;

const METRIC_LABELS: Record<string, string> = {
  visitors: 'Besucher',
  pageviews: 'Seitenaufrufe',
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
    const days = data.days.map((d) => d.day);
    if (metric === 'visitors' || metric === 'pageviews') {
      return {
        days,
        now: data.days.map((d) => d[metric]),
        before: data.previousDays.map((d) => d[metric]),
        label: METRIC_LABELS[metric],
        format: undefined,
      };
    }
    if (metric === 'search_clicks' || metric === 'search_impressions') {
      const field = metric === 'search_clicks' ? 'clicks' : 'impressions';
      return {
        days: search?.days.map((d) => d.day) ?? [],
        now: search?.days.map((d) => d[field]) ?? [],
        before: [],
        label: METRIC_LABELS[metric],
        format: undefined,
      };
    }
    const key = metric.slice('event:'.length);
    return {
      days,
      now: data.eventsByDay.map((d) => d.counts[key] ?? 0),
      before: [],
      label: labelFor(key),
      format: undefined,
    };
  }, [metric, data, search]);

  const openIndex = data.today ? chart.days.indexOf(data.today.day) : -1;
  const series = [{ label: chart.label, values: chart.now }];
  if (compare && chart.before.length > 0) {
    series.push({ label: 'Vorperiode', values: chart.before, dashed: true } as (typeof series)[0]);
  }

  const revealShare = data.funnel.rates.find((r) => r.key === 'login_view_signed');
  const checkoutRate = data.funnel.rates.find((r) => r.key === 'checkout_purchase');
  const mapRate = data.funnel.rates.find((r) => r.key === 'visit_map');

  return (
    <>
      <div className={styles.kpis}>
        <Kpi
          label="Besucher"
          value={NUMBER.format(totals.visitors)}
          delta={period?.visitors ?? null}
          hint={`${NUMBER.format(perDay)} je vollem Tag`}
          spark={data.days.map((d) => d.visitors)}
        />
        <Kpi
          label="Seitenaufrufe"
          value={NUMBER.format(totals.pageviews)}
          delta={period?.pageviews ?? null}
          hint={`${decimal(perVisitor)} je Besucher`}
          spark={data.days.map((d) => d.pageviews)}
        />
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
            <Kpi
              label="Umsatz"
              value={euro(accounts.revenue.inWindowCents)}
              hint={`${euro(accounts.revenue.totalCents)} insgesamt`}
            />
          </>
        )}
        {search && (
          <Kpi
            label="Google-Klicks"
            value={NUMBER.format(search.totals.clicks)}
            delta={search.before ? change(search.totals.clicks, search.before.clicks) : null}
            hint={`${NUMBER.format(search.totals.impressions)} Impressionen`}
            spark={search.days.map((d) => d.clicks)}
          />
        )}
      </div>

      <Card
        title="Verlauf"
        span={2}
        sub={
          period
            ? `Gestrichelt die ${NUMBER.format(period.days)} Tage davor, nach Tag überlagert. Der letzte Punkt ist hohl, wenn der Tag noch läuft.`
            : 'Der letzte Punkt ist hohl, wenn der Tag noch läuft.'
        }
        tools={
          <>
            <select
              className={styles.select}
              aria-label="Kennzahl"
              value={metric}
              onChange={(e) => setMetric(e.target.value as Metric)}
            >
              <option value="visitors">Besucher</option>
              <option value="pageviews">Seitenaufrufe</option>
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
          format={chart.format}
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
              <button type="button" className={styles.optOutButton} onClick={() => onOpen('days')}>
                Beide Tage ausgebreitet →
              </button>
            </p>
          </>
        ) : (
          <p className={styles.empty}>Kein abgeschlossener Tag im Zeitraum.</p>
        )}
      </Card>

      <Card title="Der Trichter in drei Zahlen" sub="Ereignisse je Besucher, nicht Personen.">
        <div className={styles.rates}>
          <RateTile rate={mapRate?.rate ?? null} label="der Besucher öffnen die Karte" />
          <RateTile
            rate={revealShare?.rate ?? null}
            label="der Anmeldeformulare enden angemeldet"
          />
          <RateTile rate={checkoutRate?.rate ?? null} label="der begonnenen Käufe werden bezahlt" />
        </div>
        <p className={styles.note}>
          <button type="button" className={styles.optOutButton} onClick={() => onOpen('funnel')}>
            Ganzer Funnel →
          </button>
        </p>
      </Card>

      <Card title="Nach Wochentag" sub="Besucher im Schnitt je Wochentag, ohne den laufenden Tag.">
        {data.weekdays.length < 2 ? (
          <p className={styles.empty}>Noch zu wenige Tage.</p>
        ) : (
          <Columns
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
          <button type="button" className={styles.optOutButton} onClick={() => onOpen('content')}>
            Alle Seiten →
          </button>
        </p>
      </Card>

      <Card title="Herkunft" sub="Externe Verweise, einmal je Besuch gezählt.">
        <BarRows rows={data.referrers.slice(0, 8)} empty="Keine externen Verweise." />
        <p className={styles.note}>
          <button
            type="button"
            className={styles.optOutButton}
            onClick={() => onOpen('acquisition')}
          >
            Herkunft und Einstiege →
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
            <button type="button" className={styles.optOutButton} onClick={() => onOpen('search')}>
              Anfragen, Seiten, Trends →
            </button>
          </p>
        </Card>
      )}

      <p className={styles.notice}>
        Alle Besuche, ohne Cookie-Zustimmung. Pfeile an den Kacheln: Schnitt je vollem Tag gegen die
        Periode davor. Bis {BOT_FILTER_LIVE_SINCE} zählten Bots mit, bis{' '}
        {LIGHTHOUSE_FILTER_LIVE_SINCE} die eigene Lighthouse-CI.
      </p>
    </>
  );
}

function RateTile({ rate, label }: { rate: number | null; label: string }) {
  return (
    <div className={styles.rate}>
      <span className={styles.rateValue}>{rate === null ? '—' : percent(rate, 0)}</span>
      <span className={styles.rateLabel}>{label}</span>
    </div>
  );
}
