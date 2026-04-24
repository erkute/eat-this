'use client'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

interface OpenNowToggleProps {
  active: boolean
  onChange: (v: boolean) => void
}

export default function OpenNowToggle({ active, onChange }: OpenNowToggleProps) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      className={`${styles.openChip} ${active ? styles.openChipActive : ''}`}
      aria-pressed={active}
      onClick={() => onChange(!active)}
    >
      <span className={styles.openDot} aria-hidden="true" />
      {t('map.openNow')}
    </button>
  )
}
