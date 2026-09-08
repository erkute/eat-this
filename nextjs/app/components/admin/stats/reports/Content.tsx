import type { StatsSummary } from '@/lib/admin/stats.server';
import { BarRows, Card, ExitTable, MoverList } from '../charts';
import { NUMBER, percent } from '../format';
import styles from '../../StatsDashboard.module.css';

/**
 * Was gesehen wird und wo Besuche enden. Ausstiege rein rechnerisch —
 * Aufrufe minus Fortsetzungen — ohne je einen Aufruf mit einer Person zu
 * verknüpfen (lib/analytics.ts, previousInternalPath).
 */
export default function Content({ data }: { data: StatsSummary }) {
  const pageviews = data.totals.pageviews;
  const share = (count: number): string => (pageviews > 0 ? percent(count / pageviews, 0) : '');

  return (
    <>
      <Card title="Meistgesehen" span={2} sub="Aufrufe je Seite, Anteil an allen Aufrufen.">
        <BarRows
          rows={data.paths.map((p) => ({ ...p, share: share(p.count) }))}
          empty="Nichts gezählt."
          share="Anteil an den Aufrufen"
        />
      </Card>

      <Card title="Einstiegsseiten" sub="Der erste gezählte Aufruf eines Besuchers am Tag.">
        <BarRows rows={data.entryPaths} empty="Noch nicht erfasst." />
      </Card>

      <Card
        title="Wo Besuche enden"
        span={2}
        sub={
          data.exits.length > 0
            ? `Über ${NUMBER.format(data.exitDays)} von ${NUMBER.format(data.totals.days)} Tagen. Ein Reload zählt nicht als Fortsetzung — Ausstiege sind eher über- als unterschätzt.`
            : 'Ausstiege gibt es erst für Tage ab dem 29.08.2026.'
        }
      >
        {data.exits.length === 0 ? (
          <p className={styles.empty}>Für diesen Zeitraum nicht erfasst.</p>
        ) : (
          <ExitTable rows={data.exits} />
        )}
      </Card>

      <Card title="Bewegung: Seiten" sub="Gegen die Vorperiode, in beide Richtungen.">
        <MoverList rows={data.movers.paths} head="Seite" />
      </Card>
    </>
  );
}
