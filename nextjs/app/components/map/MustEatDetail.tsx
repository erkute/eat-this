'use client';
import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useLoginModal } from '@/lib/auth';
import { rememberPendingStarterCard } from '@/lib/auth/pendingStarterCard';
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
      layer: true,
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
  /* Ein Gast tippt auf den Ruecken: sofort das Anmeldeformular, im
     Starter-Pack-Modus. Dazwischen stand am 07.09.2026 fuer ein paar Stunden
     eine Tafel als Layer („Gratis · Starter Pack · Starter Pack holen"), die
     erst per Knopf zum Formular fuehrte — ein Klick zu viel (Betreiber,
     07.09.2026: „soll sofort das Anmeldeformular oeffnen"). Die angetippte
     Karte reist als Absicht mit (pendingStarterCard), damit das Pack sie
     garantiert offen enthaelt. */
  const handleRequireLogin = useCallback(() => {
    rememberPendingStarterCard(mustEat._id);
    openLoginModal('starter', { starterMustEatId: mustEat._id });
  }, [openLoginModal, mustEat._id]);
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
  // Once the card has flown back onto its slot, the "VERDECKT" stamp burns
  // away to expose the dish name underneath.
  const [stampBurning, setStampBurning] = useState(false);
  const effectiveUnlocked = demo ? demoRevealed : isUnlocked;

  useEffect(() => {
    if (!demo) return;
    setDemoRevealed(false);
    setStampBurning(false);
  }, [demo, mustEat._id]);

  const r = state.revealOrigin;

  return (
    <>
      {/* Browserleisten auf dem Telefon so dunkel wie das Sheet — solange es
          offen ist (siehe MustEatSheetBarLock). */}
      <MustEatSheetBarLock />
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
        position={position}
        state={state}
        guest={!uid}
      />
      {r && (
        <MustEatRevealOverlay
          // Covered cards arrive stripped; the reveal response merges the real
          // image in well before the ~800 ms flip exposes the card face. Until
          // then the overlay shows the card-back it animates anyway.
          imageUrl={mustEat.image ?? CARD_BACK}
          alt={mustEat.dish ?? ''}
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
        imageUrl={effectiveUnlocked ? (mustEat.image ?? null) : CARD_BACK}
        alt={effectiveUnlocked ? (mustEat.dish ?? '') : tMustEats('covered')}
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
