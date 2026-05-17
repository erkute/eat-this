'use client'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

/**
 * Shown inside the list (restaurants OR must-eats) when the active filters
 * produce zero results. Friendly default — no login wall, no marketing —
 * just a hint that filters or the viewport need a change.
 */
export default function MapListEmpty() {
  const { t } = useTranslation()
  return (
    <div className={styles.listEmpty} role="status">
      <div className={styles.listEmptyIcon} aria-hidden="true">
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {/* Plate + missing-pin sketch — visual joke for "nothing on the
              plate / nothing pinned to this stretch of map". */}
          <circle cx="22" cy="24" r="11" />
          <circle cx="22" cy="24" r="7" />
          <path d="M22 6.5l-3 4 3 3 3 -3z" />
        </svg>
      </div>
      <p className={styles.listEmptyTitle}>{t('map.emptyTitle')}</p>
      <p className={styles.listEmptyBody}>{t('map.emptyBody')}</p>
    </div>
  )
}
