import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import type { RestaurantCard } from '@/lib/types'
import { normalizeName } from '@/lib/normalizeName'
import styles from './FeaturedSpotsSection.module.css'

interface Props {
  spots:  RestaurantCard[]
  locale: 'de' | 'en'
}

export default function FeaturedSpotsSection({ spots, locale }: Props) {
  if (spots.length === 0) return null

  const quote = locale === 'de'
    ? 'Das hätte ich mir für Berlin schon vor Jahren gewünscht.'
    : "I've wished Berlin had this for years."

  return (
    <section id="featured" className={styles.section}>
      <div className={styles.inner}>
        <figure className={styles.bubbleWrap}>
          <div className={styles.bubble}>
            <svg
              className={styles.bubbleSvg}
              viewBox="0 0 600 420"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <filter id="bubbleWobbleA" x="-5%" y="-5%" width="110%" height="110%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="3"/>
                  <feDisplacementMap in="SourceGraphic" scale="5"/>
                </filter>
              </defs>
              <path
                d="M 60 60 C 60 28, 110 18, 160 16 C 280 8, 420 12, 500 24 C 555 32, 580 80, 580 150 C 580 230, 560 300, 470 320 C 360 340, 250 335, 200 332 L 130 410 L 215 330 C 130 322, 70 300, 50 250 C 28 190, 30 110, 60 60 Z"
                fill="#ffffff"
                stroke="#1c1c1c"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                filter="url(#bubbleWobbleA)"
              />
            </svg>
            <blockquote className={styles.bubbleQuote}>{quote}</blockquote>
          </div>
          <img
            src="/pics/cat.webp"
            alt=""
            aria-hidden="true"
            className={styles.bubbleCat}
            width={406}
            height={396}
            loading="lazy"
            decoding="async"
          />
        </figure>

        <ol className={styles.list}>
          {spots.map((s, i) => (
            <li key={s._id} className={styles.entry}>
              <Link href={`/restaurant/${s.slug}`} className={styles.entryLink}>
                {s.photo && (
                  <div className={styles.entryPhoto}>
                    <Image
                      src={s.photo}
                      alt={`${s.name} — ${s.district ?? 'Berlin'}`}
                      fill
                      sizes="(max-width: 720px) 92vw, 720px"
                    />
                  </div>
                )}
                <div className={styles.entryMeta}>
                  <span className={styles.entryNumber}>{String(i + 1).padStart(2, '0')}</span>
                  <div className={styles.entryText}>
                    <h3 className={styles.entryName}>{normalizeName(s.name)}</h3>
                    {s.district && (
                      <p className={styles.entryDistrict}>{normalizeName(s.district)}</p>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
