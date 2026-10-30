import type { StatsSummary } from '@/lib/admin/stats.server';
import { BarRows, Card } from '../charts';
import { NUMBER, percent } from '../format';
import styles from '../../StatsDashboard.module.css';

/** Der Cookie-Bericht zählt Antworten und Einblendungen, keine eindeutigen Personen. */
export default function ConsentReport({ data }: { data: StatsSummary }) {
  const { consent } = data;
  const answers = consent.accepted + consent.declined;
  if (consent.shown === 0 && answers === 0) {
    return <p className={styles.notice}>Der Dialog wurde in diesem Zeitraum nicht gezählt.</p>;
  }
  return (
    <>
      <Card title="Zustimmung" sub="Anteil an den gezählten Antworten im Zeitraum.">
        <p className={styles.big}>{answers > 0 ? percent(consent.accepted / answers) : '—'}</p>
        <p className={styles.note}>
          {NUMBER.format(consent.accepted)} Zustimmungen bei {NUMBER.format(answers)} Antworten.
          Wiederholte Entscheidungen zählen erneut; dies ist keine Quote eindeutiger Personen.
        </p>
      </Card>
      <Card title="Antworten" span={2} sub="Gezählte Entscheidungen im Zeitraum.">
        <BarRows
          rows={[
            { key: 'accepted', label: 'stimmen zu', count: consent.accepted },
            { key: 'declined', label: 'lehnen ab', count: consent.declined },
          ].map((row) => ({ ...row, share: answers > 0 ? percent(row.count / answers) : '' }))}
          empty="Keine Antworten."
        />
      </Card>
      <Card
        title="Einblendungen"
        span={3}
        sub="Mit gespeicherter Entscheidung erscheint der Dialog nicht erneut automatisch. Auf der Startseite wartet er auf das Intro."
      >
        <div className={styles.rates}>
          <div className={styles.rate}>
            <span className={styles.rateValue}>{NUMBER.format(consent.shown)}</span>
            <span className={styles.rateLabel}>Einblendungen</span>
          </div>
          <div className={styles.rate}>
            <span className={styles.rateValue}>
              {consent.ratePerView === null ? '—' : percent(consent.ratePerView)}
            </span>
            <span className={styles.rateLabel}>Zustimmungen je Einblendung</span>
          </div>
        </div>
        <p className={styles.note}>
          Google Analytics kann auch wiederkehrende Besucher mit früher gespeicherter Zustimmung
          erfassen. Wie viele Menschen den Dialog unbeantwortet lassen, lässt sich aus diesen Summen
          nicht bestimmen.
        </p>
      </Card>
    </>
  );
}
