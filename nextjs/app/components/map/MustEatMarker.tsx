'use client'
import { memo, useState } from 'react'
import { Marker } from 'react-map-gl/maplibre'
import type { MapMustEat } from '@/lib/types'
import { haversineDistance, type UserLocation } from '@/lib/map'
import styles from './map.module.css'

interface MustEatMarkerProps {
  mustEat: MapMustEat
  isUnlocked: boolean
  isSelected: boolean
  /** Anon-view: this must-eat was NOT included in the API's revealedMustEatIds.
   *  Renders blurred with a lock icon; pointer-events disabled. */
  isCoveredAnon?: boolean
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

/* Konstanter Rechts-Tilt für alle solo-Karten — uniform, gleicher Winkel
   für jede Card. */
const SOLO_TILT_DEG = 4

function MustEatMarker({
  mustEat,
  isUnlocked,
  isSelected,
  isCoveredAnon = false,
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
    isCoveredAnon && styles.cardMarkerCoveredAnon,
    isSelected && styles.cardMarkerActive,
    isUnlocked && !isSelected && styles.cardMarkerDiscovered,
    isUnlocked && styles.cardMarkerFront,
    !isUnlocked && wiggling && styles.cardWiggling,
    vibrating && styles.cardMarkerVibrating,
  ].filter(Boolean).join(' ')

  return (
    <Marker
      longitude={displayLng ?? mustEat.restaurant.lng}
      latitude={displayLat ?? mustEat.restaurant.lat}
      anchor="bottom"
      onClick={isCoveredAnon ? undefined : e => {
        e.originalEvent.stopPropagation()
        if (!isUnlocked) setWiggling(true)
        onClick(mustEat)
      }}
    >
      <div
        role="button"
        aria-label={`Must Eat at ${mustEat.restaurant.name}`}
        className={className}
        style={{
          ...(vibrating ? { ['--vibrate-intensity' as string]: proximityIntensity.toFixed(3) } : null),
          ...(fanCount > 1
            ? {
                ['--fan-rotation' as string]: `${fanRotation}deg`,
                zIndex: isSelected ? 100 : 10 - Math.abs(fanIndex - (fanCount - 1) / 2),
              }
            : {
                /* Solo-Card auf der Map: leicht nach rechts gekippt, alle gleich. */
                ['--fan-rotation' as string]: `${SOLO_TILT_DEG}deg`,
              }),
        }}
        onAnimationEnd={() => setWiggling(false)}
      >
        {isUnlocked
          ? <img src={mustEat.image} alt={mustEat.dish} draggable={false} />
          : <img src="/pics/card-back.webp" alt="" draggable={false} />
        }
      </div>
    </Marker>
  )
}

// Custom comparator: a map pan should not re-render every must-eat marker.
// userLocation gets a new object reference on every recompute, so we compare
// lat/lng values. Fan transforms only matter for visible re-stacking.
export default memo(MustEatMarker, (prev, next) =>
  prev.mustEat._id === next.mustEat._id &&
  prev.isUnlocked === next.isUnlocked &&
  prev.isCoveredAnon === next.isCoveredAnon &&
  prev.isSelected === next.isSelected &&
  prev.displayLat === next.displayLat &&
  prev.displayLng === next.displayLng &&
  prev.fanRotation === next.fanRotation &&
  prev.fanIndex === next.fanIndex &&
  prev.fanCount === next.fanCount &&
  (prev.userLocation?.lat ?? null) === (next.userLocation?.lat ?? null) &&
  (prev.userLocation?.lng ?? null) === (next.userLocation?.lng ?? null) &&
  prev.onClick === next.onClick,
)
