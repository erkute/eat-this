import { CSSProperties } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { pickLocale } from '@/lib/i18n/pickLocale'
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers'
import type { RestaurantCard } from '@/lib/types'
import styles from './FeaturedSpotsSection.module.css'

interface Props {
  spots:  RestaurantCard[]
  locale: 'de' | 'en'
}

// Alternating rest-state tilt — same comic-sticker scatter rhythm as Voices.
const TILTS = [-1.4, 1.6, -1.1, 1.2, -1.6, 1.3, -1.3, 1.4, -1.5, 1.1, -1.2, 1.5]

export default function FeaturedSpotsSection({ spots, locale }: Props) {
  if (spots.length === 0) return null

  const t = locale === 'de'
    ? { eyebrow: 'Hand-picked', l1: 'Was wir', l2: 'gegessen haben.' }
    : { eyebrow: 'Hand-picked', l1: 'What we', l2: 'ate.' }

  return (
    <section className={styles.section} aria-labelledby="featured-header">
      <div className={styles.inner}>
        <header className={styles.masthead}>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h2 id="featured-header" className={styles.wordmark}>
            {t.l1}<br />{t.l2}
          </h2>
        </header>

        <ul className={styles.strip}>
          {spots.map((s, i) => {
            const cardLine = pickLocale(s.shortDescription, s.shortDescriptionEn, locale)
              || pickLocale(s.tip, s.tipEn, locale)
            const priceLabel = formatPriceLabel(s)
            return (
              <li
                key={s._id}
                className={styles.card}
                style={{ ['--tilt' as string]: `${TILTS[i % TILTS.length]}deg` } as CSSProperties}
              >
                <Link href={`/restaurant/${s.slug}`} className={styles.cardLink}>
                  {s.photo && (
                    <div className={styles.cardImage}>
                      <Image
                        src={s.photo}
                        alt={`${s.name} — ${s.district ?? 'Berlin'}`}
                        fill
                        sizes="(max-width: 720px) 82vw, (max-width: 1080px) 44vw, 320px"
                      />
                    </div>
                  )}
                  <div className={styles.cardBody}>
                    {s.district && (
                      <p className={styles.cardEyebrow}>{s.district}</p>
                    )}
                    <div className={styles.cardHeadRow}>
                      <h3 className={styles.cardName}>{s.name}</h3>
                      {priceLabel && (
                        <span className={styles.cardPrice}>{priceLabel}</span>
                      )}
                    </div>
                    {s.cuisineType && (
                      <p className={styles.cardCuisine}>{s.cuisineType}</p>
                    )}
                    {cardLine && <p className={styles.cardTip}>{cardLine}</p>}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
