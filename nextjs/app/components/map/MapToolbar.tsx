'use client'
import type { MapCategory, MapLayer } from '@/lib/types'
import CategoryFilter from './CategoryFilter'
import BezirkFilter from './BezirkFilter'
import OpenNowToggle from './OpenNowToggle'
import LayerToggle from './LayerToggle'
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
}: MapToolbarProps) {
  const wrapClass = variant === 'desktop' ? styles.toolbarDesktop : styles.toolbarMobile
  const { t } = useTranslation()

  if (variant === 'mobile') {
    return (
      <div className={wrapClass}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarPills}>
            <BezirkFilter bezirke={bezirke} active={bezirk} onChange={onBezirk} />
            <div className={styles.toolbarSpacer} />
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
