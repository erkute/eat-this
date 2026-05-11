import styles from './ReasonsSection.module.css'

interface Props {
  locale: 'de' | 'en'
  /** Live restaurant count from Sanity. Interpolated into the first
   *  reason title so the headline stays in sync with the dataset. */
  restaurantCount: number
}

const REASONS = {
  de: [
    {
      title: '{count}+ Spots',
      body: 'Restaurants, Cafés und Bars in ganz Berlin. Jeden Spot haben wir selbst probiert.',
    },
    {
      title: 'Map first',
      body: 'Alle Spots auf einer Map. Mit Filter für Bezirk, Kategorie und „in deiner Nähe".',
    },
    {
      title: 'Must Eats',
      body: 'Für einige Spots eine verdeckte Gericht-Empfehlung. Vor Ort aufgedeckt - landet direkt in deinem Deck.',
    },
    {
      title: 'Made in Berlin',
      body: 'Kuratiert von Berlinern, die Essen ernst nehmen.',
    },
  ],
  en: [
    {
      title: '{count}+ spots',
      body: 'Restaurants, cafés and bars across Berlin. Every spot we’ve been to ourselves.',
    },
    {
      title: 'Map first',
      body: 'Every spot on one map. Filter by neighbourhood, category or “near me”.',
    },
    {
      title: 'Must Eats',
      body: 'Selected spots come with a hidden dish pick. Reveal it on site - lands in your deck for good.',
    },
    {
      title: 'Made in Berlin',
      body: 'Curated by Berliners who take food seriously.',
    },
  ],
}

export default function ReasonsSection({ locale, restaurantCount }: Props) {
  const items = (locale === 'de' ? REASONS.de : REASONS.en).map((r) => ({
    ...r,
    title: r.title.replace('{count}', String(restaurantCount)),
  }))
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <span className={styles.eyebrow}>
            {locale === 'de' ? 'Warum Eat This?' : 'Why Eat This?'}
          </span>
          <h2 className={styles.h2}>
            {locale === 'de' ? 'Mehr Gründe für Eat This' : 'More reasons for Eat This'}
          </h2>
        </div>
        <ul className={styles.grid}>
          {items.map((r, i) => (
            <li key={i} className={styles.card}>
              <span className={styles.number}>{String(i + 1).padStart(2, '0')}</span>
              <h3 className={styles.cardTitle}>{r.title}</h3>
              <p className={styles.cardBody}>{r.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
