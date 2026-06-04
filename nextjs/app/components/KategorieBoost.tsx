import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { CATALOG } from '@/lib/stripe-catalog'
import styles from './KategorieBoost.module.css'

interface Props {
  categorySlug: string
  locale: 'de' | 'en'
}

const IMAGE_MAP: Record<string, string> = {
  breakfast: '/pics/booster/booster_breakfast.webp',
  coffee: '/pics/booster/booster_coffee.webp',
  dinner: '/pics/booster/booster_dinner.webp',
  drinks: '/pics/booster/booster_drinks.webp',
  'fast-food': '/pics/booster/booster_fastfood.webp',
  'fine-dining': '/pics/booster/booster_finedining.webp',
  lunch: '/pics/booster/booster_lunch.webp',
  pizza: '/pics/booster/booster_pizza.webp',
  sweets: '/pics/booster/booster_sweets.webp',
}

export default function KategorieBoost({ categorySlug, locale }: Props) {
  const de = locale === 'de'
  const pack = Object.values(CATALOG).find(p => p.slug === categorySlug)
  if (!pack) return null
  const image = IMAGE_MAP[categorySlug]
  const priceLabel = `€${(pack.amountCents / 100).toFixed(2).replace('.', ',')}`
  const packHref = de ? `/pack/${categorySlug}` : `/${locale}/pack/${categorySlug}`

  return (
    <aside className={styles.boost} aria-label={`${pack.displayName} Pack`}>
      {image && (
        <div className={styles.poster}>
          <Image
            src={image}
            alt={`${pack.displayName} Pack`}
            width={420}
            height={560}
            className={styles.posterImg}
          />
        </div>
      )}
      <div className={styles.body}>
        <div className={styles.kicker}>{de ? 'Map-Pack' : 'Map pack'}</div>
        <h2 className={styles.title}>{pack.displayName}</h2>
        <div className={styles.spectrum}>{pack.spectrum[locale]}</div>
        <p className={styles.desc}>{pack.description[locale]}</p>
        <div className={styles.priceRow}>
          <span className={styles.price}>{priceLabel}</span>
          <Link href={packHref} className={styles.cta}>
            {de ? 'Kaufen →' : 'Buy →'}
          </Link>
        </div>
      </div>
    </aside>
  )
}
