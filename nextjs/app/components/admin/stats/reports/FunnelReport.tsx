import type { FunnelStage, PeopleFunnel, StatsSummary } from '@/lib/admin/stats.server';
import { BarRows, Card, MoverList, Kpi } from '../charts';
import { NUMBER, labelFor, percent, decimal } from '../format';
import styles from '../../StatsDashboard.module.css';

/**
 * Der Trichter des Produkts in vier Stufen — frei, Konto, vor Ort, Pack.
 * Ereignisse je Besucher; die Personen-Sicht aus Firestore steht darunter.
 */
export default function FunnelReport({ data }: { data: StatsSummary }) {
  const { funnel, accounts } = data;
  const visitors = data.totals.visitors;

  return (
    <>
      <div className={styles.kpis}>
        <Kpi label="Tagesbesucher" value={NUMBER.format(visitors)} hint="Summe im Zeitraum" />
        <Kpi
          label="Neue Konten"
          value={accounts ? NUMBER.format(accounts.newInWindow) : '—'}
          hint="aus der Kontenverwaltung"
        />
        <Kpi
          label="Karten aufgedeckt"
          value={accounts ? NUMBER.format(accounts.reveals.inWindow) : '—'}
          hint="vor Ort, im Zeitraum"
        />
        <Kpi
          label="Bezahlte Packs"
          value={accounts ? NUMBER.format(accounts.purchases.inWindow) : '—'}
          hint="bestätigte Käufe im Zeitraum"
        />
      </div>
      <Card
        title="Entdecken und sammeln"
        span={3}
        sub="Vier Bereiche des Produkts. Vor Ort aufdecken und Booster Packs kaufen sind alternative Wege. Ereignisse zählen wiederholte Handlungen; sie bilden keine durchgehende Personenreise ab."
      >
        <div className={styles.stages}>
          {funnel.stages.map((stage, i) => (
            <Stage key={stage.key} stage={stage} index={i + 1} visitors={visitors} />
          ))}
        </div>
      </Card>

      <Card
        title="Verhältnisse zwischen Ereignissen"
        span={2}
        sub="Je 100 Ereignisse der Ausgangsstufe. Keine Nutzer-Conversion: Wiederholungen und verschiedene Einstiege können Werte über 100 ergeben."
      >
        <div className={styles.rates}>
          {funnel.rates.map((r) => (
            <div key={r.key} className={styles.rate}>
              <span className={styles.rateValue}>
                {r.rate === null ? '—' : decimal(r.rate * 100, 1)}
              </span>
              <span className={styles.rateLabel}>
                {labelFor(r.from)} → {labelFor(r.to)}
                <br />
                <span className={styles.muted}>
                  {NUMBER.format(r.now)} von {NUMBER.format(r.base)}
                </span>
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="Konten seit Bestehen"
        sub="Eindeutige Konten, unabhängig vom gewählten Zeitraum. Die Gruppen überschneiden sich."
      >
        {accounts ? (
          <PeopleRows people={accounts.people} />
        ) : (
          <p className={styles.empty}>Konten nicht geladen.</p>
        )}
        <p className={styles.note}>
          Das Starter Pack enthält bis zu {data.deck?.starterCards ?? 20} Karten. Öffentlich
          sichtbare Karten und die persönliche Sammlung können sich überschneiden.
        </p>
      </Card>

      <Card
        title="Bewegung zur Vorperiode"
        span={3}
        sub="Welche Ereignisse gegenüber der gleich langen Periode davor am stärksten zu- oder abgenommen haben."
      >
        <MoverList rows={data.movers.events} head="Ereignis" label={labelFor} />
      </Card>
    </>
  );
}

function Stage({
  stage,
  index,
  visitors,
}: {
  stage: FunnelStage;
  index: number;
  visitors: number;
}) {
  return (
    <div className={styles.stage}>
      <div className={styles.stageHead}>
        <span className={styles.stageNo} aria-hidden="true">
          {index}
        </span>
        <div>
          <h3 className={styles.stageTitle}>{stage.title}</h3>
          <p className={styles.stageOffer}>{stage.offer}</p>
        </div>
      </div>
      <p className={styles.stageColumns}>Ereignis · Anzahl · je 100 Tagesbesucher</p>
      {stage.steps.map((step) => (
        <div key={step.key} className={styles.step}>
          <span className={styles.stepLabel} title={labelFor(step.key)}>
            {labelFor(step.key)}
          </span>
          <span className={styles.stepBarWrap}>
            <span
              className={step.count === 0 ? styles.stepBarEmpty : styles.stepBar}
              style={{ width: `${Math.min(1, step.share) * 100}%` }}
            />
          </span>
          <span className={styles.stepValue}>{NUMBER.format(step.count)}</span>
          <span className={styles.stepShare} title="je 100 Besucher">
            {step.key === 'visitors' || visitors === 0
              ? ''
              : decimal(step.share * 100, step.share > 0 && step.share < 0.01 ? 1 : 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

function PeopleRows({ people }: { people: PeopleFunnel }) {
  const share = (count: number): string =>
    people.accounts > 0 ? percent(count / people.accounts, 0) : '';
  return (
    <BarRows
      rows={[
        { key: 'accounts', label: 'Konten', count: people.accounts },
        { key: 'starter', label: 'mit Starter Pack', count: people.withStarterPack },
        { key: 'reveal', label: 'haben vor Ort aufgedeckt', count: people.withReveal },
        { key: 'referral', label: 'haben eingeladen', count: people.withReferral },
        { key: 'buyers', label: 'haben gekauft', count: people.buyers },
      ].map((row) => ({ ...row, share: share(row.count) }))}
      empty="Keine Konten."
      share="Anteil an allen Konten"
    />
  );
}
