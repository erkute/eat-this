import { useState } from 'react';
import { eachDay, type StatsSummary } from '@/lib/admin/stats.server';
import { dashboardFindings } from '@/lib/admin/dashboardFindings';
import type { ReportKey } from '../../StatsDashboard';
import { BarRows, Card, Kpi, LineChart } from '../charts';
import { NUMBER, decimal, shortDay, longDay } from '../format';
import styles from '../../StatsDashboard.module.css';
import TrafficQuality from './TrafficQuality';
export default function Overview({
  data,
  onOpen,
}: {
  data: StatsSummary;
  onOpen: (key: ReportKey) => void;
}) {
  const [metric, setMetric] = useState<'visitors' | 'pageviews'>('visitors');
  const search = data.search?.ok ? data.search.data : null;
  const findings = dashboardFindings(data);
  const days = eachDay(data.range.start, data.range.end);
  const singleDay = data.range.days === 1;
  const previousDay = data.previousDays.at(-1);
  const perVisitor = data.totals.visitors > 0 ? data.totals.pageviews / data.totals.visitors : 0;
  return (
    <>
      <div className={styles.kpis}>
        <Kpi
          label="Tagesbesucher"
          value={NUMBER.format(data.totals.visitors)}
          delta={data.period?.visitors}
          hint={
            data.range.days === 1
              ? 'An diesem Kalendertag'
              : 'Summe der Tageswerte; Personen zählen an mehreren Tagen erneut'
          }
          spark={data.days.map((day) => day.visitors)}
        />
        <Kpi
          label="Seitenaufrufe"
          value={NUMBER.format(data.totals.pageviews)}
          delta={data.period?.pageviews}
          hint={`${decimal(perVisitor)} je Tagesbesucher`}
          spark={data.days.map((day) => day.pageviews)}
        />
        {search && (
          <Kpi
            label="Google-Klicks"
            value={NUMBER.format(search.totals.clicks)}
            hint={`${shortDay(search.range.start)}–${shortDay(search.range.end)} · endgültige Google-Daten`}
            spark={search.days.map((day) => day.clicks)}
          />
        )}
        {data.live && (
          <Kpi
            label="Gerade aktiv"
            value={NUMBER.format(data.live.activeNow)}
            hint={`letzte ${data.live.minutes} Min · ${data.live.ga !== null ? `GA ${data.live.ga} · ` : ''}Stand ${new Date(data.live.at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`}
          />
        )}
      </div>
      <TrafficQuality data={data} compact />
      <Card
        title={singleDay ? 'Tagesvergleich' : 'Wie entwickeln sich die Besuche?'}
        span={2}
        tools={
          <select
            className={styles.select}
            aria-label="Kennzahl"
            value={metric}
            onChange={(e) => setMetric(e.target.value as 'visitors' | 'pageviews')}
          >
            <option value="visitors">Tagesbesucher</option>
            <option value="pageviews">Seitenaufrufe</option>
          </select>
        }
        sub={
          singleDay
            ? `Kein Stundenverlauf: Gespeichert werden Tageswerte. Für eine Entwicklung wähle 7 Tage oder länger.${data.range.includesToday ? ' Heute lässt sich erst nach Tagesende fair vergleichen.' : ''}`
            : `Tageswerte im gewählten Zeitraum.${data.range.includesToday ? ' Heute ist unvollständig.' : ''} Die Veränderung oben vergleicht abgeschlossene Tagesdurchschnitte.`
        }
      >
        {singleDay ? (
          <>
            <BarRows
              wrapLabels
              rows={[
                ...(previousDay
                  ? [
                      {
                        key: previousDay.day,
                        label: `${longDay(previousDay.day)} · abgeschlossen`,
                        count: previousDay[metric],
                      },
                    ]
                  : []),
                {
                  key: data.range.start,
                  label: `${longDay(data.range.start)}${data.range.includesToday ? ' · läuft noch' : ' · abgeschlossen'}`,
                  count: data.totals[metric],
                },
              ]}
              empty="Keine Tageswerte vorhanden."
            />
            {!previousDay && <p className={styles.note}>Für den Vortag fehlen Messdaten.</p>}
          </>
        ) : (
          <LineChart
            days={days}
            series={[
              {
                label: metric === 'visitors' ? 'Tagesbesucher' : 'Seitenaufrufe',
                values: days.map((day) => data.days.find((row) => row.day === day)?.[metric] ?? 0),
              },
            ]}
            openIndex={data.range.includesToday ? days.indexOf(data.range.today) : null}
          />
        )}
      </Card>
      <Card
        title="Wo kommen die Besucher rein?"
        sub="Die häufigsten ersten Seiten am Tag. Die vollständige, auf die Besucherzahl abgestimmte Aufteilung steht im Seitenbericht."
      >
        <BarRows rows={data.entryPaths.slice(0, 6)} empty="Keine Einstiegsseiten gespeichert." />
        <p className={styles.note}>
          <button
            type="button"
            className="et-btn et-btn-sm et-btn-alt"
            onClick={() => onOpen('days')}
          >
            Alle Besucher & Seiten
          </button>
        </p>
      </Card>
      <Card
        title="Das solltest du prüfen"
        span={3}
        sub="Hinweise aus den Zahlen, keine automatische Diagnose. Gezählt werden nur ausreichend große Stichproben."
      >
        {findings.length ? (
          <div className={styles.findings}>
            {findings.map((finding) => (
              <article key={finding.key}>
                <h3>{finding.title}</h3>
                <p>{finding.detail}</p>
                <button
                  type="button"
                  className="et-btn et-btn-sm et-btn-alt"
                  onClick={() => onOpen(finding.report)}
                >
                  Daten ansehen
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.note}>
            Aus den vorhandenen Daten ergibt sich gerade kein belastbarer Prüfhinweis. Kleine
            Stichproben und noch fehlende Detailmessungen lassen keine sichere Bewertung zu.
          </p>
        )}
      </Card>
      <Card
        title="Welche Google-Suche bringt Klicks?"
        span={2}
        sub={
          search
            ? `${longDay(search.range.start)}–${longDay(search.range.end)}. Suchklicks, keine eindeutigen Besucher.`
            : 'Google liefert endgültige Suchdaten zeitversetzt.'
        }
      >
        {search ? (
          <BarRows
            rows={search.queries
              .filter((row) => row.clicks > 0)
              .slice(0, 8)
              .map((row) => ({ key: row.key, count: row.clicks }))}
            empty="Keine Suchbegriffe ausgewiesen."
          />
        ) : (
          <p className={styles.empty}>Google-Suchdaten gerade nicht verfügbar.</p>
        )}
        <p className={styles.note}>
          <button
            type="button"
            className="et-btn et-btn-sm et-btn-alt"
            onClick={() => onOpen('search')}
          >
            Suchbegriffe nach Tagen & Wochen
          </button>
        </p>
      </Card>
      <Card
        title="Wo geht es nicht weiter?"
        sub="Für Artikel, Magazin und Map: Scrolltiefe, Vertiefung und Übergänge. Detaildaten stehen nur für tatsächlich gemessene Aufrufe zur Verfügung."
      >
        <p className={styles.note}>
          Artikel und Magazin haben eine Heatmap je Seite. Die Map wird über Suche, Ansicht und
          Spot-Öffnungen ausgewertet, unabhängig vom Kartenausschnitt.
        </p>
        <button
          type="button"
          className="et-btn et-btn-sm et-btn-alt"
          onClick={() => onOpen('home')}
        >
          Nutzung & Heatmaps
        </button>
      </Card>
      <Card
        title="Konten & Käufe"
        span={3}
        sub="Bestätigte Vorgänge aus Firebase, getrennt von Browser-Aktionen."
      >
        {data.accounts ? (
          <p className={styles.note}>
            {NUMBER.format(data.accounts.newInWindow)} neue Konten ·{' '}
            {NUMBER.format(data.accounts.starterPacks.inWindow)} Starter Packs ·{' '}
            {NUMBER.format(data.accounts.reveals.inWindow)} Karten aufgedeckt ·{' '}
            {NUMBER.format(data.accounts.purchases.inWindow)} Käufe im Zeitraum.
          </p>
        ) : (
          <p className={styles.note}>Konten und Kaufdaten nicht verfügbar.</p>
        )}
        <button
          type="button"
          className="et-btn et-btn-sm et-btn-alt"
          onClick={() => onOpen('cards')}
        >
          Konten, Karten & Käufe
        </button>
      </Card>
      <p className={styles.notice}>
        Tagesbesucher sind eine Näherung, keine über den Zeitraum eindeutig erkannten Menschen.
        Externe Verweise, Google-Suchklicks und GA-Nutzer haben andere Bezugsgrößen und werden nicht
        addiert. Messdefinitionen und Datenlücken stehen unter „Messung“.
      </p>
    </>
  );
}
