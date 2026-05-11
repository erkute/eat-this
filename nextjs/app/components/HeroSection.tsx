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
      {/* The hero photo fills the whole first viewport (100svh on mobile
          and desktop) so the hand-and-plate composition is uncropped.
          The scroll hint sits inside the photo so it reads against the
          image; the eyebrow stats + brand phrase pair sit below the
          fold — one swipe revealsthem together as eyebrow + headline. */}
      <HeroPhotoSlab />
      <p className={styles.eyebrow}>{eyebrow}</p>
      <HeroPhraseSlab />
      <HeroCtaSlab locale={locale} />
    </div>
  )
}
