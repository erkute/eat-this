import type { ReactNode } from 'react'
import type { TickerRestaurant } from '@/lib/sanity.server'
import styles from './RestaurantTicker.module.css'

interface Props {
  items: TickerRestaurant[]
  locale: 'de' | 'en'
  // Optional slot rendered between the claim headline and the actual
  // ticker board — used to drop the hero bullets directly under
  // "Wahrscheinlich der beste Foodguide" and above the marquee.
  underClaim?: ReactNode
}

export default function RestaurantTicker({ items, locale, underClaim }: Props) {
  if (items.length === 0) return null

  // Duplicate the list once so the CSS marquee can loop seamlessly. The
  // second copy is aria-hidden so screen readers don't double-announce.
  const label = locale === 'de' ? 'Aktuelle Restaurants' : 'Current restaurants'
  const claim = locale === 'de'
    ? 'Wahrscheinlich der beste Foodguide, den du kennst'
    : 'Probably the best food guide you know'

  return (
    <section className={styles.section} aria-label={label}>
      <h2 className={styles.claim}>{claim}</h2>
      {underClaim}
      <div className={styles.boardFrame}>
        <div className={styles.viewport}>
          <ul className={styles.track}>
            {items.map((r) => (
              <li key={r._id} className={styles.item}>{r.name}</li>
            ))}
          </ul>
          <ul className={styles.track} aria-hidden="true">
            {items.map((r) => (
              <li key={`dup-${r._id}`} className={styles.item}>{r.name}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
