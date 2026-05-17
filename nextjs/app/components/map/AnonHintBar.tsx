'use client'
import { useEffect, useState } from 'react'
import { useLoginModal } from '@/lib/auth'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

const DISMISS_KEY = 'eatthis.map.anonHintBar.dismissed'

/**
 * Bottom-pinned soft nudge shown to anon visitors on the map. Persists
 * dismissal per browser session (not forever) so a returning visitor still
 * gets the pitch on the next tab. Click anywhere on the bar except the
 * close-X opens the login modal — same affordance as a notification chip.
 */
export default function AnonHintBar() {
  const { t } = useTranslation()
  const { open: openLogin } = useLoginModal()
  const [hidden, setHidden] = useState(true)

  // Read sessionStorage on mount — render nothing until we know it's
  // not dismissed, so the bar never flashes in for a returning visitor.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') return
    } catch { /* private mode */ }
    setHidden(false)
  }, [])

  if (hidden) return null

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* noop */ }
    setHidden(true)
  }

  return (
    <button
      type="button"
      className={styles.anonHintBar}
      onClick={openLogin}
      aria-label={t('map.anonHintBar')}
    >
      <span className={styles.anonHintBarIcon} aria-hidden="true">🎁</span>
      <span className={styles.anonHintBarText}>{t('map.anonHintBar')}</span>
      <span
        role="button"
        tabIndex={0}
        aria-label={t('map.anonHintBarDismiss')}
        className={styles.anonHintBarClose}
        onClick={dismiss}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            // Synthesise a stopPropagation-safe dismiss
            try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* noop */ }
            setHidden(true)
          }
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <line x1="3.5" y1="3.5" x2="10.5" y2="10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="10.5" y1="3.5" x2="3.5" y2="10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
    </button>
  )
}
