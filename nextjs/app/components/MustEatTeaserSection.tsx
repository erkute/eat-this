'use client'

import { CSSProperties, useState } from 'react'
import Image from 'next/image'
import type { MustEatPreview } from '@/lib/sanity.server'
import { useRouter } from '@/i18n/navigation'
import styles from './MustEatTeaserSection.module.css'

interface Props {
  mustEats: MustEatPreview[]
  locale: 'de' | 'en'
}

// Deterministic ±tilt array — cards look thrown-on-the-table consistently
// across renders. Alternating pattern keeps adjacent cards from leaning the
// same way and creating accidental stripes.
const TILTS = [-3.2, 2.4, -1.8, 2.8, -2.6, 1.9, -3.0, 2.2, -2.1, 2.6, -2.4, 1.7]

export default function MustEatTeaserSection({ mustEats, locale }: Props) {
  const [shakingId, setShakingId] = useState<string | null>(null)
  const router = useRouter()

  if (mustEats.length === 0) return null
  const de = locale === 'de'

  const handleClick = (id: string) => {
    setShakingId(id)
    // Brief shake before flying out so the click registers visually,
    // then route to the holding/launch page (Login is off until launch).
    window.setTimeout(() => {
      router.push('/')
    }, 280)
  }

  const t = de
    ? {
        eyebrow:  'Must Eats',
        heading:  'Noch nicht aufgedeckt.',
        body:     'Bald geht es los — sei dabei.',
        ariaList: 'Must Eats aufdecken',
        ariaCard: 'Zur Launch-Seite',
      }
    : {
        eyebrow:  'Must Eats',
        heading:  'Still face-down.',
        body:     'Going live soon — get on the list.',
        ariaList: 'Reveal Must Eats',
        ariaCard: 'Open launch page',
      }

  return (
    <section className={styles.section} aria-label={t.ariaList}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2 className={styles.heading}>{t.heading}</h2>
        <p className={styles.body}>{t.body}</p>
      </header>

      <ul className={styles.grid} role="list">
        {mustEats.map((m, i) => (
          <li
            key={m._id}
            className={styles.cardWrap}
            style={{ ['--tilt' as string]: `${TILTS[i % TILTS.length]}deg` } as CSSProperties}
          >
            <button
              type="button"
              className={`${styles.card} ${shakingId === m._id ? styles.cardShake : ''}`}
              onClick={() => handleClick(m._id)}
              aria-label={t.ariaCard}
            >
              <Image
                src="/pics/card-back.webp?v=5"
                alt=""
                fill
                sizes="(max-width: 480px) 38vw, (max-width: 720px) 28vw, 180px"
                className={styles.cardBack}
                aria-hidden="true"
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
