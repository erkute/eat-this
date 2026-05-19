'use client'

import { CSSProperties, useState } from 'react'
import Image from 'next/image'
import type { MustEatPreview } from '@/lib/sanity.server'
import { useLoginModal } from '@/lib/auth'
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
  const { open: openLogin } = useLoginModal()

  if (mustEats.length === 0) return null
  const de = locale === 'de'
  const n = mustEats.length

  const handleClick = (id: string) => {
    setShakingId(id)
    window.setTimeout(() => setShakingId(prev => (prev === id ? null : prev)), 600)
    openLogin()
  }

  const t = de
    ? {
        eyebrow:  'Must Eats',
        heading:  n === 1 ? '1 Gericht versiegelt.' : `${n} Gerichte versiegelt.`,
        body:     'Login dreht die Karten um.',
        ariaList: 'Must Eats freischalten',
        ariaCard: 'Must Eat freischalten — Login öffnen',
      }
    : {
        eyebrow:  'Must Eats',
        heading:  n === 1 ? '1 dish sealed.' : `${n} dishes sealed.`,
        body:     'Sign in to flip them over.',
        ariaList: 'Unlock Must Eats',
        ariaCard: 'Unlock Must Eat — open login',
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
                src="/pics/card-back.webp"
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
