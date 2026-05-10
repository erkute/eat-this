'use client'
import type { MapCategory } from '@/lib/types'
import { localizedCategoryName, type CategoryDef } from '@/lib/categories'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

interface CategoryFilterProps {
  categories: CategoryDef[]
  active: MapCategory
  onChange: (c: MapCategory) => void
  variant?: 'chips' | 'tabs'
}

export default function CategoryFilter({ categories, active, onChange, variant = 'chips' }: CategoryFilterProps) {
  const { t, lang } = useTranslation()
  const loc = lang === 'de' ? 'de' : 'en'
  const allLabel = t('map.filterAll')

  const items: { value: MapCategory; label: string }[] = [
    { value: 'All', label: allLabel },
    ...categories.map(c => ({
      value: c.slug as MapCategory,
      label: localizedCategoryName(c, loc),
    })),
  ]

  if (variant === 'tabs') {
    return (
      <div className={styles.categoryTabs}>
        {items.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active === value}
            className={`${styles.categoryTab} ${active === value ? styles.categoryTabActive : ''}`}
            onClick={() => onChange(value)}
          >
            {label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.chips} role="tablist" aria-label="Categories">
      {items.map(({ value, label }) => {
        const isActive = active === value
        return (
          <button
            key={value}
            role="tab"
            aria-selected={isActive}
            className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
            onClick={() => onChange(value)}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
