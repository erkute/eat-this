'use client'
import { Marker } from 'react-map-gl/maplibre'
import { useAuth } from '@/lib/auth'
import { useUserProfile, defaultAvatarFromUid } from '@/lib/firebase/useUserProfile'
import type { UserLocation } from '@/lib/map'
import styles from './MapMarkers.module.css'

interface UserLocationMarkerProps {
  location: UserLocation
}

export default function UserLocationMarker({ location }: UserLocationMarkerProps) {
  const { user } = useAuth()
  const { profile } = useUserProfile(user?.uid ?? null)

  // Selected avatar wins; otherwise fall back to a UID-derived default
  // (deterministic per user, no flicker on remount). Anonymous viewers
  // get avatar 1.
  const avatarIndex =
    profile.avatar ??
    (user?.uid ? defaultAvatarFromUid(user.uid) : 1)

  return (
    // The user marker is purely informational — restaurant/must-eat
    // markers underneath need to stay tappable when the avatar overlaps
    // them. pointer-events:none lets clicks fall through; the inner
    // .userLoc has the same rule but the outer maplibre wrapper sets
    // its own listeners, so we disable the whole subtree from here.
    <Marker
      longitude={location.lng}
      latitude={location.lat}
      anchor="center"
      style={{ pointerEvents: 'none' }}
      className={`user-loc-marker ${styles.markerRoot}`}
    >
      <div className={styles.userLoc} aria-label="Your location">
        <img
          src={`/pics/avatar/${avatarIndex}.webp?v=3`}
          alt=""
          className={styles.userLocAvatar}
          draggable={false}
        />
      </div>
    </Marker>
  )
}
