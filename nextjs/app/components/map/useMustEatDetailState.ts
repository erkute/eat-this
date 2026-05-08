'use client'
import { useState } from 'react'
import { haversineDistance, type UserLocation } from '@/lib/map'
import type { MapMustEat } from '@/lib/types'

const UNLOCK_RADIUS_METERS = 250

interface Args {
  mustEat: MapMustEat
  userLocation: UserLocation | null
  onUnlock: () => void
}

export function useMustEatDetailState({ mustEat, userLocation, onUnlock }: Args) {
  const distance = userLocation
    ? haversineDistance(userLocation.lat, userLocation.lng, mustEat.restaurant.lat, mustEat.restaurant.lng)
    : null

  const canUnlock = distance !== null && distance <= UNLOCK_RADIUS_METERS

  // Vibration ramps from a small idle baseline (0.18 — always perceptible)
  // up to 1.0 right on top of the restaurant. Under 250 m it's unlockable.
  const vibrateIntensity = distance === null
    ? 0.18
    : Math.max(0.18, Math.min(1, 1 - distance / 500))

  const [tapping, setTapping] = useState(false)

  // While `revealOrigin` is set, the body-portaled overlay takes over the
  // unlock moment — the inline locked card is hidden so it visually morphs
  // into the overlay instead of duplicating it.
  const [revealOrigin, setRevealOrigin] = useState<DOMRect | null>(null)

  const handleCardClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (canUnlock) {
      const rect = e.currentTarget.getBoundingClientRect()
      setRevealOrigin(rect)
      onUnlock()
      return
    }
    setTapping(true)
    window.setTimeout(() => setTapping(false), 320)
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
