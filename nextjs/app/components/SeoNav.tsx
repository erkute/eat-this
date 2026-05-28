'use client'

import { Link } from '@/i18n/navigation'
import styles from './SeoNav.module.css'

export default function SeoNav() {
  const openBurger = () => {
    const drawer = document.getElementById('burgerDrawer')
    if (!drawer) return
    drawer.classList.add('active')
    // Mobile body-scroll lock so the page underneath doesn't scroll while
    // the drawer is open. Matched in BurgerDrawer's `burger:close` handler.
    const mobile = window.innerWidth < 768
    if (mobile) {
      const y = window.scrollY
      document.body.dataset.burgerLockY = String(y)
      document.body.style.position = 'fixed'
      document.body.style.top = `-${y}px`
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = 'hidden'
    }
  }

  return (
    <header className={styles.hdr} role="banner">
      <Link href="/profile" className={styles.iconBtn} aria-label="Profile">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </Link>

      <Link href="/map" className={styles.logo} aria-label="Eat This — Start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pics/eat-this-logo.webp" alt="Eat This" className={styles.logoImg} />
      </Link>

      <button
        type="button"
        onClick={openBurger}
        className={styles.iconBtn}
        id="burgerBtn"
        aria-label="Menu"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>
    </header>
  )
}
