import type { StatsSummary } from '@/lib/admin/stats.server';
import { BarRows, Card } from '../charts';
import { NUMBER, decimal, percent } from '../format';
import styles from '../../StatsDashboard.module.css';

/**
 * Der Cookie-Dialog: wie viele Menschen zustimmen — und damit, welchen
 * Bruchteil der Wirklichkeit Google Analytics sieht. Zwei Nenner, siehe
 * StatsSummary.consent.
 */
export default function ConsentReport({ data }: { data: StatsSummary }) {
  const { consent } = data;
  if (consent.rate === null) {
    return <p className={styles.notice}>Der Dialog wurde in diesem Zeitraum nicht gezählt.</p>;
  }
  const silent = Math.max(0, consent.visitors - consent.accepted - consent.declined);

  return (
    <>
      <Card
        title="Zustimmung"
        sub={`Über ${NUMBER.format(consent.days)} Tage mit gezähltem Dialog.`}
      >
        <p className={styles.big}>{percent(consent.rate)}</p>
        <p className={styles.note}>
          der Besucher stimmen zu — {NUMBER.format(consent.accepted)} von{' '}
          {NUMBER.format(consent.visitors)}. Nur die Zustimmenden sieht Google Analytics; dieses
          Brett sieht alle.
        </p>
      </Card>

      <Card title="Antworten" span={2} sub="Besucher der Tage, die den Dialog zählen.">
        <BarRows
          rows={[
            { key: 'accepted', label: 'stimmen zu', count: consent.accepted },
            { key: 'declined', label: 'lehnen ab', count: consent.declined },
            { key: 'silent', label: 'antworten nicht', count: silent },
          ].map((row) => ({
            ...row,
            share: consent.visitors > 0 ? percent(row.count / consent.visitors, 0) : '',
          }))}
          empty="Keine Antworten."
        />
      </Card>

      <Card
        title="Einblendungen"
        span={3}
        sub="Der Dialog blockiert und erscheint bei jedem Seitenaufruf erneut, solange niemand antwortet — darum liegt die Quote je Einblendung weit unter der je Besucher."
      >
        <div className={styles.rates}>
          <div className={styles.rate}>
            <span className={styles.rateValue}>{NUMBER.format(consent.shown)}</span>
            <span className={styles.rateLabel}>Einblendungen</span>
          </div>
          <div className={styles.rate}>
            <span className={styles.rateValue}>
              {consent.viewsPerVisitor === null ? '—' : decimal(consent.viewsPerVisitor)}
            </span>
            <span className={styles.rateLabel}>Einblendungen je Besucher</span>
          </div>
          <div className={styles.rate}>
            <span className={styles.rateValue}>
              {consent.ratePerView === null ? '—' : percent(consent.ratePerView)}
            </span>
            <span className={styles.rateLabel}>Zustimmungen je Einblendung</span>
          </div>
          <div className={styles.rate}>
            <span className={styles.rateValue}>{percent(consent.rate)}</span>
            <span className={styles.rateLabel}>Zustimmungen je Besucher — die ehrliche Zahl</span>
          </div>
        </div>
      </Card>
    </>
  );
}
