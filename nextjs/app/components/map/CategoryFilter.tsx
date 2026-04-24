'use client'
import type { MapCategory } from '@/lib/types'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

const CATEGORIES: MapCategory[] = ['All', 'Dinner', 'Lunch', 'Breakfast', 'Coffee', 'Sweets', 'Pizza']

const LABEL_KEY: Record<MapCategory, string> = {
  All:       'map.filterAll',
  Dinner:    'map.filterDinner',
  Lunch:     'map.filterLunch',
  Breakfast: 'map.filterBreakfast',
  Coffee:    'map.filterCoffee',
  Sweets:    'map.filterSweets',
  Pizza:     'map.filterPizza',
}

interface CategoryFilterProps {
  active: MapCategory
  onChange: (cat: MapCategory) => void
}

export default function CategoryFilter({ active, onChange }: CategoryFilterProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.chips} role="tablist" aria-label="Categories">
      {CATEGORIES.map(cat => {
        const isActive = active === cat
        return (
          <button
            key={cat}
            role="tab"
            aria-selected={isActive}
            className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
            onClick={() => onChange(cat)}
          >
            {t(LABEL_KEY[cat])}
          </button>
        )
      })}
    </div>
  )
}
