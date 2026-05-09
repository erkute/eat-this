'use client'
import type { MapLayer } from '@/lib/types'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

interface LayerToggleProps {
  active: MapLayer
  onChange: (layer: MapLayer) => void
}

/**
 * Apple-style segmented control for switching between Restaurants and
 * Must-Eats. Rendered inline at the top of the sheet (below the handle,
 * above the list content) so it's part of the sheet flow rather than
 * floating over the map. Only visible when the sheet is in list view.
 */
export default function LayerToggle({ active, onChange }: LayerToggleProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.layerTabsWrap}>
      <div className={styles.layerTabs} role="tablist" aria-label={t('map.layerSwitchAria') ?? 'Map layer'}>
        <button
          role="tab"
          aria-selected={active === 'restaurants'}
          className={`${styles.layerTab} ${active === 'restaurants' ? styles.layerTabActive : ''}`}
          onClick={() => onChange('restaurants')}
        >
          {t('map.layerRestaurants') ?? 'Restaurants'}
        </button>
        <button
          role="tab"
          aria-selected={active === 'mustEats'}
          className={`${styles.layerTab} ${active === 'mustEats' ? styles.layerTabActive : ''}`}
          onClick={() => onChange('mustEats')}
        >
          {t('map.layerMustEats') ?? 'Must-Eats'}
        </button>
      </div>
    </div>
  )
}
