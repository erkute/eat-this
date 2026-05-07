'use client'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

interface BezirkFilterPillProps {
  bezirkName: string
  onReset: () => void
}

export default function BezirkFilterPill({ bezirkName, onReset }: BezirkFilterPillProps) {
  const { t } = useTranslation()

  return (
    <div className={styles.bezirkPill} role="status" aria-live="polite">
      <span className={styles.bezirkPillLabel}>Filter</span>
      <span className={styles.bezirkPillName}>{bezirkName}</span>
      <button
        type="button"
        className={styles.bezirkPillReset}
        onClick={onReset}
        aria-label={t('map.filterReset')}
      >
        ✕
      </button>
    </div>
  )
}
