'use client'
import { Marker } from 'react-map-gl/maplibre'
import type { MapRestaurant } from '@/lib/types'

interface RestaurantMarkerProps {
  restaurant: MapRestaurant
  isSelected: boolean
  onClick: (restaurant: MapRestaurant) => void
}

export default function RestaurantMarker({ restaurant, isSelected, onClick }: RestaurantMarkerProps) {
  return (
    <Marker
      longitude={restaurant.lng}
      latitude={restaurant.lat}
      anchor="bottom"
      onClick={e => {
        e.originalEvent.stopPropagation()
        onClick(restaurant)
      }}
    >
      <div
        role="button"
        aria-label={restaurant.name}
        style={{
          width:        isSelected ? 16 : 12,
          height:       isSelected ? 16 : 12,
          borderRadius: '50%',
          background:   isSelected ? '#ff6b35' : '#e85d2f',
          border:       '2px solid white',
          boxShadow:    isSelected
            ? '0 0 0 3px rgba(255,107,53,0.35)'
            : '0 1px 4px rgba(0,0,0,0.3)',
          cursor:     'pointer',
          transition: 'all 0.15s',
        }}
      />
    </Marker>
  )
}
