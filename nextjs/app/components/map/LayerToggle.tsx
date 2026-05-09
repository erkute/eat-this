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
 * Must-Eats. Floats over the map (top-centered on mobile, hidden on
 * desktop where the sidebar handles list switching) so the user can
 * jump between layers from any sheet snap.
 */
export default function LayerToggle({ active, onChange }: LayerToggleProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.layerFloat}>
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
