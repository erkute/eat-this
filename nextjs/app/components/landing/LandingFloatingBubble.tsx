'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useLoginModal } from '@/lib/auth'
import styles from './LandingFloatingBubble.module.css'

// Oatly-style rotating one-liners. Brand-Berlin voice: declarative,
// self-aware, anti-cliché. Match the line bank to the curated voice
// the user has been iterating on.
const LINES_DE = [
  'Hungrig? Wir auch.',
  'Berlin hat 8000 Restaurants. Wir mögen 250.',
  'Life is too short für 3-Sterne-Restaurants.',
  'Skip Tripadvisor.',
  'Vorgefiltert. Damit du nicht musst.',
]
const LINES_EN = [
  'Hungry? Same.',
  "Berlin's got 8000 restaurants. We love 250.",
  'Life is too short for 3-star restaurants.',
  'Skip Tripadvisor.',
  "Pre-filtered. So you don't have to.",
]

const DISMISS_KEY = 'eatthis_landing_bubble_dismissed'
const APPEAR_DELAY_MS = 1200
const ROTATE_MS = 7000

interface Props {
  locale: 'de' | 'en'
}

export default function LandingFloatingBubble({ locale }: Props) {
  const { open: openLogin } = useLoginModal()
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [lineIndex, setLineIndex] = useState(0)

  const lines = locale === 'de' ? LINES_DE : LINES_EN

  // Hydration-safe: read localStorage + show timer only after mount.
  useEffect(() => {
    setMounted(true)
    const isDismissed = window.localStorage.getItem(DISMISS_KEY) === '1'
    if (isDismissed) {
      setDismissed(true)
      return
    }

    // Pick a random opening line so different visits feel different.
    setLineIndex(Math.floor(Math.random() * lines.length))

    // Show after a short delay so the user has time to register the
    // hero before the bubble taps in. No scroll dependency — bubble
    // is for landing-page brand presence, not a "scroll past me" cue.
    const appear = window.setTimeout(() => setVisible(true), APPEAR_DELAY_MS)

    const rotate = window.setInterval(() => {
      setLineIndex((i) => (i + 1) % lines.length)
    }, ROTATE_MS)

    return () => {
      window.clearTimeout(appear)
      window.clearInterval(rotate)
    }
  }, [lines.length])

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissed(true)
    window.localStorage.setItem(DISMISS_KEY, '1')
  }

  if (!mounted || dismissed || !visible) return null

  return (
    <aside className={styles.wrap} aria-label="Eat This">
      <button
        type="button"
        className={styles.bubble}
        onClick={openLogin}
      >
        <span key={lineIndex} className={styles.text}>{lines[lineIndex]}</span>
      </button>
      <Image
        src="/pics/booster/booster_lunch.webp"
        alt=""
        width={180}
        height={260}
        className={styles.pack}
        aria-hidden="true"
        priority={false}
      />
      <button
        type="button"
        className={styles.close}
        onClick={handleDismiss}
        aria-label={locale === 'de' ? 'Schließen' : 'Close'}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </aside>
  )
}
