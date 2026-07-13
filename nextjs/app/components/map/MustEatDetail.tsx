'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import type { MapMustEat } from '@/lib/types'
import type { UserLocation } from '@/lib/map'
import MustEatRevealOverlay from './MustEatRevealOverlay'
import LazyMustEatImageLightbox from './LazyMustEatImageLightbox'
import MustEatDetailMobile from './MustEatDetailMobile'
import { useMustEatDetailState } from './useMustEatDetailState'

interface MustEatDetailProps {
  mustEat: MapMustEat
  userLocation: UserLocation | null
  isUnlocked: boolean
  onUnlock: () => Promise<boolean>
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
  const handleRequireLogin = useCallback(() => {
    router.push('/login?ctx=musteat')
  }, [router])
  const state = useMustEatDetailState({ mustEat, userLocation, onUnlock, isAuthed: Boolean(uid), onRequireLogin: handleRequireLogin, demo })
  // In demo the card stays face-down until the reveal animation finishes, then
  // latches open in place. Real flow: the entitlement flips `isUnlocked`.
  const [demoRevealed, setDemoRevealed] = useState(false)
  const [demoMustEat, setDemoMustEat] = useState<MapMustEat | null>(null)
  // Once the card has flown back onto its slot, the "VERDECKT" stamp burns
  // away to expose the dish name underneath.
  const [stampBurning, setStampBurning] = useState(false)
  const effectiveUnlocked = demo ? demoRevealed : isUnlocked
  const visibleMustEat = demoMustEat?._id === mustEat._id ? demoMustEat : mustEat

  useEffect(() => {
    if (!demo) return
    setDemoRevealed(false)
    setStampBurning(false)
    setDemoMustEat(null)
  }, [demo, mustEat._id])

  useEffect(() => {
    if (!demo || mustEat.image || demoMustEat?._id === mustEat._id) return
    const ctrl = new AbortController()
    void (async () => {
      try {
        const r = await fetch(`/api/must-eat-demo?mustEatId=${encodeURIComponent(mustEat._id)}`, {
          signal: ctrl.signal,
        })
        if (!r.ok) return
        const { mustEat: full } = (await r.json()) as { mustEat?: MapMustEat }
        if (full?._id === mustEat._id) setDemoMustEat(full)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.warn('Must Eat demo preview failed', err)
        }
      }
    })()
    return () => ctrl.abort()
  }, [demo, demoMustEat?._id, mustEat._id, mustEat.image])

  const r = state.revealOrigin

  return (
    <>
      <MustEatDetailMobile
        mustEat={visibleMustEat}
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
          imageUrl={visibleMustEat.image ?? '/pics/card-back.webp?v=6'}
          alt={visibleMustEat.dish ?? ''}
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
      <LazyMustEatImageLightbox
        active={Boolean(state.zoomRect || state.zoomActive)}
        imageUrl={visibleMustEat.image ?? ''}
        alt={visibleMustEat.dish ?? ''}
        originRect={state.zoomRect}
        onClose={state.handleZoomClose}
        onOpenReady={state.handleZoomReady}
        // Origin-Karte erst wieder einblenden, wenn der Fly-Back-Klon
        // unmountet — sonst sieht man sie doppelt während des Zooms.
        onExitComplete={state.handleZoomExitComplete}
      />
    </>
  )
}
