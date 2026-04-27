'use client'
import BezirkFilter from './BezirkFilter'
import MobileSearch from './MobileSearch'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

interface MapToolbarProps {
  variant: 'desktop' | 'mobile'
  search: string
  onSearch: (v: string) => void
  bezirke: string[]
  bezirk: string | null
  onBezirk: (b: string | null) => void
}

export default function MapToolbar({
  variant,
  search,
  onSearch,
  bezirke,
  bezirk,
  onBezirk,
}: MapToolbarProps) {
  const wrapClass = variant === 'desktop' ? styles.toolbarDesktop : styles.toolbarMobile
  const { t } = useTranslation()

  if (variant === 'mobile') {
    return (
      <div className={wrapClass}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarRow}>
            <MobileSearch value={search} onChange={onSearch} />
            <BezirkFilter bezirke={bezirke} active={bezirk} onChange={onBezirk} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={wrapClass}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarRow}>
          <div className={styles.search}>
            <input
              className={styles.searchInput}
              value={search}
              onChange={e => onSearch(e.target.value)}
              placeholder={t('map.searchPlaceholder')}
              aria-label={t('nav.searchAriaLabel') ?? 'Search'}
            />
          </div>
          <BezirkFilter bezirke={bezirke} active={bezirk} onChange={onBezirk} />
        </div>
      </div>
    </div>
  )
}
