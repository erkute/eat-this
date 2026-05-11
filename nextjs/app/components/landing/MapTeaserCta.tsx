'use client'

import { useLoginModal } from '@/lib/auth'
import styles from './landing.module.css'

interface Props {
  label: string
}

/* Tiny client component so the MapTeaser section can stay server-
   rendered (PHONE_CONTENT + screenshots are static), while the bottom
   CTA still opens the login modal via `useLoginModal()`. Mirrors the
   FinalCtaSection / PacksSection convention: action-gated behind auth
   → login modal, not inline magic-link. */
export default function MapTeaserCta({ label }: Props) {
  const { open: openLogin } = useLoginModal()
  return (
    <button type="button" className={styles.mapTeaserCta} onClick={openLogin}>
      {label}
      <span aria-hidden="true" className={styles.mapTeaserCtaArrow}>→</span>
    </button>
  )
}
