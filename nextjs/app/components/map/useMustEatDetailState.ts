'use client'
import { useState } from 'react'
import { haversineDistance, type UserLocation } from '@/lib/map'
import type { MapMustEat } from '@/lib/types'

export const UNLOCK_RADIUS_METERS = 50

interface Args {
  mustEat: MapMustEat
  userLocation: UserLocation | null
  onUnlock: () => void
  // Anon visitors must not enter the reveal-overlay path — the overlay
  // doesn't (and shouldn't) advance phases without a signed-in user, so
  // gating here keeps the locked-card tap a no-op tap-feedback instead.
  isAuthed: boolean
  // Demo mode (?revealdemo): play the reveal animation on tap regardless of
  // distance/auth, with no unlock side effects — lets the look be reviewed
  // without physically walking into a 50 m radius.
  demo?: boolean
}

export function useMustEatDetailState({ mustEat, userLocation, onUnlock, isAuthed, demo }: Args) {
  const distance = userLocation
    ? haversineDistance(userLocation.lat, userLocation.lng, mustEat.restaurant.lat, mustEat.restaurant.lng)
    : null

  // In demo the card is always tappable, so it reads as "ready" and wiggles
  // invitingly even without a location fix.
  const canUnlock = demo || (distance !== null && distance <= UNLOCK_RADIUS_METERS)

  // Vibration ramps from a small idle baseline (0.18 - always perceptible)
  // up to 1.0 right on top of the restaurant. Under UNLOCK_RADIUS_METERS
  // it's unlockable. Demo pins it near the top so the wiggle is obvious.
  const vibrateIntensity = demo
    ? 0.9
    : distance === null
      ? 0.18
      : Math.max(0.18, Math.min(1, 1 - distance / 500))

  const [tapping, setTapping] = useState(false)

  // While `revealOrigin` is set, the body-portaled overlay takes over the
  // unlock moment — the inline locked card is hidden so it visually morphs
  // into the overlay instead of duplicating it.
  const [revealOrigin, setRevealOrigin] = useState<DOMRect | null>(null)

  const handleCardClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Demo: play the animation only, no unlock/persist side effects.
    if (demo) {
      setRevealOrigin(e.currentTarget.getBoundingClientRect())
      return
    }
    if (canUnlock && isAuthed) {
      const rect = e.currentTarget.getBoundingClientRect()
      setRevealOrigin(rect)
      onUnlock()
      return
    }
    setTapping(true)
    window.setTimeout(() => setTapping(false), 600)
  }
  const handleRevealDone = () => setRevealOrigin(null)

  // Click-to-zoom on the unlocked card. Origin rect lets the lightbox fly out
  // from where the card sat and back to that exact spot on close.
  const [zoomRect, setZoomRect] = useState<DOMRect | null>(null)
  const handleCardZoom = (e: React.MouseEvent<HTMLButtonElement>) => {
    setZoomRect(e.currentTarget.getBoundingClientRect())
  }
  const handleZoomClose = () => setZoomRect(null)

  return {
    distance,
    canUnlock,
    vibrateIntensity,
    tapping,
    revealOrigin,
    zoomRect,
    handleCardClick,
    handleRevealDone,
    handleCardZoom,
    handleZoomClose,
  }
}

export type MustEatDetailState = ReturnType<typeof useMustEatDetailState>
