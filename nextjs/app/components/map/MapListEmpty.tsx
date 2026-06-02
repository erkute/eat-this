'use client'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

interface Props { onReset?: () => void }

export default function MapListEmpty({ onReset }: Props) {
  const { t } = useTranslation()
  return (
    <div className={styles.esBlock} role="status">
      <span className={styles.esKicker}>{t('map.emptyKicker')}</span>
      <h3 className={styles.esHeading}>{t('map.emptyTitle')}</h3>
      <p className={styles.esSub}>{t('map.emptyBody')}</p>
      {onReset && (
        <div className={styles.esActions}>
          <button type="button" className={styles.esBtnPrimary} onClick={onReset}>
            {t('map.emptyReset')}
          </button>
        </div>
      )}
    </div>
  )
}
