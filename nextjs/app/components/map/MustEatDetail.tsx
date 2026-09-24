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
  /** Offene Karten gegen alle — die Bühne des Aufdeckens zählt eins hoch. */
  collection?: { count: number; total: number };
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
  collection,
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
  const [demoSession] = useState(() => {
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
  /* Vorgespielt wird nur eine Karte, die schon offen ist. Eine verdeckte kommt
     ohne Bild und Gericht vom Server (stripCoveredMustEats) — die Demo drehte
     sie um und zeigte wieder den Rücken, mit leerem Namen darunter (Betreiber,
     24.09.2026: „ist es normal, dass die Karte sich nicht aufdeckt?"). Eine
     verdeckte Karte verhält sich deshalb auch mit ?revealdemo wie immer. */
  const demo = demoSession && isUnlocked && Boolean(mustEat.image);
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
    openLoginModal({ kind: 'card', mustEatId: mustEat._id });
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
  // True while the reveal stage covers the whole sheet — the open text may
  // stand underneath then, so the closing iris uncovers it finished.
  const [stageCovered, setStageCovered] = useState(false);
  // In demo the card stays face-down until the stage covers the sheet, then
  // latches open in place. Real flow: the entitlement flips `isUnlocked`.
  const [demoRevealed, setDemoRevealed] = useState(false);
  const effectiveUnlocked = demo ? demoRevealed : isUnlocked;

  useEffect(() => {
    setStageCovered(false);
    if (demo) setDemoRevealed(false);
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
        revealCovered={stageCovered}
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
          // image in before the stage flips the card (it waits for the face to
          // decode). Until then the stage holds the card-back it shakes anyway.
          imageUrl={mustEat.image ?? CARD_BACK}
          dish={mustEat.dish ?? ''}
          originRect={r}
          status={state.revealStatus}
          // Der Zähler zeigt den Stand MIT dieser Karte. Im echten Ablauf ist
          // sie beim Umdrehen schon im Set; die Demo speichert nichts und
          // spielt eine neue Karte vor.
          collection={
            collection && {
              count: demo ? collection.count + 1 : collection.count,
              total: collection.total,
            }
          }
          onCovered={() => {
            setStageCovered(true);
            if (demo && state.revealStatus === 'ok') setDemoRevealed(true);
          }}
          onDone={() => {
            setStageCovered(false);
            state.handleRevealDone();
          }}
          // Nicht gespeichert: die Karte liegt verdeckt wieder im Sheet, und
          // dort steht „Hat nicht geklappt".
          onAbort={() => {
            setStageCovered(false);
            state.handleRevealDone();
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
