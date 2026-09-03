'use client';
import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useLoginModal } from '@/lib/auth';
import type { MapMustEat } from '@/lib/types';
import type { UserLocation } from '@/lib/map';
import type { UserLocationError } from '@/lib/map/useUserLocation';
import { LOCATION_ERROR_VISIBLE_MS, getLocationNoticeCopy } from '@/lib/map/locationStatus';
import MustEatRevealOverlay from './MustEatRevealOverlay';
import LazyMustEatImageLightbox from './LazyMustEatImageLightbox';
import MustEatDetailMobile from './MustEatDetailMobile';
import MustEatSheetBarLock from './MustEatSheetBarLock';
import { useMustEatDetailState } from './useMustEatDetailState';

const CARD_BACK = '/pics/card-back.webp?v=7';

interface MustEatDetailProps {
  mustEat: MapMustEat;
  userLocation: UserLocation | null;
  locationError?: UserLocationError | null;
  /** Same request the locate FAB fires — a covered card with no fix asks for
   *  one on tap instead of shaking at the visitor. */
  onRequestLocation?: () => void;
  isUnlocked: boolean;
  onUnlock: () => Promise<boolean>;
  onClose: () => void;
  onViewRestaurant?: () => void;
  /** Global must-eat pager — adjacent cards + page handlers. */
  prevMustEat?: MapMustEat | null;
  nextMustEat?: MapMustEat | null;
  prevUnlocked?: boolean;
  nextUnlocked?: boolean;
  onPagePrev?: () => void;
  onPageNext?: () => void;
  /** Stand im globalen Stapel, 1-basiert — der Zoom zeigt ihn als Zähler. */
  position?: { index: number; count: number };
  uid?: string | null;
}

