'use client'
import { Marker } from 'react-map-gl/maplibre'
import type { MapMustEat } from '@/lib/types'

interface MustEatMarkerProps {
  mustEat: MapMustEat
  isUnlocked: boolean
  isSelected: boolean
  onClick: (mustEat: MapMustEat) => void
}

export default function MustEatMarker({ mustEat, isUnlocked, isSelected, onClick }: MustEatMarkerProps) {
  return (
    <Marker
      longitude={mustEat.restaurant.lng}
      latitude={mustEat.restaurant.lat}
      anchor="bottom"
      onClick={e => {
        e.originalEvent.stopPropagation()
        onClick(mustEat)
      }}
    >
      <div
        role="button"
        aria-label={isUnlocked ? mustEat.dish : 'Hidden Must-Eat'}
        style={{
          width:      40,
          height:     56,
          borderRadius: 6,
          overflow:   'hidden',
          cursor:     'pointer',
          boxShadow:  isSelected
            ? '0 0 0 3px #e85d2f, 0 4px 12px rgba(0,0,0,0.3)'
            : '0 2px 8px rgba(0,0,0,0.25)',
          transition: 'box-shadow 0.15s',
          border:     '2px solid white',
          position:   'relative',
        }}
      >
        {isUnlocked ? (
          <img src={mustEat.image} alt={mustEat.dish} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width:       '100%',
            height:      '100%',
            background:  'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            display:     'flex',
            alignItems:  'center',
            justifyContent: 'center',
          }}>
            <div style={{
              position:            'absolute',
              inset:               3,
              border:              '1px solid rgba(255,255,255,0.15)',
              borderRadius:        3,
              backgroundImage:     'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 8px)',
            }} />
            <span style={{ fontSize: 18, position: 'relative', zIndex: 1 }}>?</span>
          </div>
        )}
      </div>
    </Marker>
  )
}
