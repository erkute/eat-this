'use client'

import Image from 'next/image'
import type { MustEatPreview } from '@/lib/sanity.server'
import styles from './MustEatTeaserSection.module.css'

interface Props {
  mustEats: MustEatPreview[]
  locale: 'de' | 'en'
}

export default function MustEatTeaserSection({ mustEats, locale }: Props) {
  if (mustEats.length === 0) return null
  const de = locale === 'de'

  const handleClick = () => {
    if (typeof window !== 'undefined') {
      window.openLoginModal?.()
    }
  }

  return (
    <section className={styles.section} aria-label={de ? 'Must Eats freischalten' : 'Unlock Must Eats'}>
      <div className={styles.head}>
        <span className={styles.kicker}>Must Eats</span>
        <h2 className={styles.h2}>
          {de ? 'Freischalten und entdecken' : 'Unlock and discover'}
        </h2>
        <p className={styles.body}>
          {de
            ? `${mustEats.length} ${mustEats.length === 1 ? 'Must Eat wartet' : 'Must Eats warten'} auf dich. Logge dich ein, um sie zu sehen.`
            : `${mustEats.length} must ${mustEats.length === 1 ? 'eat is' : 'eats are'} waiting. Sign in to see them.`}
        </p>
      </div>
      <div className={styles.grid}>
        {mustEats.map(m => (
          <button
            key={m._id}
            type="button"
            className={styles.card}
            onClick={handleClick}
            aria-label={de ? `${m.dish} freischalten — Login öffnen` : `Unlock ${m.dish} — open login`}
          >
            <div className={styles.cardImage}>
              <Image
                src={m.photo}
                alt=""
                fill
                sizes="(max-width: 720px) 50vw, 240px"
                aria-hidden="true"
              />
            </div>
            <div className={styles.cardOverlay}>
              <span className={styles.lock} aria-hidden="true">🔒</span>
              <span className={styles.cardLabel}>
                {de ? 'Freischalten' : 'Unlock'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