export default function MustEatDetail({
  mustEat,
  userLocation,
  locationError,
  onRequestLocation,
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
  position,
  uid,
}: MustEatDetailProps) {
  const tMustEats = useTranslations('mustEats');
  const locale = useLocale();
  /* „Standort blockiert" ist keine Zeile der Karte, sondern eine Meldung — in
     derselben Karte, mit denselben Worten, die Map und Startseite für eine
     verweigerte Berechtigung zeigen (Nutzer, 02.09.2026: „soll eine Meldung
     sein wie auf der Startseite"). Der Automat der Map schweigt im Detail
     (MapSectionBody: sheetView !== 'detail'), also spricht hier der Tipp auf
     die Karte. Selbstabgang wie dort; „Alles klar" räumt früher ab. */
  const handleLocationBlocked = useCallback(() => {
    const copy = getLocationNoticeCopy(locale, 'denied', false);
    if (!copy) return;
    window.showNotice?.({
      tone: 'warning',
      icon: 'pin',
      ...copy,
      onDismiss: () => {},
      duration: LOCATION_ERROR_VISIBLE_MS,
    });
  }, [locale]);
  // Demo flag (?revealdemo): show the card face-down and let a tap play the
  // reveal fly-animation regardless of distance/auth. Loading the map once
  // with ?revealdemo latches it into sessionStorage so it survives in-app
  // navigation for the whole session (no need to keep the param in the URL).
  const [demo] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (new URLSearchParams(window.location.search).has('revealdemo')) {
      try {
        sessionStorage.setItem('revealdemo', '1');
      } catch {
        /* ignore */
      }
      return true;
    }
    try {
      return sessionStorage.getItem('revealdemo') === '1';
    } catch {
      return false;
    }
  });
  // Keep the map in place and use the shared login layer. The previous
  // standalone route made this reveal flow leave the map entirely.
  const { open: openLoginModal } = useLoginModal();
  const handleRequireLogin = useCallback(() => {
    openLoginModal('starter');
  }, [openLoginModal]);
  const state = useMustEatDetailState({
    mustEat,
    userLocation,
    onUnlock,
    isAuthed: Boolean(uid),
    onRequireLogin: handleRequireLogin,
    demo,
    locationError,
    onRequestLocation,
    onLocationBlocked: handleLocationBlocked,
  });
  // In demo the card stays face-down until the reveal animation finishes, then
  // latches open in place. Real flow: the entitlement flips `isUnlocked`.
  const [demoRevealed, setDemoRevealed] = useState(false);
  const [demoMustEat, setDemoMustEat] = useState<MapMustEat | null>(null);
  // Once the card has flown back onto its slot, the "VERDECKT" stamp burns
  // away to expose the dish name underneath.
  const [stampBurning, setStampBurning] = useState(false);
  const effectiveUnlocked = demo ? demoRevealed : isUnlocked;
  const visibleMustEat = demoMustEat?._id === mustEat._id ? demoMustEat : mustEat;

  useEffect(() => {
    if (!demo) return;
    setDemoRevealed(false);
    setStampBurning(false);
    setDemoMustEat(null);
  }, [demo, mustEat._id]);

  useEffect(() => {
    if (!demo || mustEat.image || demoMustEat?._id === mustEat._id) return;
    const ctrl = new AbortController();
    void (async () => {
      try {
        const r = await fetch(`/api/must-eat-demo?mustEatId=${encodeURIComponent(mustEat._id)}`, {
          signal: ctrl.signal,
        });
        if (!r.ok) return;
        const { mustEat: full } = (await r.json()) as { mustEat?: MapMustEat };
        if (full?._id === mustEat._id) setDemoMustEat(full);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.warn('Must Eat demo preview failed', err);
        }
      }
    })();
    return () => ctrl.abort();
  }, [demo, demoMustEat?._id, mustEat._id, mustEat.image]);

  const r = state.revealOrigin;

  return (
    <>
      {/* Browserleisten auf dem Telefon so dunkel wie das Sheet — solange es
          offen ist (siehe MustEatSheetBarLock). */}
      <MustEatSheetBarLock />
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
        position={position}
        state={state}
      />
      {r && (
        <MustEatRevealOverlay
          // Covered cards arrive stripped; the reveal response merges the real
          // image in well before the ~800 ms flip exposes the card face. Until
          // then the overlay shows the card-back it animates anyway.
          imageUrl={visibleMustEat.image ?? CARD_BACK}
          alt={visibleMustEat.dish ?? ''}
          originRect={r}
          // Fly back onto the card's own slot and land face-up there (instead
          // of shrinking off toward the header) — the detail reveals in place.
          flyOutTarget={{ cx: r.left + r.width / 2, cy: r.top + r.height / 2, size: r.width }}
          landOpaque
          onDone={() => {
            state.handleRevealDone();
            if (demo) setDemoRevealed(true);
            // Card has landed → dish name and description fade in calmly
            // (0.9s, the description 0.16s behind — see .fdNameUnblurring and
            // .fdTextRevealing). The class comes off once both have settled.
            setStampBurning(true);
            window.setTimeout(() => setStampBurning(false), 1300);
          }}
        />
      )}
      {/* Der Zoom blättert durch denselben Stapel wie das Detail darunter —
          Wisch, Pfeile, Zähler wie in der Foto-Galerie. Der Zoom öffnet nur
          auf einer aufgedeckten Karte (handleCardZoom), unterwegs darf er aber
          auf einer verdeckten landen: die zeigt ihren Rücken, so wie die
          /must-eats-Galerie ihre verdeckten Karten im Zoom zeigt. Ein
          aufgedecktes Bild ohne Quelle (Datensatz gerade im Nachladen) bleibt
          null — die Lightbox hält dann das letzte Bild, statt kurz den Rücken
          zu zeigen. */}
      <LazyMustEatImageLightbox
        active={Boolean(state.zoomRect || state.zoomActive)}
        imageUrl={effectiveUnlocked ? (visibleMustEat.image ?? null) : CARD_BACK}
        alt={effectiveUnlocked ? (visibleMustEat.dish ?? '') : tMustEats('covered')}
        originRect={state.zoomRect}
        onClose={state.handleZoomClose}
        onOpenReady={state.handleZoomReady}
        // Origin-Karte erst wieder einblenden, wenn der Fly-Back-Klon
        // unmountet — sonst sieht man sie doppelt während des Zooms.
        onExitComplete={state.handleZoomExitComplete}
        onPrev={onPagePrev}
        onNext={onPageNext}
        hasPrev={Boolean(prevMustEat)}
        hasNext={Boolean(nextMustEat)}
        position={position}
      />
    </>
  );
}
