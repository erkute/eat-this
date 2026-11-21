import type { StatsSummary } from '@/lib/admin/stats.server';
import {
  VITAL_METRICS,
  VITAL_PAGE_LABELS,
  VITAL_SCALES,
  vitalRating,
  type VitalMetric,
  type VitalStat,
} from '@/lib/analytics/webVitals';
import { Card } from '../charts';
import { NUMBER, longDay } from '../format';
import styles from '../../StatsDashboard.module.css';

const METRIC_LABELS: Record<VitalMetric, { title: string; hint: string }> = {
  LCP: { title: 'LCP', hint: 'bis der größte Inhalt sichtbar ist' },
  INP: { title: 'INP', hint: 'Reaktion auf Tippen und Klicken' },
  CLS: { title: 'CLS', hint: 'wie stark der Inhalt springt' },
};

const SECONDS = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const SHIFT = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatValue(metric: VitalMetric, value: number): string {
  if (metric === 'LCP') return `${SECONDS.format(value / 1000)} s`;
  if (metric === 'INP') return `${NUMBER.format(value)} ms`;
  return SHIFT.format(value);
}

/** Bewertung als Wort, die Farbe der Pille nur als Beigabe. */
const RATING = {
  good: { label: 'gut', className: styles.pill },
  mid: { label: 'mittel', className: styles.pillYellow },
  poor: { label: 'schlecht', className: styles.pillRed },
} as const;

/** Unter so vielen Messungen sagt ein P75 wenig; die Zeile bleibt, aber markiert. */
const FEW = 20;

function MetricCell({ metric, stat }: { metric: VitalMetric; stat: VitalStat }) {
  if (stat.p75 === null || stat.median === null) return <td className={styles.muted}>–</td>;
  const rating = RATING[vitalRating(metric, stat.p75)];
  return (
    <td>
      <span className={styles.cellNum}>{formatValue(metric, stat.p75)}</span>{' '}
      <span className={rating.className}>{rating.label}</span>
      <br />
      <span className={styles.muted}>
        Median {formatValue(metric, stat.median)} · {NUMBER.format(stat.count)} Messungen
      </span>
    </td>
  );
}

export default function Vitals({ data }: { data: StatsSummary }) {
  const { rows, since } = data.vitals;
  return (
    <>
      <Card
        title="Ladezeiten echter Besucher"
        span={3}
        sub="P75 heißt: drei von vier Seitenaufrufen waren so schnell oder schneller. Google bewertet eine Seite nach diesem Wert. Gemessen wird beim ersten Aufruf eines Dokuments, Seitenwechsel in der App zählen bei INP und CLS mit."
      >
        {rows.length === 0 ? (
          <p className={styles.note}>
            Noch keine Messwerte im gewählten Zeitraum. Sie kommen mit dem nächsten Besuch.
          </p>
        ) : (
          <div
            className={styles.scroll}
            role="region"
            aria-label="Ladezeiten nach Seitentyp und Gerät"
            tabIndex={0}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Seite</th>
                  {VITAL_METRICS.map((metric) => (
                    <th scope="col" key={metric}>
                      {METRIC_LABELS[metric].title} (P75)
                      <br />
                      <span className={styles.muted}>{METRIC_LABELS[metric].hint}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const few = Math.max(...VITAL_METRICS.map((m) => row.metrics[m].count)) < FEW;
                  return (
                    <tr key={`${row.page}-${row.device}`}>
                      <th scope="row">
                        {VITAL_PAGE_LABELS[row.page]} ·{' '}
                        {row.device === 'phone' ? 'Telefon' : 'Desktop'}
                        {few && (
                          <>
                            <br />
                            <span className={styles.muted}>wenige Messungen</span>
                          </>
                        )}
                      </th>
                      {VITAL_METRICS.map((metric) => (
                        <MetricCell key={metric} metric={metric} stat={row.metrics[metric]} />
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card title="So wird gemessen" span={2}>
        <p className={styles.note}>
          Der Browser meldet die drei Werte selbst; der eigene Zähler speichert nur, in welche Stufe
          ein Wert fiel, je Tag, Seitentyp und Gerät. Kein Pfad, kein Bezug zu einer Person. Die
          Werte sind auf die Stufe aufgerundet: LCP auf{' '}
          {SECONDS.format(VITAL_SCALES.LCP.step / 1000)} s, INP auf {VITAL_SCALES.INP.step} ms, CLS
          auf {SHIFT.format(VITAL_SCALES.CLS.step)}. Ziele nach Google: LCP bis 2,5 s, INP bis 200
          ms, CLS bis 0,10.
          {since ? ` Messwerte ab ${longDay(since)}.` : ''}
        </p>
      </Card>
    </>
  );
}
