'use client'
import type { RefObject } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import type { MapRestaurant } from '@/lib/types'
import type { UserLocation } from '@/lib/map'

import MapCanvas from './MapCanvas'
import RestaurantMarker from './RestaurantMarker'
import UserLocationMarker from './UserLocationMarker'

/* The entire react-map-gl / maplibre-gl surface — the canvas plus every
   marker — lives behind this single component so it can be code-split into
   one lazy chunk (see the `next/dynamic` boundary in MapSectionBody). The
   ~800 KB maplibre-gl bundle + its CSS then load only after /map mounts on
   the client, instead of blocking hydration of the SSR'd list/sheet. */
interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

interface MapCanvasLayerProps {
  mapRef: RefObject<MapRef | null>
  onMapMove: (bounds: MapBounds) => void
  onMapClick: () => void
  displayedRestaurants: MapRestaurant[]
  selectedRestaurant: MapRestaurant | null
  onRestaurantClick: (r: MapRestaurant) => void
  location: UserLocation | null
}

export default function MapCanvasLayer({
  mapRef,
  onMapMove,
  onMapClick,
  displayedRestaurants,
  selectedRestaurant,
  onRestaurantClick,
  location,
}: MapCanvasLayerProps) {
  return (
    <MapCanvas ref={mapRef} onMove={onMapMove} onMapClick={onMapClick}>
      {displayedRestaurants.map(r => (
        <RestaurantMarker
          key={r._id}
          restaurant={r}
          isSelected={selectedRestaurant?._id === r._id}
          onClick={onRestaurantClick}
        />
      ))}
      {/* Deep-Link/Locked-Selektion: der selektierte Spot kann außerhalb
          des sichtbaren Sets liegen (alter Share-Link, locked Preview).
          Immer einen Pin geben — sonst zentriert die Kamera sichtbar
          auf nichts. */}
      {selectedRestaurant &&
        !displayedRestaurants.some((r) => r._id === selectedRestaurant._id) && (
          <RestaurantMarker
            key={selectedRestaurant._id}
            restaurant={selectedRestaurant}
            isSelected
            onClick={onRestaurantClick}
          />
        )}
      {location && <UserLocationMarker location={location} />}
    </MapCanvas>
  )
}
