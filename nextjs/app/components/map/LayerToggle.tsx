'use client'
import type { MapLayer } from '@/lib/types'

interface LayerToggleProps {
  active: MapLayer
  onChange: (layer: MapLayer) => void
  unlockedCount: number
  totalMustEats: number
}

export default function LayerToggle({ active, onChange, unlockedCount, totalMustEats }: LayerToggleProps) {
  return (
    <div style={{
      position:  'absolute',
      top:       12,
      left:      12,
      zIndex:    5,
      display:   'flex',
      background: 'var(--bg, #fff)',
      borderRadius: 24,
      padding:   3,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      gap:       2,
    }}>
      {(['restaurants', 'mustEats'] as MapLayer[]).map(layer => (
        <button
          key={layer}
          onClick={() => onChange(layer)}
          style={{
            padding:      '6px 14px',
            borderRadius: 20,
            border:       'none',
            background:   active === layer ? '#e85d2f' : 'transparent',
            color:        active === layer ? '#fff' : 'var(--text)',
            fontWeight:   active === layer ? 600 : 400,
            fontSize:     13,
            cursor:       'pointer',
            display:      'flex',
            alignItems:   'center',
            gap:          5,
          }}
        >
          {layer === 'restaurants' ? 'Restaurants' : 'Must-Eats'}
          {layer === 'mustEats' && totalMustEats > 0 && (
            <span style={{
              fontSize:   11,
              background: active === 'mustEats' ? 'rgba(255,255,255,0.25)' : 'rgba(232,93,47,0.15)',
              color:      active === 'mustEats' ? '#fff' : '#e85d2f',
              borderRadius: 10,
              padding:    '0 5px',
              fontWeight: 700,
            }}>
              {unlockedCount}/{totalMustEats}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
