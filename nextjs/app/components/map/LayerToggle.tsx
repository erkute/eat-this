'use client'
import type { MapLayer } from '@/lib/types'
import styles from './map.module.css'

interface LayerToggleProps {
  active: MapLayer
  onChange: (layer: MapLayer) => void
  inline?: boolean
}

export default function LayerToggle({ active, onChange, inline = false }: LayerToggleProps) {
  const tabs = (
    <div className={styles.layerTabs} role="tablist" aria-label="Map layer">
      <button
        role="tab"
        aria-label="Restaurants"
        aria-selected={active === 'restaurants'}
        className={`${styles.layerTab} ${styles.layerTabIcon} ${active === 'restaurants' ? styles.layerTabActive : ''}`}
        onClick={() => onChange('restaurants')}
      >
        <img
          src="/pics/logo.png"
          alt=""
          className={styles.layerLogoIcon}
          aria-hidden="true"
          draggable={false}
        />
      </button>
      <button
        role="tab"
        aria-label="Must-Eats"
        aria-selected={active === 'mustEats'}
        className={`${styles.layerTab} ${styles.layerTabIcon} ${active === 'mustEats' ? styles.layerTabActive : ''}`}
        onClick={() => onChange('mustEats')}
      >
        <img
          src="/pics/card-back.webp"
          alt=""
          className={styles.layerCardIcon}
          aria-hidden="true"
          draggable={false}
        />
      </button>
    </div>
  )

  if (inline) return tabs
  return <div className={styles.layerFloat}>{tabs}</div>
}
