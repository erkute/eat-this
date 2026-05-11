'use client'

import styles from './HeroSection.module.css'

export default function HeroScrollHint() {
  return (
    <button
      type="button"
      aria-label="Scroll down"
      className={styles.scrollHint}
      onClick={() => {
        const next = document.querySelector('.start-scroll-content')
        if (next) (next as HTMLElement).scrollIntoView({ behavior: 'smooth' })
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  )
}
