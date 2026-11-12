import type { StatsSummary } from '@/lib/admin/stats.server';
import { Card, Kpi } from '../charts';
import { NUMBER, longDay } from '../format';
import styles from '../../StatsDashboard.module.css';
import TrafficQuality from './TrafficQuality';

export default function Measurement({ data }: { data: StatsSummary }) {
  const measured = data.measurement.filter((day) => day.recorded);
  const matching = measured.filter(
    (day) => day.visitors === day.entries && day.pageviews === day.views
  );
  const overflow = measured.filter((day) => day.overflow > 0);
  return (
    <>
      <TrafficQuality data={data} />
      <div className={styles.kpis}>
        <Kpi
          label="Tage mit Messdaten"
          value={NUMBER.format(measured.length)}
          hint={`von ${NUMBER.format(data.range.days)} Kalendertagen`}
        />
        <Kpi
          label="Summen stimmen überein"
          value={NUMBER.format(matching.length)}
          hint={`von ${NUMBER.format(measured.length)} gemessenen Tagen`}
        />
        <Kpi
          label="Tage mit Sammelzähler"
          value={NUMBER.format(overflow.length)}
          hint="Weitere Seiten statt einzelner URLs"
        />
      </div>
      <Card
        title="Abgleich für jeden Tag"
        span={3}
        sub="Besucher müssen der Summe aller Einstiege entsprechen. Seitenaufrufe müssen der Summe aller Seiten entsprechen. Der Abgleich prüft die gespeicherten Zähler, keine einzelnen Menschen."
      >
        <div
          className={styles.scroll}
          role="region"
          aria-label="Täglicher Zahlenabgleich"
          tabIndex={0}
        >
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Tag</th>
                <th scope="col">Besucher</th>
                <th scope="col">Einstiege</th>
                <th scope="col">Aufrufe</th>
                <th scope="col">Seitensumme</th>
                <th scope="col">Ergebnis</th>
              </tr>
            </thead>
            <tbody>
              {[...data.measurement].reverse().map((day) => (
                <tr key={day.day}>
                  <th scope="row">{longDay(day.day)}</th>
                  <td className={styles.cellNum}>{NUMBER.format(day.visitors)}</td>
                  <td className={styles.cellNum}>{NUMBER.format(day.entries)}</td>
                  <td className={styles.cellNum}>{NUMBER.format(day.pageviews)}</td>
                  <td className={styles.cellNum}>{NUMBER.format(day.views)}</td>
                  <td>
                    {!day.recorded
                      ? 'Keine Messdaten'
                      : day.visitors !== day.entries || day.pageviews !== day.views
                        ? 'Abweichung prüfen'
                        : day.overflow > 0
                          ? 'Summen stimmen · Sammelzähler enthalten'
                          : 'Summen stimmen'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="So werden Besucher gezählt" span={2}>
        <p className={styles.note}>
          Der erste gezählte Seitenaufruf erhöht Besucher und Einstiegsseite gemeinsam. Weitere
          Aufrufe erhöhen nur die Seitenaufrufe. Die Tagesgrenze liegt um Mitternacht in Berlin.
        </p>
        <p className={styles.note}>
          Der Zähler erkennt eine Kombination aus IP-Adresse und Browserkennung am selben Tag
          wieder. Das ist eine Näherung: Ein Netzwechsel kann dieselbe Person erneut zählen;
          Menschen mit gleicher Kombination können zusammenfallen. Über mehrere Tage wird dieselbe
          Person erneut gezählt.
        </p>
        <p className={styles.note}>
          Do Not Track, Global Privacy Control, ausgeschlossene Browser und Betreiber-Netze sowie
          erkannte Bots werden dagegen ausgeschlossen. Lokale Vorschauen zählen nicht.
        </p>
      </Card>
      <Card title="Was sich daraus ablesen lässt">
        <p className={styles.note}>
          Startseite, Map, Spot-Seiten, Artikel, Magazin, Bezirke, Kategorien, Must Eats, Packs,
          Profil, geteilte Sammelalben, Infoseiten und Kaufbestätigung werden in DE und EN erfasst.
          Die Seitenliste zeigt jede gespeicherte URL, auch bei nur einem Aufruf.
        </p>
        <p className={styles.note}>
          Admin, Vorschauartikel und die Seite zum Zählausschluss gehören nicht zum gemessenen
          Angebot. Geteilte Sammelalben werden ohne Konto-Kennung zusammengefasst. Bei sehr vielen
          URLs fasst ein Sammelzähler weitere Seiten zusammen.
        </p>
      </Card>
      <Card title="Grenzen der Zahlen" span={3}>
        <p className={styles.note}>
          Historische Zählerstände sind nicht durchgehend vergleichbar: bis 02.09.2026 wurden
          bestimmte Bots, bis 04.09.2026 eigene Lighthouse-Tests mitgezählt.
        </p>
        <p className={styles.note}>
          Wie viele Menschen ausschließlich die Startseite gesehen haben, lässt sich rückwirkend
          nicht exakt bestimmen. Sichtbar sind ihre Einstiege und sämtliche Aufrufe. Es gibt keine
          gespeicherte Verbindung zwischen einer Person und ihren besuchten Seiten.
        </p>
        <p className={styles.note}>
          Aktionen sind einzelne Ereignisse und können sich überschneiden oder wiederholen. Ein
          Spot-Detail in der Map ist eine Aktion; eine eigene Spot-Seite ist ein Seitenaufruf.
          Summengleichheit beweist weder vollständige Zustellung aller Browser-Anfragen noch die
          Erkennung aller Bots.
        </p>
        <p className={styles.note}>
          Ausstiege sind aus Aufrufen minus internen Fortsetzungen geschätzt. Reloads und
          Tagesgrenzen können das Ergebnis verzerren. Käufe und Konten kommen aus Firebase;
          angezeigte Geldbeträge sind Katalogwerte, keine geprüften Stripe-Zahlungseingänge. Die
          Google-Suche hat eigene Zeiträume und Zählweisen.
        </p>
      </Card>
    </>
  );
}
