import type { StatsSummary } from '@/lib/admin/stats.server';
import { Card, DiffCell } from '../charts';
import { NUMBER, decimal, labelFor, percent } from '../format';
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
                // Je 100 Besucher: unter 1 mit einer Stelle, sonst gerundet —
                // „0,3" sagt mehr als „0".
                const perHundred = (e.count / visitors) * 100;
                return (
                  <tr key={e.key}>
                    <td className={styles.cellKey}>{labelFor(e.key)}</td>
                    <td className={styles.cellKey}>
                      <code className={styles.code}>{e.key}</code>
                    </td>
                    <td className={styles.cellNum}>{NUMBER.format(e.count)}</td>
                    <td className={styles.cellNum}>
                      {visitors > 0
                        ? perHundred < 1 && e.count > 0
                          ? decimal(perHundred)
                          : NUMBER.format(Math.round(perHundred))
                        : '—'}
                    </td>
                    <td className={styles.cellNum}>{total > 0 ? percent(e.count / total) : '—'}</td>
                    <DiffCell diff={mover ? mover.diff : null} />
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
