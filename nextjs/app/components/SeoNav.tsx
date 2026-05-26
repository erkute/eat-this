'use client'

import { Link } from '@/i18n/navigation'
import styles from './SeoNav.module.css'

export default function SeoNav() {
  return (
    <header className={styles.hdr} role="banner">
      <Link href="/" className={styles.iconBtn} aria-label="Profile">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </Link>

      <Link href="/" className={styles.logo} aria-label="Eat This — Start">
        Eat<br />This
      </Link>

      <Link href="/" className={styles.iconBtn} aria-label="Menu">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </Link>
    </header>
  )
}
