import type { StatsSummary } from '@/lib/admin/stats.server';
import type { SearchMover } from '@/lib/admin/searchConsole';
import { BarRows, Card, Kpi, LineChart } from '../charts';
import { DEVICE_LABELS, NUMBER, change, countryName, percent, position, shortDay } from '../format';
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
  const days = s.days.map((d) => d.day);

  return (
    <>
      <div className={styles.kpis}>
        <Kpi
          label="Klicks"
          value={NUMBER.format(totals.clicks)}
          delta={before ? change(totals.clicks, before.clicks) : null}
          spark={s.days.map((d) => d.clicks)}
        />
        <Kpi
          label="Impressionen"
          value={NUMBER.format(totals.impressions)}
          delta={before ? change(totals.impressions, before.impressions) : null}
          spark={s.days.map((d) => d.impressions)}
        />
        <Kpi
          label="Klickrate"
          value={percent(totals.ctr)}
          delta={before ? change(totals.ctr, before.ctr) : null}
          hint={before ? `vorher ${percent(before.ctr)}` : undefined}
        />
        <Kpi
          label="Position"
          value={position(totals.position)}
          delta={before ? change(totals.position, before.position) : null}
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
        sub={`${shortDay(s.range.start)} bis ${shortDay(s.range.end)}, Pfeile an den Kacheln gegen die ${NUMBER.format(s.range.days)} Tage davor. Die letzten zwei bis drei Tage liefert Google nachträglich.`}
      >
        <LineChart
          days={days}
          series={[{ label: 'Klicks', values: s.days.map((d) => d.clicks) }]}
        />
      </Card>

      <Card
        title="Impressionen und Position"
        sub="Wie oft Google die Seite zeigt — und wie weit oben."
      >
        <LineChart
          days={days}
          height={150}
          series={[{ label: 'Impressionen', values: s.days.map((d) => d.impressions) }]}
        />
        <LineChart
          days={days}
          height={120}
          series={[{ label: 'Position (gewichtet)', values: s.days.map((d) => d.position) }]}
          format={(v) => position(v)}
        />
      </Card>

      <Card title="Welche Suche funktioniert" span={2} sub="Anfragen nach Klicks.">
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
        <h3 className={styles.subTitle} style={{ marginTop: 18 }}>
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
        , eine Stunde gehalten. Der frischeste Tag mit Suchbegriffen steht unter „Heute &amp;
        Gestern“.
      </p>
    </>
  );
}

function MoverTable({ rows, empty }: { rows: SearchMover[]; empty: string }) {
  if (rows.length === 0) return <p className={styles.empty}>{empty}</p>;
  return (
    <div className={styles.scroll}>
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
              <td className={m.diff > 0 ? styles.cellPos : styles.cellNeg}>
                {m.diff > 0 ? '+' : '−'}
                {NUMBER.format(Math.abs(m.diff))}
              </td>
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
