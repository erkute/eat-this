import type { FAQEntry } from '@/lib/restaurant-prose'
import styles from './RestaurantFAQ.module.css'

interface Props {
  entries: FAQEntry[]
  locale: 'de' | 'en'
}

export default function RestaurantFAQ({ entries, locale }: Props) {
  if (entries.length === 0) return null

  return (
    <section className={styles.faq} aria-label={locale === 'de' ? 'Häufige Fragen' : 'Frequently asked'}>
      <h2 className={styles.heading}>
        {locale === 'de' ? 'Häufige Fragen' : 'Frequently asked'}
      </h2>
      {entries.map(entry => (
        <details key={entry.question.slice(0, 80)} className={styles.row}>
          <summary>
            <span className={styles.q}>{entry.question}</span>
            <span className={styles.plus} aria-hidden="true" />
          </summary>
          <p className={styles.a}>{entry.answer}</p>
        </details>
      ))}
    </section>
  )
}
