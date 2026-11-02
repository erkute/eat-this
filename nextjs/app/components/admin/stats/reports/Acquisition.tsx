import type { StatsSummary } from '@/lib/admin/stats.server';
import { CHANNELS } from '@/lib/analytics/channels';
import { BarRows, Card, Kpi } from '../charts';
import { NUMBER, percent } from '../format';
import styles from '../../StatsDashboard.module.css';
export default function Acquisition({ data }: { data: StatsSummary }) {
  const attributed = data.entryChannels.reduce((sum, row) => sum + row.count, 0);
  const unknown = Math.max(0, data.totals.visitors - attributed);
  const counts = new Map(data.entryChannels.map((row) => [row.key, row.count]));
  return (
    <>
      <div className={styles.kpis}>
        <Kpi label="Tagesbesucher" value={NUMBER.format(data.totals.visitors)} />
        <Kpi
          label="Mit gemessenem Kanal"
          value={NUMBER.format(attributed)}
          hint="Herkunft beim ersten Tagesaufruf"
        />
        <Kpi
          label="Kanal nicht erfasst"
          value={NUMBER.format(unknown)}
          hint="Historische Daten werden nicht geraten"
        />
      </div>
      <Card
        title="Woher die Besucher kommen"
        span={3}
        sub="Jeder Tagesbesucher bekommt beim ersten Aufruf genau einen Kanal. Mehrere interne Seitenwechsel erhöhen diese Zahlen nicht."
      >
        {attributed > 0 ? (
          <BarRows
            rows={CHANNELS.map(([key, label]) => ({
              key,
              label,
              count: counts.get(key) ?? 0,
              share:
                data.totals.visitors > 0
                  ? percent((counts.get(key) ?? 0) / data.totals.visitors)
                  : '',
            }))}
            empty="Noch keine Kanäle erfasst."
          />
        ) : (
          <p className={styles.empty}>
            Für diesen Zeitraum wurde die Herkunft der Tagesbesucher noch nicht getrennt erfasst.
            Die neue Kanalzählung beginnt mit dem Rollout.
          </p>
        )}
        {unknown > 0 && (
          <p className={styles.countWarning}>
            {NUMBER.format(unknown)} Tagesbesucher ohne gespeicherten Kanal. Das ist keine Aussage
            über direkte Besuche.
          </p>
        )}
        <p className={styles.note}>
          „Ohne externen Verweis“ kann direkte Eingabe, Lesezeichen, eine App oder eine unterdrückte
          Herkunft bedeuten. Newsletter und bezahlte Kampagnen werden nur bei passenden UTM-Medien
          erkannt. Gespeichert wird ausschließlich die feste Kategorie.
        </p>
      </Card>
      <Card
        title="Vorhandene externe Verweise"
        span={2}
        sub="Aufrufquellen aus dem bisherigen Zähler. Das sind Aufrufe, keine eindeutig zugeordneten Besucher oder Sitzungen."
      >
        <BarRows rows={data.referrers} empty="Keine externen Verweise." />
        <p className={styles.note}>
          {NUMBER.format(data.referrerPageviews)} Aufrufe mit externem Verweis. Diese Zahl wird
          nicht zur Kanalzahl addiert.
        </p>
      </Card>
      <Card
        title="Beliebteste Einstiegsseiten"
        sub="Die ersten Seiten der Tagesbesucher. Alle Seiten stehen unter Besucher & Seiten."
      >
        <BarRows rows={data.entryPaths.slice(0, 8)} empty="Keine Einstiegsseiten gespeichert." />
      </Card>
    </>
  );
}
