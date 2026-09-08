import type { FunnelStage, PeopleFunnel, StatsSummary } from '@/lib/admin/stats.server';
import { BarRows, Card, MoverList } from '../charts';
import { NUMBER, labelFor, percent } from '../format';
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
      <Card
        title="Die Reise in vier Stufen"
        span={3}
        sub={`Ereignisse im Zeitraum, Balken und kleine Zahl je 100 Besucher (${NUMBER.format(visitors)} Besucher). Wer die Karte dreimal öffnet, zählt dreimal — der Zähler kennt keine Person.`}
      >
        <div className={styles.stages}>
          {funnel.stages.map((stage, i) => (
            <Stage key={stage.key} stage={stage} index={i + 1} visitors={visitors} />
          ))}
        </div>
      </Card>

      <Card
        title="Quoten zwischen Stufen"
        span={2}
        sub="Nur Paare, die wirklich aufeinander folgen. Eine Quote je Vorstufe für jeden Schritt gäbe es nicht: /packs feuert „Pack-Angebot gesehen“ je Pack an jeden Besucher."
      >
        <div className={styles.rates}>
          {funnel.rates.map((r) => (
            <div key={r.key} className={styles.rate}>
              <span className={styles.rateValue}>
                {r.rate === null ? '—' : percent(r.rate, r.rate < 0.1 ? 1 : 0)}
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
        title="Personen statt Ereignisse"
        sub="Aus Firestore, alle Konten seit Bestehen. Wer wie weit gekommen ist."
      >
        {accounts ? (
          <PeopleRows people={accounts.people} />
        ) : (
          <p className={styles.empty}>Konten nicht geladen.</p>
        )}
        <p className={styles.note}>
          Die Anmeldung schenkt {data.deck?.starterCards ?? 20} Karten,{' '}
          {data.deck?.starterFaceUp ?? 10} davon offen — der Rest geht vor Ort auf. Ohne Konto
          liegen {data.deck?.freeCards ?? 5} Karten offen.
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
              : NUMBER.format(Math.round(step.share * 100))}
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
