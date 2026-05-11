import styles from './StatementSection.module.css'

interface Props {
  headline: string
  body: string
  kind?: 'curate' | 'why'
  locale?: 'de' | 'en'
}

const STEPS = {
  de: [
    { label: 'Erst essen, dann posten', body: 'Kein Spot landet hier, bevor wir ihn selbst probiert haben.' },
    { label: 'Nur, was überzeugt hat', body: 'Drauf kommt nur, was uns selbst überzeugt hat - sonst nichts.' },
    { label: 'Immer aktuell', body: 'Was zumacht, fliegt raus. Was neu öffnet, kommt rein.' },
  ],
  en: [
    { label: 'Eat first, post later', body: 'Nothing lands here before we’ve tried it ourselves.' },
    { label: 'Only if it convinced us', body: 'On the map only if it convinced us - nothing else.' },
    { label: 'Always current', body: 'Closes get dropped. New openings get added.' },
  ],
}

export default function StatementSection({ headline, body, kind, locale = 'de' }: Props) {
  const steps = kind === 'curate' ? STEPS[locale] : null
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.h2}>{headline.replace(/\.$/, '')}</h2>
        <p className={styles.body}>{body}</p>
        {steps && (
          <ul className={styles.steps}>
            {steps.map((s) => (
              <li key={s.label} className={styles.step}>
                <span className={styles.stepLabel}>{s.label}</span>
                <span className={styles.stepBody}>{s.body}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
