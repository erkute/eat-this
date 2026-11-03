import type { StatsSummary } from '@/lib/admin/stats.server';
import { Card } from '../charts';
import { NUMBER, longDay } from '../format';
import styles from '../../StatsDashboard.module.css';

/** Quellen bleiben getrennt: Keine Differenz wird als Botzahl ausgegeben. */
export default function TrafficQuality({
  data,
  compact = false,
}: {
  data: StatsSummary;
  compact?: boolean;
}) {
  const search = data.search?.ok ? data.search.data : null;
  const ga = data.ga?.ok ? data.ga : null;
  if (compact)
    return (
      <p className={styles.notice}>
        Datenbasis: Tagesbesucher sind geschätzte Browser, keine verifizierten Menschen.{' '}
        {ga
          ? `GA erfasst ${NUMBER.format(ga.users)} aktive Nutzer mit Einwilligung im Zeitraum.`
          : 'GA-Daten sind gerade nicht verfügbar.'}{' '}
        Botanteil unbekannt. Quellenvergleich unter „Messung“.
      </p>
    );
  return (
    <Card
      title="Wie belastbar sind die Besucherzahlen?"
      span={3}
      sub="Gezählte Browser sind keine verifizierten Menschen. Erkannte Bots und ausgeschlossene Tests fehlen im Zähler; unerkannte Automatisierung kann enthalten sein."
    >
      <p className={styles.note}>
        {NUMBER.format(data.totals.visitors)} Tagesbesucher im eigenen Zähler ·{' '}
        {ga ? `${NUMBER.format(ga.users)} aktive GA-Nutzer mit Einwilligung` : 'GA nicht verfügbar'}{' '}
        ·{' '}
        {search
          ? `${NUMBER.format(search.totals.clicks)} Google-Suchklicks (${longDay(search.range.start)}–${longDay(search.range.end)})`
          : 'Google-Suche nicht verfügbar'}
        . Die Quellen haben unterschiedliche Zählweisen. Ihre Differenz ist keine Botzahl.
        Historische Zähler können ungefilterte Suchcrawler enthalten; neue Filter bereinigen alte
        Werte nicht rückwirkend.
      </p>
      <div
        className={styles.scroll}
        role="region"
        tabIndex={0}
        aria-label="Quellenvergleich je Kalendertag"
      >
        <table className={styles.table}>
          <caption>
            {data.days.length > 14 ? 'Die 14 jüngsten Tage im Zeitraum. ' : ''}Kalendertage aus den
            jeweiligen Quellen; Google-Suche hat eine eigene Tagesgrenze und kommt verzögert.
          </caption>
          <thead>
            <tr>
              <th scope="col">Tag</th>
              <th scope="col">Tagesbesucher</th>
              <th scope="col">Aufrufe</th>
              <th scope="col">GA-Nutzer</th>
              <th scope="col">Suchklicks</th>
            </tr>
          </thead>
          <tbody>
            {data.days
              .slice(-14)
              .reverse()
              .map((day) => {
                const gaDay = ga?.days.find((row) => row.day === day.day);
                const searchDay = search?.days.find((row) => row.day === day.day);
                return (
                  <tr key={day.day}>
                    <th scope="row">
                      {longDay(day.day)}
                      {day.day === data.range.today ? ' · läuft noch' : ''}
                    </th>
                    <td className={styles.cellNum}>{NUMBER.format(day.visitors)}</td>
                    <td className={styles.cellNum}>{NUMBER.format(day.pageviews)}</td>
                    <td className={styles.cellNum}>{gaDay ? NUMBER.format(gaDay.users) : '—'}</td>
                    <td className={styles.cellNum}>
                      {searchDay ? NUMBER.format(searchDay.clicks) : '—'}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      <p className={styles.note}>
        {
          '— bedeutet: kein Tageswert geliefert. Ein Anstieg nur im eigenen Zähler ist noch kein belegtes Nutzerwachstum. Für eine Botzuordnung braucht es zusätzliche Requestlogs; die aggregierten Zähler speichern keine Browserkennung und keine IP-Adresse.'
        }
      </p>
    </Card>
  );
}
