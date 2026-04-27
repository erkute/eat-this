'use client'
import { useMemo } from 'react'
import { Marker } from 'react-map-gl/maplibre'
import type { UserLocation } from '@/lib/map/useUserLocation'
import styles from './map.module.css'

interface UserLocationMarkerProps {
  location: UserLocation
}

export default function UserLocationMarker({ location }: UserLocationMarkerProps) {
  const avatarIndex = useMemo(() => Math.floor(Math.random() * 3) + 1, [])

  return (
    <Marker longitude={location.lng} latitude={location.lat} anchor="center">
      <div className={styles.userLoc} aria-label="Your location">
        <img
          src={`/pics/avatar/${avatarIndex}.webp`}
          alt=""
          className={styles.userLocAvatar}
          draggable={false}
        />
      </div>
    </Marker>
  )
}
