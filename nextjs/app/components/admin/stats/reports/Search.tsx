import { delta, eachDay, dayBefore, sinceDay, type StatsSummary } from '@/lib/admin/stats.server';
import type { SearchMover } from '@/lib/admin/searchConsole';
import { BarRows, Card, DiffCell, Kpi, LineChart } from '../charts';
import { DEVICE_LABELS, NUMBER, countryName, percent, position, longDay } from '../format';
import { SearchRows } from './Days';
import styles from '../../StatsDashboard.module.css';

/**
 * Die Google-Suche. Andere Quelle, andere Menschen: die Search Console zählt
 * Suchergebnisse, nicht Besuche, und ihre Zahlen kommen zwei bis drei Tage
 * nach dem Tag. Deshalb ein eigener Bericht mit eigener Beschriftung — und
 * mit einem ehrlichen Zustand, wenn der Zugang fehlt, statt einer leeren
 * Tabelle.
 */
export default function Search({ data }: { data: StatsSummary }) {
  const result = data.search;
  if (!result) return <p className={styles.notice}>Die Suche wurde nicht angefragt.</p>;
  if (!result.ok) {
    return (
      <p className={styles.notice}>
        {result.reason === 'no-access' ? (
          <>
            Kein Zugriff. In der Search Console unter „Nutzer und Berechtigungen“{' '}
            <code className={styles.code}>{result.identity ?? '(unbekannt)'}</code> als Nutzer
            eintragen.
          </>
        ) : (
          <>Search Console antwortet nicht: {result.message}</>
        )}
      </p>
    );
  }

  const s = result.data;
  const { totals, before } = s;
  const days = eachDay(s.range.start, s.range.end);
  const previousStart = sinceDay(s.range.days * 2, s.range.end);
  const previousEnd = dayBefore(s.range.start);
  const values = (field: 'clicks' | 'impressions', previous = false) =>
    days.map(
      (day) =>
        (previous ? s.previousDays : s.days).find(
          (row) => row.day === (previous ? dayBefore(day, s.range.days) : day)
        )?.[field] ?? 0
    );

  return (
    <>
      <div className={styles.searchPeriod}>
        <div>
          <span className={styles.kpiLabel}>Endgültige Google-Daten</span>
          <strong>
            {longDay(s.range.start)} – {longDay(s.range.end)}
          </strong>
        </div>
        <div>
          <span className={styles.kpiLabel}>Vergleichszeitraum</span>
          <strong>
            {longDay(previousStart)} – {longDay(previousEnd)}
          </strong>
        </div>
        <p>
          Google liefert zeitversetzt. Beide Zeiträume umfassen {s.range.days} Tage. Suchdaten
          verwenden die Google-Zeitzone (Pacific Time), die Besuchszahlen Berlin.
        </p>
      </div>
      <div className={styles.kpis}>
        <Kpi
          label="Klicks"
          value={NUMBER.format(totals.clicks)}
          delta={before ? delta(totals.clicks, before.clicks) : null}
          spark={values('clicks')}
        />
        <Kpi
          label="Impressionen"
          value={NUMBER.format(totals.impressions)}
          delta={before ? delta(totals.impressions, before.impressions) : null}
          spark={values('impressions')}
        />
        <Kpi
          label="Klickrate"
          value={percent(totals.ctr)}
          delta={before ? delta(totals.ctr, before.ctr) : null}
          hint={before ? `vorher ${percent(before.ctr)}` : undefined}
        />
        <Kpi
          label="Position"
          value={position(totals.position)}
          delta={
            before && before.impressions > 0 && totals.impressions > 0
              ? delta(totals.position, before.position)
              : null
          }
          invert
          hint={before ? `vorher ${position(before.position)}` : undefined}
        />
        <Kpi
          label="Anfragen mit Klick"
          value={NUMBER.format(s.queries.filter((q) => q.clicks > 0).length)}
          hint="in den Top 25"
        />
        <Kpi
          label="Seiten mit Klick"
          value={NUMBER.format(s.pages.filter((p) => p.clicks > 0).length)}
          hint="in den Top 25"
        />
      </div>

      <Card
        title="Klicks aus der Suche"
        span={2}
        sub="Durchgezogen der gewählte Suchzeitraum, gestrichelt die gleich lange Vorperiode."
      >
        <LineChart
          days={days}
          series={[
            { label: 'Klicks', values: values('clicks') },
            ...(before
              ? [
                  {
                    label: 'Vorperiode',
                    values: values('clicks', true),
                    dashed: true,
                    days: days.map((day) => dayBefore(day, s.range.days)),
                  },
                ]
              : []),
          ]}
        />
      </Card>

      <Card
        title="Sichtbarkeit in der Suche"
        sub="Impressionen im Vergleich. Eine niedrigere Position bedeutet eine höhere Platzierung."
      >
        <LineChart
          days={days}
          height={150}
          series={[
            { label: 'Impressionen', values: values('impressions') },
            ...(before
              ? [
                  {
                    label: 'Vorperiode',
                    values: values('impressions', true),
                    dashed: true,
                    days: days.map((day) => dayBefore(day, s.range.days)),
                  },
                ]
              : []),
          ]}
        />
      </Card>

      <Card
        title="Welche Suche funktioniert"
        span={2}
        sub="Top-Anfragen nach Klicks. Anonymisierte Suchen fehlen in dieser Liste; ihre Klicks bleiben in der Gesamtsumme enthalten."
      >
        <SearchRows rows={s.queries} empty="Noch keine Klicks aus der Suche." />
      </Card>

      <Card title="Geräte" sub="Woran gesucht wird.">
        <BarRows
          rows={s.devices.map((d) => ({
            key: d.key,
            label: DEVICE_LABELS[d.key] ?? d.key,
            count: d.clicks,
            share: totals.clicks > 0 ? percent(d.clicks / totals.clicks, 0) : '',
          }))}
          empty="Keine Daten."
        />
        <h3 className={`et-label ${styles.subTitle}`} style={{ marginTop: 18 }}>
          Länder
        </h3>
        <BarRows
          rows={s.countries.map((c) => ({
            key: c.key,
            label: countryName(c.key),
            count: c.clicks,
            share: totals.clicks > 0 ? percent(c.clicks / totals.clicks, 0) : '',
          }))}
          empty="Keine Daten."
        />
      </Card>

      <Card title="Welche Seite gefunden wird" span={2} sub="Seiten nach Klicks.">
        <SearchRows rows={s.pages} empty="Noch keine Klicks." />
      </Card>

      <Card
        title="Fast oben"
        sub="Oft gezeigt, selten geklickt: Position 4 bis 20, mindestens 30 Impressionen. Hier arbeiten Titel und Description."
      >
        <SearchRows
          rows={s.opportunities}
          empty="Nichts zwischen Position 4 und 20 mit nennenswerten Impressionen."
        />
      </Card>

      <Card
        title="Im Aufwind"
        sub="Anfragen mit den meisten zusätzlichen Klicks gegenüber der Vorperiode."
        span={2}
      >
        <MoverTable rows={s.movers.rising} empty="Nichts gestiegen." />
      </Card>

      <Card title="Im Abwind" sub="Anfragen, die gegenüber der Vorperiode Klicks verloren haben.">
        <MoverTable rows={s.movers.falling} empty="Nichts gefallen." />
      </Card>

      <p className={styles.notice}>
        Property {s.property}, geholt{' '}
        {new Date(s.fetchedAt).toLocaleString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}
        , eine Stunde gehalten. Der frischeste Tag mit Suchbegriffen steht unter „Letzter Tag“.
      </p>
    </>
  );
}

function MoverTable({ rows, empty }: { rows: SearchMover[]; empty: string }) {
  if (rows.length === 0) return <p className={styles.empty}>{empty}</p>;
  return (
    <div
      className={styles.scroll}
      tabIndex={0}
      role="region"
      aria-label="Tabelle horizontal scrollen"
    >
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Suche</th>
            <th scope="col">Klicks</th>
            <th scope="col">vorher</th>
            <th scope="col">Δ</th>
            <th scope="col">Impr.</th>
            <th scope="col">Pos.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.key}>
              <td className={styles.cellKey} title={m.key}>
                {m.key}
              </td>
              <td className={styles.cellNum}>{NUMBER.format(m.clicks)}</td>
              <td className={styles.cellNum}>{NUMBER.format(m.clicksBefore)}</td>
              <DiffCell diff={m.diff} />
              <td className={styles.cellNum}>
                {NUMBER.format(m.impressions)}
                <span className={styles.muted}> / {NUMBER.format(m.impressionsBefore)}</span>
              </td>
              <td className={styles.cellNum}>
                {position(m.position)}
                <span className={styles.muted}> / {position(m.positionBefore)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
