'use client'
import { useState } from 'react'
import { Marker } from 'react-map-gl/maplibre'
import type { MapMustEat } from '@/lib/types'
import type { UserLocation } from '@/lib/map/useUserLocation'
import { haversineDistance } from '@/lib/map/distance'
import styles from './map.module.css'

interface MustEatMarkerProps {
  mustEat: MapMustEat
  isUnlocked: boolean
  isSelected: boolean
  userLocation?: UserLocation | null
  onClick: (mustEat: MapMustEat) => void
  displayLat?: number
  displayLng?: number
  /** Card rotation in degrees for the fan effect. */
  fanRotation?: number
  /** Position in the fan (0 = leftmost). */
  fanIndex?: number
  /** Total cards in this fan group. */
  fanCount?: number
}

// Proximity vibration starts at this distance and ramps up to 1 at 0 m away.
const PROXIMITY_START_METERS = 500

export default function MustEatMarker({
  mustEat,
  isUnlocked,
  isSelected,
  userLocation,
  onClick,
  displayLat,
  displayLng,
  fanRotation = 0,
  fanIndex = 0,
  fanCount = 1,
}: MustEatMarkerProps) {
  const [wiggling, setWiggling] = useState(false)

  const distance = userLocation
    ? haversineDistance(userLocation.lat, userLocation.lng, mustEat.restaurant.lat, mustEat.restaurant.lng)
    : null

  // 0 = no vibrate (too far or unlocked), 1 = maximum (right on top).
  const proximityIntensity = !isUnlocked && distance !== null
    ? Math.max(0, Math.min(1, 1 - distance / PROXIMITY_START_METERS))
    : 0

  const vibrating = proximityIntensity > 0.02

  const className = [
    styles.cardMarker,
    isSelected && styles.cardMarkerActive,
    isUnlocked && !isSelected && styles.cardMarkerDiscovered,
    !isUnlocked && wiggling && styles.cardWiggling,
    vibrating && styles.cardMarkerVibrating,
  ].filter(Boolean).join(' ')

  return (
    <Marker
      longitude={displayLng ?? mustEat.restaurant.lng}
      latitude={displayLat ?? mustEat.restaurant.lat}
      anchor="bottom"
      onClick={e => {
        e.originalEvent.stopPropagation()
        if (!isUnlocked) setWiggling(true)
        onClick(mustEat)
      }}
    >
      <div
        role="button"
        aria-label={`Must-Eat at ${mustEat.restaurant.name}`}
        className={className}
        style={{
          ...(vibrating ? { ['--vibrate-intensity' as string]: proximityIntensity.toFixed(3) } : null),
          ...(fanCount > 1 ? {
            ['--fan-rotation' as string]: `${fanRotation}deg`,
            // Centre cards stack on top of the outer ones for a hand-of-cards
            // look. Distance from centre → lower z; isSelected wins outright.
            zIndex: isSelected ? 100 : 10 - Math.abs(fanIndex - (fanCount - 1) / 2),
          } : null),
        }}
        onAnimationEnd={() => setWiggling(false)}
      >
        <img src="/pics/card-back.webp" alt="" draggable={false} />
      </div>
    </Marker>
  )
}
