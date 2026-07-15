'use client'
import { useCallback, useRef, useState } from 'react'
import { haversineDistance, type UserLocation } from '@/lib/map'
import type { MapMustEat } from '@/lib/types'
import { trackEvent } from '@/lib/analytics'

export const UNLOCK_RADIUS_METERS = 50

function vibrateRevealReady() {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  navigator.vibrate([22, 18, 28])
}

interface Args {
  mustEat: MapMustEat
  userLocation: UserLocation | null
  /** Persist the unlock and report whether the server returned the full card. */
  onUnlock: () => Promise<boolean>
  // Anon visitors must not enter the reveal-overlay path — the overlay
  // doesn't (and shouldn't) advance phases without a signed-in user. An
  // in-range guest tap routes to login instead (see onRequireLogin).
  isAuthed: boolean
  // Guest within the unlock radius taps the card → login gate ("want this
  // Must Eat in your deck? log in"). Out-of-range taps keep the shake.
  onRequireLogin?: () => void
  // Demo mode (?revealdemo): play the reveal animation on tap regardless of
  // distance/auth, with no unlock side effects — lets the look be reviewed
  // without physically walking into a 50 m radius.
  demo?: boolean
}

export function useMustEatDetailState({ mustEat, userLocation, onUnlock, isAuthed, onRequireLogin, demo }: Args) {
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
  const [unlockingId, setUnlockingId] = useState<string | null>(null)
  const [unlockErrorId, setUnlockErrorId] = useState<string | null>(null)
  const unlockingRef = useRef(false)
  const currentMustEatIdRef = useRef(mustEat._id)
  currentMustEatIdRef.current = mustEat._id
  const unlocking = unlockingId === mustEat._id
  const unlockError = unlockErrorId === mustEat._id

  // While `revealOrigin` is set, the body-portaled overlay takes over the
  // unlock moment — the inline locked card is hidden so it visually morphs
  // into the overlay instead of duplicating it.
  const [revealOrigin, setRevealOrigin] = useState<DOMRect | null>(null)

  const handleCardClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Demo: play the animation only, no unlock/persist side effects.
    if (demo) {
      vibrateRevealReady()
      setRevealOrigin(e.currentTarget.getBoundingClientRect())
      return
    }
    if (canUnlock && isAuthed) {
      if (unlockingRef.current) return
      unlockingRef.current = true
      const mustEatId = mustEat._id
      setUnlockingId(mustEatId)
      setUnlockErrorId(null)
      const rect = e.currentTarget.getBoundingClientRect()
      try {
        const persisted = await onUnlock()
        // Paging can replace the selected card while the request is in flight.
        // Never animate the old card's origin onto a new detail.
        if (currentMustEatIdRef.current !== mustEatId) return
        if (!persisted) throw new Error('Must Eat unlock was not persisted')
        vibrateRevealReady()
        trackEvent('must_eat_reveal_attempt', {
          must_eat_id: mustEatId,
          restaurant_id: mustEat.restaurant._id,
          result: 'unlocked',
          distance_meters: distance === null ? -1 : Math.round(distance),
        })
        setRevealOrigin(rect)
      } catch {
        if (currentMustEatIdRef.current !== mustEatId) return
        trackEvent('must_eat_reveal_attempt', {
          must_eat_id: mustEatId,
          restaurant_id: mustEat.restaurant._id,
          result: 'failed',
          distance_meters: distance === null ? -1 : Math.round(distance),
        })
        setUnlockErrorId(mustEatId)
      } finally {
        unlockingRef.current = false
        setUnlockingId((activeId) => (activeId === mustEatId ? null : activeId))
      }
      return
    }
    // In range but not signed in: the reveal is earned — route to login so it
    // can land in the user's deck.
    if (canUnlock && !isAuthed && onRequireLogin) {
      trackEvent('must_eat_reveal_attempt', {
        must_eat_id: mustEat._id,
        restaurant_id: mustEat.restaurant._id,
        result: 'login_required',
        distance_meters: distance === null ? -1 : Math.round(distance),
      })
      onRequireLogin()
      return
    }
    trackEvent('must_eat_reveal_attempt', {
      must_eat_id: mustEat._id,
      restaurant_id: mustEat.restaurant._id,
      result: distance === null ? 'location_missing' : 'too_far',
      distance_meters: distance === null ? -1 : Math.round(distance),
    })
    setTapping(true)
    window.setTimeout(() => setTapping(false), 600)
  }
  const handleRevealDone = () => setRevealOrigin(null)

  // Click-to-zoom on the unlocked card. Origin rect lets the lightbox fly out
  // from where the card sat and back to that exact spot on close.
  const [zoomRect, setZoomRect] = useState<DOMRect | null>(null)
  // True from open through the fly-back exit (until the lightbox clone
  // unmounts via onExitComplete). The detail hides the origin card the whole
  // time so it never shows doubled (zoom-clone + static slot card at once).
  const [zoomActive, setZoomActive] = useState(false)
  const zoomActiveRef = useRef(false)
  const handleCardZoom = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!mustEat.image || zoomActiveRef.current) return
    zoomActiveRef.current = true
    setZoomRect(e.currentTarget.getBoundingClientRect())
  }
  // A cold dynamic import can take a moment. Keep the inline card visible
  // until the lightbox clone has actually mounted, then swap them atomically.
  const handleZoomReady = useCallback(() => setZoomActive(true), [])
  const handleZoomClose = () => setZoomRect(null)
  const handleZoomExitComplete = () => {
    zoomActiveRef.current = false
    setZoomActive(false)
  }

  return {
    distance,
    canUnlock,
    vibrateIntensity,
    tapping,
    unlocking,
    unlockError,
    revealOrigin,
    zoomRect,
    zoomActive,
    handleCardClick,
    handleRevealDone,
    handleCardZoom,
    handleZoomReady,
    handleZoomClose,
    handleZoomExitComplete,
  }
}

export type MustEatDetailState = ReturnType<typeof useMustEatDetailState>
