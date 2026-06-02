'use client'
import type { MapMustEat } from '@/lib/types'
import type { UserLocation } from '@/lib/map'
import MustEatRevealOverlay from './MustEatRevealOverlay'
import MustEatImageLightbox from './MustEatImageLightbox'
import MustEatDetailMobile from './MustEatDetailMobile'
import MustEatDetailDesktop from './MustEatDetailDesktop'
import { useMustEatDetailState } from './useMustEatDetailState'

interface MustEatDetailProps {
  mustEat: MapMustEat
  userLocation: UserLocation | null
  isUnlocked: boolean
  onUnlock: () => void
  onClose: () => void
  onBack?: () => void
  onViewRestaurant?: () => void
  /** Global must-eat pager — adjacent cards + page handlers. Phase 2 wires
   *  the markup; threaded through now so the data is in place. */
  prevMustEat?: MapMustEat | null
  nextMustEat?: MapMustEat | null
  onPagePrev?: () => void
  onPageNext?: () => void
  inSheet?: boolean
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
  onPagePrev,
  onPageNext,
  inSheet,
  uid,
}: MustEatDetailProps) {
  const state = useMustEatDetailState({ mustEat, userLocation, onUnlock, isAuthed: Boolean(uid) })

  return (
    <>
      {inSheet ? (
        <MustEatDetailMobile
          mustEat={mustEat}
          isUnlocked={isUnlocked}
          onClose={onClose}
          onBack={onBack}
          onViewRestaurant={onViewRestaurant}
          prevMustEat={prevMustEat}
          nextMustEat={nextMustEat}
          onPagePrev={onPagePrev}
          onPageNext={onPageNext}
          uid={uid}
          state={state}
        />
      ) : (
        <MustEatDetailDesktop
          mustEat={mustEat}
          isUnlocked={isUnlocked}
          onClose={onClose}
          onViewRestaurant={onViewRestaurant}
          prevMustEat={prevMustEat}
          nextMustEat={nextMustEat}
          onPagePrev={onPagePrev}
          onPageNext={onPageNext}
          uid={uid}
          state={state}
        />
      )}
      {state.revealOrigin && (
        <MustEatRevealOverlay
          imageUrl={mustEat.image}
          alt={mustEat.dish}
          originRect={state.revealOrigin}
          onDone={state.handleRevealDone}
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
