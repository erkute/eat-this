'use client'

import { useLoginModal } from '@/lib/auth'
import styles from './FinalCtaSection.module.css'

interface Props {
  headline?: string
  body?: string
  ctaLabel?: string
  ctaHref?: string
  locale?: 'de' | 'en'
  restaurantCount?: number
}

export default function FinalCtaSection({ locale = 'de' }: Props) {
  const { open: openLogin } = useLoginModal()

  const headline = locale === 'de'
    ? 'Alle guten Spots. Eine Map.'
    : 'All the good spots. One map.'

  const ctaLabel = locale === 'de' ? 'Jetzt Berlin entdecken' : 'Discover Berlin now'

  return (
    <section className={styles.section} aria-labelledby="final-cta-headline">
      <h2 id="final-cta-headline" className={styles.h2}>{headline}</h2>
      <button type="button" className={styles.cta} onClick={openLogin}>
        {ctaLabel}
        <span aria-hidden="true" className={styles.arrow}>→</span>
      </button>
    </section>
  )
}
