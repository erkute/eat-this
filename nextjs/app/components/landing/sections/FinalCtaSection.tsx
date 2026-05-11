'use client'

import { useLoginModal } from '@/lib/auth'
import styles from './FinalCtaSection.module.css'

interface Props {
  headline?: string
  body?: string
  ctaLabel?: string
  ctaHref?: string
  locale?: 'de' | 'en'
}

// Airport-announcement final CTA. Treats the bottom of the page like a
// last boarding call - black panel, mono solari-board metadata bar, and
// a massive announcement line. CMS props are accepted but ignored; the
// copy here is the brand line.
export default function FinalCtaSection({ locale = 'de' }: Props) {
  const { open: openLogin } = useLoginModal()

  const meta = locale === 'de'
    ? 'FINAL CALL · GATE BERLIN · STATUS: BOARDING'
    : 'FINAL CALL · GATE BERLIN · STATUS: BOARDING'

  const headline = locale === 'de'
    ? 'Letzter Aufruf für alle Passagiere nach Berlin'
    : 'This is the final call for passengers travelling to Berlin'

  const subtitle = locale === 'de'
    ? 'Wir warten nur noch auf dich.'
    : 'Just waiting on you.'

  const ctaLabel = locale === 'de' ? 'Ticket sichern' : 'Grab your ticket'

  return (
    <section className={styles.section} aria-labelledby="final-cta-headline">
      <div className={styles.boardingFrame}>
        <span className={styles.indicator} aria-hidden="true" />
        <span className={styles.meta}>{meta}</span>
      </div>

      <h2 id="final-cta-headline" className={styles.h2}>{headline}</h2>
      <p className={styles.subtitle}>{subtitle}</p>

      <button type="button" className={styles.cta} onClick={openLogin}>
        {ctaLabel}
        <span aria-hidden="true" className={styles.arrow}>→</span>
      </button>
    </section>
  )
}
