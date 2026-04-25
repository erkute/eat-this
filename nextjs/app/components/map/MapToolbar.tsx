'use client'
import type { MapCategory, MapLayer } from '@/lib/types'
import CategoryFilter from './CategoryFilter'
import BezirkFilter from './BezirkFilter'
import OpenNowToggle from './OpenNowToggle'
import LayerToggle from './LayerToggle'
import MobileSearch from './MobileSearch'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

interface MapToolbarProps {
  variant: 'desktop' | 'mobile'
  search: string
  onSearch: (v: string) => void
  category: MapCategory
  onCategory: (c: MapCategory) => void
  bezirke: string[]
  bezirk: string | null
  onBezirk: (b: string | null) => void
  openOnly: boolean
  onOpenOnly: (v: boolean) => void
  showCategory?: boolean
  layer: MapLayer
  onLayer: (l: MapLayer) => void
  onLocate?: () => void
}

export default function MapToolbar({
  variant,
  search,
  onSearch,
  category,
  onCategory,
  bezirke,
  bezirk,
  onBezirk,
  openOnly,
  onOpenOnly,
  showCategory = true,
  layer,
  onLayer,
  onLocate,
}: MapToolbarProps) {
  const wrapClass = variant === 'desktop' ? styles.toolbarDesktop : styles.toolbarMobile
  const { t } = useTranslation()

  if (variant === 'mobile') {
    return (
      <div className={wrapClass}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarPills}>
            {onLocate && (
              <button
                type="button"
                className={styles.toolbarLocate}
                onClick={onLocate}
                aria-label={t('map.locationError') ?? 'My location'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="8" />
                  <line x1="12" y1="2"  x2="12" y2="5" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="2"  y1="12" x2="5"  y2="12" />
                  <line x1="19" y1="12" x2="22" y2="12" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
              </button>
            )}
            <MobileSearch value={search} onChange={onSearch} />
            <BezirkFilter bezirke={bezirke} active={bezirk} onChange={onBezirk} />
            <LayerToggle active={layer} onChange={onLayer} inline />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={wrapClass}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarRow} style={{ flex: 1 }}>
          <LayerToggle active={layer} onChange={onLayer} inline />
          <div className={styles.search}>
            <input
              className={styles.searchInput}
              value={search}
              onChange={e => onSearch(e.target.value)}
              placeholder={t('map.searchPlaceholder')}
              aria-label={t('nav.searchAriaLabel') ?? 'Search'}
            />
          </div>
          <OpenNowToggle active={openOnly} onChange={onOpenOnly} />
          <BezirkFilter bezirke={bezirke} active={bezirk} onChange={onBezirk} />
          {showCategory && <CategoryFilter active={category} onChange={onCategory} />}
        </div>
      </div>
    </div>
  )
}
