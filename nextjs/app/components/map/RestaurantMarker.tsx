'use client'
import { Marker } from 'react-map-gl/maplibre'
import type { MapRestaurant } from '@/lib/types'
import styles from './map.module.css'

interface RestaurantMarkerProps {
  restaurant: MapRestaurant
  isSelected: boolean
  onClick: (restaurant: MapRestaurant) => void
}

export default function RestaurantMarker({ restaurant, isSelected, onClick }: RestaurantMarkerProps) {
  const className = [
    styles.pinLogo,
    isSelected && styles.pinLogoActive,
    restaurant.mustEatCount > 0 && styles.pinLogoHasMust,
  ].filter(Boolean).join(' ')

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
        className={className}
        style={{ position: 'relative' }}
      >
        <img src="/pics/logo.png" alt="" draggable={false} />
      </div>
    </Marker>
  )
}
