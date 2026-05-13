'use client'
import { useLoginModal } from '@/lib/auth'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

export default function LoginToSeeSpots() {
  const { open } = useLoginModal()
  const { t } = useTranslation()
  return (
    <div className={styles.signInLocked}>
      <p className={styles.signInLockedTitle}>{t('map.signInLockedTitle')}</p>
      <p className={styles.signInLockedBody}>{t('map.signInLockedBody')}</p>
      <button type="button" onClick={open} className={styles.signInLockedCta}>
        {t('map.signInLockedCta')}
      </button>
    </div>
  )
}
