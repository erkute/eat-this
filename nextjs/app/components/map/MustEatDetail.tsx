'use client'
import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { routing } from '@/i18n/routing'
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
  // Guest revealed on site (within 50 m) → login gate: the card goes into
  // the deck only with an account.
  const router = useRouter()
  const locale = useLocale()
  const handleRequireLogin = useCallback(() => {
    const base = locale === routing.defaultLocale ? '/login' : `/${locale}/login`
    router.push(`${base}?ctx=musteat`)
  }, [router, locale])
  const state = useMustEatDetailState({ mustEat, userLocation, onUnlock, isAuthed: Boolean(uid), onRequireLogin: handleRequireLogin, demo })
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
        onViewRestaurant={onViewRestaurant}
        prevMustEat={prevMustEat}
        nextMustEat={nextMustEat}
        prevUnlocked={prevUnlocked}
        nextUnlocked={nextUnlocked}
        onPagePrev={onPagePrev}
        onPageNext={onPageNext}
        state={state}
      />
      {r && (
        <MustEatRevealOverlay
          // Covered cards arrive stripped; the reveal response merges the real
          // image in well before the ~800 ms flip exposes the card face. Until
          // then the overlay shows the card-back it animates anyway.
          imageUrl={mustEat.image ?? '/pics/card-back.webp?v=6'}
          alt={mustEat.dish ?? ''}
          originRect={r}
          // Fly back onto the card's own slot and land face-up there (instead
          // of shrinking off toward the header) — the detail reveals in place.
          flyOutTarget={{ cx: r.left + r.width / 2, cy: r.top + r.height / 2, size: r.width }}
          landOpaque
          onDone={() => {
            state.handleRevealDone()
            if (demo) setDemoRevealed(true)
            // Card has landed → the blurred dish name slowly sharpens into
            // focus (0.2s delay + 1.9s unblur, see .fdNameUnblurring).
            setStampBurning(true)
            window.setTimeout(() => setStampBurning(false), 2350)
          }}
        />
      )}
      <MustEatImageLightbox
        imageUrl={mustEat.image ?? ''}
        alt={mustEat.dish ?? ''}
        originRect={state.zoomRect}
        onClose={state.handleZoomClose}
      />
    </>
  )
}
