import styles from './TrustBar.module.css'

interface Props {
  restaurantCount: number
  categoryCount: number
  locale: 'de' | 'en'
}

export default function TrustBar({ restaurantCount, categoryCount, locale }: Props) {
  const t = locale === 'de'
    ? { restaurants: 'Restaurants, Bars & Cafés', categories: 'Kategorien', district: 'Bezirke' }
    : { restaurants: 'Restaurants, bars & cafés', categories: 'Categories', district: 'Districts' }

  return (
    <aside className={styles.bar} aria-label="Site quick-facts">
      <div className={styles.row}>
        <Stat value={`${restaurantCount}+`} label={t.restaurants} />
        <span className={styles.divider} aria-hidden="true" />
        <Stat value={String(categoryCount)} label={t.categories} />
        <span className={styles.divider} aria-hidden="true" />
        <Stat value="12+" label={t.district} />
      </div>
    </aside>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.value}>{value}</span>
      <span className={styles.label}>{label}</span>
    </div>
  )
}
