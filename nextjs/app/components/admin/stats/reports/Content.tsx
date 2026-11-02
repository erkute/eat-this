import type { StatsSummary } from '@/lib/admin/stats.server';
import { Card, ExitTable, MoverList } from '../charts';
import { NUMBER } from '../format';
import { PageTable, VisitorBreakdown } from '../PageBreakdown';
import styles from '../../StatsDashboard.module.css';

/**
 * Was gesehen wird und wo Besuche enden. Ausstiege rein rechnerisch —
 * Aufrufe minus Fortsetzungen — ohne je einen Aufruf mit einer Person zu
 * verknüpfen (lib/analytics.ts, previousInternalPath).
 */
export default function Content({ data }: { data: StatsSummary }) {
  return (
    <>
      <Card
        title="Alle Besucher und Aufrufe"
        span={3}
        sub="Die Besucher verteilen sich vollständig nach ihrer ersten Seite. Rechts stehen alle Aufrufe derselben Seitenarten."
      >
        <VisitorBreakdown
          paths={data.paths}
          entryPaths={data.entryPaths}
          visitors={data.totals.visitors}
          pageviews={data.totals.pageviews}
        />
      </Card>
      <Card
        title="Jede einzelne Seite"
        span={3}
        sub="Alle gespeicherten Seiten einschließlich Startseite und Artikel. Suche und Filter ändern nur die Auswahl; unter der Tabelle steht deren vollständige Summe."
      >
        <PageTable
          paths={data.paths}
          entryPaths={data.entryPaths}
          visitors={data.totals.visitors}
          pageviews={data.totals.pageviews}
        />
      </Card>

      <Card
        title="Geschätzte Ausstiege"
        span={2}
        sub={
          data.exits.length > 0
            ? `Über ${NUMBER.format(data.exitDays)} von ${NUMBER.format(data.totals.days)} Tagen. Aufrufe minus interne Fortsetzungen; keine eindeutigen Personen. Reloads können Ausstiege überschätzen. Gezeigt werden die häufigsten Ausstiegsseiten.`
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
