'use client'
import { useEffect } from 'react'
import { useLoginModal } from '@/lib/auth'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

interface Props {
  onClose: () => void
}

/**
 * Soft modal that replaces the must-eat detail when an anonymous visitor
 * taps a locked card. Pitches the free starter (20 cards on signup) rather
 * than blocking the visitor with a hard wall. Login modal opens on accept;
 * Abbrechen / outside-click dismisses without changing map state.
 */
export default function AnonUnlockPrompt({ onClose }: Props) {
  const { t } = useTranslation()
  const { open: openLogin } = useLoginModal()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const onAccept = () => {
    openLogin()
    onClose()
  }

  return (
    <>
      <div className={styles.anonPromptBackdrop} onClick={onClose} aria-hidden="true" />
      <div
        className={styles.anonPromptSheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="anon-prompt-title"
      >
        <div className={styles.anonPromptHandle} aria-hidden="true" />
        <div className={styles.anonPromptIcon} aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>
        <h2 id="anon-prompt-title" className={styles.anonPromptTitle}>
          {t('map.anonUnlockTitle')}
        </h2>
        <p className={styles.anonPromptBody}>{t('map.anonUnlockBody')}</p>
        <div className={styles.anonPromptActions}>
          <button type="button" className={styles.anonPromptCancel} onClick={onClose}>
            {t('map.anonUnlockCancel')}
          </button>
          <button type="button" className={styles.anonPromptCta} onClick={onAccept}>
            {t('map.anonUnlockCta')}
          </button>
        </div>
      </div>
    </>
  )
}
