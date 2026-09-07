import type { Mover, StatsSummary } from '@/lib/admin/stats.server';
import { BarRows, Card } from '../charts';
import { NUMBER, percent } from '../format';
import styles from '../../StatsDashboard.module.css';

/**
 * Woher die Besucher kommen. Der Zähler kennt nur den Host des Verweises,
 * einmal je Besuch — und die Einstiegsseite, den ersten gezählten Aufruf.
 * Die Google-Suche selbst steht im eigenen Bericht; hier steht, wie sie sich
 * gegen die anderen Quellen ausnimmt.
 */
export default function Acquisition({ data }: { data: StatsSummary }) {
  const visitors = data.totals.visitors;
  const search = data.search?.ok ? data.search.data : null;
  const referred = data.referrers.reduce((t, r) => t + r.count, 0);
  const share = (count: number): string => (visitors > 0 ? percent(count / visitors, 0) : '');

  return (
    <>
      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Besucher</span>
          <strong className={styles.kpiValue}>{NUMBER.format(visitors)}</strong>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Mit externem Verweis</span>
          <strong className={styles.kpiValue}>{NUMBER.format(referred)}</strong>
          <span className={styles.kpiFoot}>
            <span className={styles.kpiHint}>{share(referred)} der Besucher</span>
          </span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Direkt oder ohne Verweis</span>
          <strong className={styles.kpiValue}>
            {NUMBER.format(Math.max(0, visitors - referred))}
          </strong>
          <span className={styles.kpiFoot}>
            <span className={styles.kpiHint}>Lesezeichen, Apps, Messenger</span>
          </span>
        </div>
        {search && (
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Google-Klicks (GSC)</span>
            <strong className={styles.kpiValue}>{NUMBER.format(search.totals.clicks)}</strong>
            <span className={styles.kpiFoot}>
              <span className={styles.kpiHint}>Referenz für die Suche</span>
            </span>
          </div>
        )}
      </div>

      <Card
        title="Herkunft"
        span={2}
        sub="Externe Verweise, der Host einmal je Besuch. Die eigene Domain und localhost zählen nicht."
      >
        <BarRows
          rows={data.referrers.map((r) => ({ ...r, share: share(r.count) }))}
          empty="Keine externen Verweise."
          share="Anteil an den Besuchern"
        />
      </Card>

      <Card
        title="Einstiegsseiten"
        sub="Der erste gezählte Aufruf eines Besuchers am Tag — wo die Leute wirklich reinkommen."
      >
        <BarRows
          rows={data.entryPaths.map((e) => ({ ...e, share: share(e.count) }))}
          empty="Noch nicht erfasst."
        />
      </Card>

      <Card title="Bewegung: Herkunft" sub="Gegen die Vorperiode, in beide Richtungen.">
        <MoverList rows={data.movers.referrers} />
      </Card>

      <Card
        title="Bewegung: Seiten"
        span={2}
        sub="Welche Seiten gegenüber der Vorperiode gewonnen und verloren haben."
      >
        <MoverList rows={data.movers.paths} />
      </Card>
    </>
  );
}

export function MoverList({ rows }: { rows: Mover[] }) {
  if (rows.length === 0) return <p className={styles.empty}>Keine Vorperiode im Zeitraum.</p>;
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Quelle</th>
            <th scope="col">Vorher</th>
            <th scope="col">Jetzt</th>
            <th scope="col">Differenz</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.key}>
              <td className={styles.cellKey} title={m.key}>
                {m.key}
              </td>
              <td className={styles.cellNum}>{NUMBER.format(m.before)}</td>
              <td className={styles.cellNum}>{NUMBER.format(m.now)}</td>
              <td className={m.diff > 0 ? styles.cellPos : styles.cellNeg}>
                {m.diff > 0 ? '+' : '−'}
                {NUMBER.format(Math.abs(m.diff))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
