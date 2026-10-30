import type { StatsSummary } from '@/lib/admin/stats.server';
import { BarRows, Card, MoverList } from '../charts';
import { NUMBER, percent, shortDay } from '../format';
import styles from '../../StatsDashboard.module.css';

/** Seitenaufrufe nach externem Verweis und erste Einstiege pro Tagesbesucher. */
export default function Acquisition({ data }: { data: StatsSummary }) {
  const pageviews = data.totals.pageviews;
  const search = data.search?.ok ? data.search.data : null;
  const referred = data.referrerPageviews;
  const share = (count: number): string => (pageviews > 0 ? percent(count / pageviews, 0) : '');

  return (
    <>
      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Seitenaufrufe</span>
          <strong className={styles.kpiValue}>{NUMBER.format(pageviews)}</strong>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Mit externem Verweis</span>
          <strong className={styles.kpiValue}>{NUMBER.format(referred)}</strong>
          <span className={styles.kpiFoot}>
            <span className={styles.kpiHint}>{share(referred)} der Seitenaufrufe</span>
          </span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Ohne externen Verweis</span>
          <strong className={styles.kpiValue}>
            {NUMBER.format(Math.max(0, pageviews - referred))}
          </strong>
          <span className={styles.kpiFoot}>
            <span className={styles.kpiHint}>Auch interne Navigation und Reloads</span>
          </span>
        </div>
        {search && (
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Google-Klicks (GSC)</span>
            <strong className={styles.kpiValue}>{NUMBER.format(search.totals.clicks)}</strong>
            <span className={styles.kpiFoot}>
              <span className={styles.kpiHint}>
                {shortDay(search.range.start)}–{shortDay(search.range.end)} · Google-Zeitraum
              </span>
            </span>
          </div>
        )}
      </div>

      <Card
        title="Herkunft"
        span={2}
        sub="Seitenaufrufe mit externem Verweis. Mehrere Aufrufe derselben Person zählen mehrfach. Die Liste zeigt die häufigsten Quellen."
      >
        <BarRows
          rows={data.referrers.map((r) => ({ ...r, share: share(r.count) }))}
          empty="Keine externen Verweise."
          share="Anteil an den Seitenaufrufen"
        />
      </Card>

      <Card
        title="Einstiegsseiten"
        sub="Der erste gezählte Aufruf eines Besuchers am Tag — wo die Leute wirklich reinkommen."
      >
        <BarRows
          rows={data.entryPaths.map((e) => ({
            ...e,
            share: data.totals.visitors > 0 ? percent(e.count / data.totals.visitors, 0) : '',
          }))}
          empty="Noch nicht erfasst."
        />
      </Card>

      <Card title="Bewegung: Herkunft" sub="Gegen die Vorperiode, in beide Richtungen.">
        <MoverList rows={data.movers.referrers} head="Quelle" />
      </Card>

      <Card
        title="Bewegung: Seiten"
        span={2}
        sub="Welche Seiten gegenüber der Vorperiode gewonnen und verloren haben."
      >
        <MoverList rows={data.movers.paths} head="Seite" />
      </Card>
    </>
  );
}
