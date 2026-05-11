import HeroPhotoSlab from './hero/HeroPhotoSlab'
import HeroPhraseSlab from './hero/HeroPhraseSlab'
import HeroCtaSlab from './hero/HeroCtaSlab'
import HeroBulletsSlab from './hero/HeroBulletsSlab'
import HeroProductSlab from './hero/HeroProductSlab'
import styles from './HeroSection.module.css'

interface Props {
  headline: string
  body: string
  ctaLabel: string
  ctaHref: string
  heroImageUrl?: string
  locale?: 'de' | 'en'
}

export default function HeroSection({ headline, body, locale = 'de' }: Props) {
  return (
    <div className={styles.hero}>
      <span className={styles.srOnly}>{headline}</span>
      <span className={styles.srOnly}>{body}</span>
      <HeroPhotoSlab />
      <HeroPhraseSlab />
      <HeroCtaSlab locale={locale} />
      <HeroBulletsSlab locale={locale} />
      <HeroProductSlab />
    </div>
  )
}
