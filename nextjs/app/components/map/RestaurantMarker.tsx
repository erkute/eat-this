'use client'
import { memo } from 'react'
import { Marker } from 'react-map-gl/maplibre'
import type { MapRestaurant } from '@/lib/types'
import styles from './map.module.css'

interface RestaurantMarkerProps {
  restaurant: MapRestaurant
  isSelected: boolean
  onClick: (restaurant: MapRestaurant) => void
}

function RestaurantMarker({ restaurant, isSelected, onClick }: RestaurantMarkerProps) {
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
        // Lets the detail-peek snapshot (MapSection) find and clone the
        // selected pin — DOM markers aren't part of the GL canvas frame.
        {...(isSelected ? { 'data-selected-pin': '' } : {})}
      >
        <span className={styles.pinLogoShape} aria-hidden="true">
          <img src="/pics/eat-this-square.webp?v=5" alt="" draggable={false} />
        </span>
      </div>
    </Marker>
  )
}

// Custom comparator: panning the map should not re-render markers whose
// underlying restaurant + selected-state are unchanged. onClick is a stable
// callback in the parent (useCallback) — included anyway for safety.
export default memo(RestaurantMarker, (prev, next) =>
  prev.restaurant._id === next.restaurant._id &&
  prev.restaurant.mustEatCount === next.restaurant.mustEatCount &&
  prev.restaurant.lat === next.restaurant.lat &&
  prev.restaurant.lng === next.restaurant.lng &&
  prev.isSelected === next.isSelected &&
  prev.onClick === next.onClick,
)
