import type { StatsSummary } from '@/lib/admin/stats.server';
import { Card } from '../charts';
import { NUMBER, labelFor } from '../format';
import styles from '../../StatsDashboard.module.css';

/**
 * Jede gezählte Handlung — vollständig, nicht nur die Spitze: die Liste ist
 * durch die Allowlist in count/route.ts ohnehin begrenzt, und die
 * interessanten Fälle stehen unten (purchase, sign_up).
 */
export default function EventsReport({ data }: { data: StatsSummary }) {
  const visitors = data.totals.visitors;
  const beforeByKey = new Map(data.movers.events.map((m) => [m.key, m]));
  const total = data.events.reduce((t, e) => t + e.count, 0);

  return (
    <Card
      title="Ereignisse"
      span={3}
      sub={`${NUMBER.format(total)} Ereignisse von ${NUMBER.format(visitors)} Besuchern. Differenz gegen die Vorperiode nur, wo sich etwas bewegt hat.`}
    >
      {data.events.length === 0 ? (
        <p className={styles.empty}>Keine Ereignisse gezählt.</p>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Ereignis</th>
                <th scope="col">Schlüssel</th>
                <th scope="col">Anzahl</th>
                <th scope="col">je 100 Besucher</th>
                <th scope="col">Anteil</th>
                <th scope="col">Δ Vorperiode</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((e) => {
                const mover = beforeByKey.get(e.key);
                return (
                  <tr key={e.key}>
                    <td className={styles.cellKey}>{labelFor(e.key)}</td>
                    <td className={styles.cellKey}>
                      <code className={styles.code}>{e.key}</code>
                    </td>
                    <td className={styles.cellNum}>{NUMBER.format(e.count)}</td>
                    <td className={styles.cellNum}>
                      {visitors > 0
                        ? (e.count / visitors) * 100 < 1 && e.count > 0
                          ? ((e.count / visitors) * 100).toFixed(1).replace('.', ',')
                          : NUMBER.format(Math.round((e.count / visitors) * 100))
                        : '—'}
                    </td>
                    <td className={styles.cellNum}>
                      {total > 0
                        ? `${((e.count / total) * 100).toFixed(1).replace('.', ',')} %`
                        : '—'}
                    </td>
                    <td
                      className={
                        mover ? (mover.diff > 0 ? styles.cellPos : styles.cellNeg) : styles.cellNum
                      }
                    >
                      {mover
                        ? `${mover.diff > 0 ? '+' : '−'}${NUMBER.format(Math.abs(mover.diff))}`
                        : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
