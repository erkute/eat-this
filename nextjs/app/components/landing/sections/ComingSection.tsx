import styles from './ComingSection.module.css'

interface Props {
  locale: 'de' | 'en'
}

const CITIES = ['Istanbul', 'Amsterdam', 'Tokyo']

export default function ComingSection({ locale }: Props) {
  const t = locale === 'de'
    ? {
        eyebrow: 'Was kommt',
        headline: 'Berlin ist erst der Anfang',
        body: 'Spot für Spot, Bezirk für Bezirk. Wenn Berlin satt ist, geht’s weiter:',
      }
    : {
        eyebrow: 'What’s next',
        headline: 'Berlin is just the beginning',
        body: 'Spot by spot, neighbourhood by neighbourhood. When Berlin’s full, we move on:',
      }

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <span className={styles.eyebrow}>{t.eyebrow}</span>
        <h2 className={styles.h2}>{t.headline}</h2>
        <p className={styles.body}>{t.body}</p>
        <ul className={styles.cities} aria-label={locale === 'de' ? 'Geplante Städte' : 'Upcoming cities'}>
          {CITIES.map((city) => (
            <li key={city} className={styles.city}>{city}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
