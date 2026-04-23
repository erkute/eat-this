'use client'
import type { MapCategory } from '@/lib/types'

const CATEGORIES: MapCategory[] = ['All', 'Dinner', 'Lunch', 'Breakfast', 'Coffee', 'Sweets', 'Pizza']

interface CategoryFilterProps {
  active: MapCategory
  onChange: (cat: MapCategory) => void
}

export default function CategoryFilter({ active, onChange }: CategoryFilterProps) {
  return (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 12px', scrollbarWidth: 'none', flexShrink: 0 }}>
      {CATEGORIES.map(cat => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          style={{
            flexShrink:  0,
            padding:     '4px 12px',
            borderRadius: 20,
            border:      active === cat ? 'none' : '1px solid var(--border, #ddd)',
            background:  active === cat ? '#e85d2f' : 'transparent',
            color:       active === cat ? '#fff' : 'var(--text, #333)',
            fontSize:    13,
            fontWeight:  active === cat ? 600 : 400,
            cursor:      'pointer',
          }}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
