'use client'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

interface MobileSearchProps {
  value: string
  onChange: (v: string) => void
}

export default function MobileSearch({ value, onChange }: MobileSearchProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.mobileSearchOpen}>
      <svg className={styles.mobileSearchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        className={styles.mobileSearchInput}
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={t('nav.searchAriaLabel') ?? 'Search'}
      />
      {value && (
        <button type="button" className={styles.mobileSearchClear} onClick={() => onChange('')} aria-label="Clear">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )
}
