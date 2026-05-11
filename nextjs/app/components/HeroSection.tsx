import HeroPhotoSlab from './hero/HeroPhotoSlab'
import HeroPhraseSlab from './hero/HeroPhraseSlab'
import HeroCtaSlab from './hero/HeroCtaSlab'
import styles from './HeroSection.module.css'

interface Props {
  /* Used for sr-only landmarks only - the visible brand phrase and
     CTA copy is hard-coded in the slabs below. */
  headline: string
  body: string
  locale?: 'de' | 'en'
  restaurantCount: number
  categoryCount: number
}

export default function HeroSection({
  headline,
  body,
  locale = 'de',
  restaurantCount,
  categoryCount,
}: Props) {
  const eyebrow = locale === 'de'
    ? `${restaurantCount}+ Spots · ${categoryCount} Kategorien · 12+ Bezirke`
    : `${restaurantCount}+ spots · ${categoryCount} categories · 12+ neighbourhoods`
  return (
    <div className={styles.hero}>
      <span className={styles.srOnly}>{headline}</span>
      <span className={styles.srOnly}>{body}</span>
      <HeroPhotoSlab />
      {/* Editorial eyebrow strap with the live counts. Sits directly
          under the hero photo so the value claim lands before the
          "the map for people who care about food" line. */}
      <p className={styles.eyebrow}>{eyebrow}</p>
      <HeroPhraseSlab />
      <HeroCtaSlab locale={locale} />
    </div>
  )
}
