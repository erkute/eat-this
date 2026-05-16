'use client'

import { useState } from 'react'
import Image from 'next/image'
import styles from './MustEatsSection.module.css'

// The Vor-Ort callout's back-card. Idle wiggle prompts a glance; click
// triggers a short shake animation only — no navigation, no modal. The
// card is a pure interaction toy that demonstrates the Must-Eat reveal
// mechanic.
export default function VorOrtReveal({ ariaLabel }: { ariaLabel: string }) {
  const [shaking, setShaking] = useState(false)

  const handleClick = () => {
    if (shaking) return
    setShaking(true)
    window.setTimeout(() => setShaking(false), 600)
  }

  return (
    <button
      type="button"
      className={`${styles.tipVisual} ${shaking ? styles.tipVisualShake : ''}`}
      onClick={handleClick}
      aria-label={ariaLabel}
    >
      <Image
        src="/pics/card-back.webp"
        alt=""
        width={400}
        height={560}
        className={styles.tipCardBack}
        sizes="(max-width: 768px) 140px, 200px"
      />
    </button>
  )
}
