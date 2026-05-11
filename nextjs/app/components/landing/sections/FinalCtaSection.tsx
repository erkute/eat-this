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

// Airport-announcement final CTA. Mirrors the Solari-board treatment of
// the top RestaurantTicker: split-flap character tiles inside a black
// board strip, scrolling a fake departures-style feed. Below that, the
// boarding strap pill + the big "final call" headline land the close.
const FEED_DE = [
  'BOARDING NOW',
  'BERLIN ARRIVALS',
  'GATE B14',
  '171 SPOTS AHEAD',
  'BERLINS BESTE SPOTS',
  'DON\'T MISS YOUR FLIGHT',
]
const FEED_EN = [
  'BOARDING NOW',
  'BERLIN ARRIVALS',
  'GATE B14',
  '171 SPOTS AHEAD',
  'BERLIN\'S BEST SPOTS',
  'DON\'T MISS YOUR FLIGHT',
]

function Tiles({ text }: { text: string }) {
  return (
    <span className={styles.tiles} aria-hidden="true">
      {text.split('').map((ch, i) => (
        <span
          key={i}
          className={ch === ' ' ? `${styles.tile} ${styles.tileGap}` : styles.tile}
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  )
}

export default function FinalCtaSection({ locale = 'de' }: Props) {
  const { open: openLogin } = useLoginModal()

  const feed = locale === 'de' ? FEED_DE : FEED_EN

  const headline = locale === 'de'
    ? 'Letzter Aufruf für alle Passagiere nach Berlin'
    : 'This is the final call for passengers travelling to Berlin'

  const subtitle = locale === 'de'
    ? 'Wir warten nur noch auf dich.'
    : 'Just waiting on you.'

  const ctaLabel = locale === 'de' ? 'Ticket sichern' : 'Grab your ticket'

  return (
    <section className={styles.section} aria-labelledby="final-cta-headline">
      {/* Solari-board marquee mirroring the top of the page - the close
          loops back to the visual signature of the opener. Single track
          duplicated so the CSS-only loop is seamless. */}
      <div className={styles.boardFrame} aria-hidden="true">
        <div className={styles.viewport}>
          <ul className={styles.track}>
            {feed.map((text, i) => (
              <li key={i} className={styles.feedItem}><Tiles text={text} /></li>
            ))}
          </ul>
          <ul className={styles.track}>
            {feed.map((text, i) => (
              <li key={`dup-${i}`} className={styles.feedItem}><Tiles text={text} /></li>
            ))}
          </ul>
        </div>
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
