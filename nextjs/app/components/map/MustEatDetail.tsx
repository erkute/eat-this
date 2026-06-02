'use client'
import { useState } from 'react'
import type { MapMustEat } from '@/lib/types'
import type { UserLocation } from '@/lib/map'
import MustEatRevealOverlay from './MustEatRevealOverlay'
import MustEatImageLightbox from './MustEatImageLightbox'
import MustEatDetailMobile from './MustEatDetailMobile'
import { useMustEatDetailState } from './useMustEatDetailState'

interface MustEatDetailProps {
  mustEat: MapMustEat
  userLocation: UserLocation | null
  isUnlocked: boolean
  onUnlock: () => void
  onClose: () => void
  onBack?: () => void
  onViewRestaurant?: () => void
  /** Global must-eat pager — adjacent cards + page handlers. */
  prevMustEat?: MapMustEat | null
  nextMustEat?: MapMustEat | null
  prevUnlocked?: boolean
  nextUnlocked?: boolean
  onPagePrev?: () => void
  onPageNext?: () => void
  uid?: string | null
}

export default function MustEatDetail({
  mustEat,
  userLocation,
  isUnlocked,
  onUnlock,
  onClose,
  onBack,
  onViewRestaurant,
  prevMustEat,
  nextMustEat,
  prevUnlocked,
  nextUnlocked,
  onPagePrev,
  onPageNext,
  uid,
}: MustEatDetailProps) {
  // Demo flag (?revealdemo): show the card face-down and let a tap play the
  // reveal fly-animation regardless of distance/auth. Loading the map once
  // with ?revealdemo latches it into sessionStorage so it survives in-app
  // navigation for the whole session (no need to keep the param in the URL).
  const [demo] = useState(() => {
    if (typeof window === 'undefined') return false
    if (new URLSearchParams(window.location.search).has('revealdemo')) {
      try { sessionStorage.setItem('revealdemo', '1') } catch { /* ignore */ }
      return true
    }
    try { return sessionStorage.getItem('revealdemo') === '1' } catch { return false }
  })
  const state = useMustEatDetailState({ mustEat, userLocation, onUnlock, isAuthed: Boolean(uid), demo })
  // In demo the card stays face-down until the reveal animation finishes, then
  // latches open in place. Real flow: the entitlement flips `isUnlocked`.
  const [demoRevealed, setDemoRevealed] = useState(false)
  // Once the card has flown back onto its slot, the "VERDECKT" stamp burns
  // away to expose the dish name underneath.
  const [stampBurning, setStampBurning] = useState(false)
  const effectiveUnlocked = demo ? demoRevealed : isUnlocked

  const r = state.revealOrigin

  return (
    <>
      <MustEatDetailMobile
        mustEat={mustEat}
        isUnlocked={effectiveUnlocked}
        nameBurning={stampBurning}
        onClose={onClose}
        onBack={onBack}
        onViewRestaurant={onViewRestaurant}
        prevMustEat={prevMustEat}
        nextMustEat={nextMustEat}
        prevUnlocked={prevUnlocked}
        nextUnlocked={nextUnlocked}
        onPagePrev={onPagePrev}
        onPageNext={onPageNext}
        uid={uid}
        state={state}
      />
      {r && (
        <MustEatRevealOverlay
          imageUrl={mustEat.image}
          alt={mustEat.dish}
          originRect={r}
          // Fly back onto the card's own slot and land face-up there (instead
          // of shrinking off toward the header) — the detail reveals in place.
          flyOutTarget={{ cx: r.left + r.width / 2, cy: r.top + r.height / 2, size: r.width }}
          landOpaque
          onDone={() => {
            state.handleRevealDone()
            if (demo) setDemoRevealed(true)
            // Card has landed → burn the stamp off (right-to-left), then the
            // name un-blurs. Covers the 1.7s burn + 0.55s delayed un-blur.
            setStampBurning(true)
            window.setTimeout(() => setStampBurning(false), 2350)
          }}
        />
      )}
      <MustEatImageLightbox
        imageUrl={mustEat.image}
        alt={mustEat.dish}
        originRect={state.zoomRect}
        onClose={state.handleZoomClose}
      />
    </>
  )
}
