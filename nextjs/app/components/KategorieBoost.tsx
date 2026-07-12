import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { CATALOG } from '@/lib/stripe-catalog'
import { categoryArt } from '@/lib/categoryArt'
import { formatPackPrice } from '@/lib/pack/packDetail'
import styles from './KategorieBoost.module.css'

interface Props {
  categorySlug: string
  categoryName: string
  locale: 'de' | 'en'
}

export default function KategorieBoost({ categorySlug, categoryName, locale }: Props) {
  const de = locale === 'de'
  const pack = Object.values(CATALOG).find(p => p.slug === categorySlug)
  if (!pack) return null
  const image = categoryArt(categorySlug)
  const priceLabel = formatPackPrice(pack.amountCents)

  return (
    <aside className={styles.boost} aria-label={`${categoryName} Pack`}>
      {image && (
        <div className={styles.poster}>
          <Image
            src={image}
            alt={`${categoryName} Pack`}
            width={420}
            height={630}
            className={styles.posterImg}
            priority
          />
        </div>
      )}
      <div className={styles.body}>
        <div className={styles.kicker}>{de ? 'Der passende Booster' : 'The matching booster'}</div>
        <h2 className={styles.title}>{categoryName} Pack</h2>
        <div className={styles.spectrum}>{pack.spectrum[locale]}</div>
        <div className={styles.priceRow}>
          <span className={styles.price}>{priceLabel}</span>
          <Link href={`/pack/${categorySlug}`} className={styles.cta}>
            <span>{de ? 'Pack ansehen' : 'View pack'}</span>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 10h11M10 5l5 5-5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </aside>
  )
}
