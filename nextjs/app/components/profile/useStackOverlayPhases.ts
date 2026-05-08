'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MustEatAlbumCard } from '@/lib/types';

// Lift = position move + flip combined. Snappier than before so the user
// can start tilting almost immediately. The flip itself completes within
// the first ~60% of this window; tilt is enabled from frame one.
export const LIFT_DURATION_MS = 520;
// Time the lifted card sits at centre, tilt-able, before automatically
// flying to its deck slot. No second click required.
export const LIFTED_DWELL_MS = 1500;
export const FLIGHT_DURATION_MS = 720;
export const SETTLE_FADE_MS = 220;

export type Phase = 'idle' | 'lifting' | 'lifted' | 'flying';

interface Args {
  cards: MustEatAlbumCard[];
  scrollToSlot: (order: number, behavior?: ScrollBehavior) => void;
  getSlotRect: (order: number) => DOMRect | null;
  onCardPlaced: (order: number) => void;
  onAllPlaced: () => void;
}

export function useStackOverlayPhases({
  cards,
  scrollToSlot,
  getSlotRect,
  onCardPlaced,
  onAllPlaced,
}: Args) {
  const [topIndex, setTopIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [target, setTarget] = useState<DOMRect | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  // Where the stack escapes to when a card is flying. The stack always
  // flees into the OPPOSITE viewport quadrant from the slot, so it ends
  // up in a corner regardless of column / row — otherwise on middle-row
  // slots the gentle vertical offset wasn't enough to clear the stack
  // thickness from the slot's pixel area.
  const [escapeRight, setEscapeRight] = useState(false);
  const [escapeYShiftVh, setEscapeYShiftVh] = useState(-24);

  // Lock body scroll while a card is in flight so the slot rect stays
  // stable — scrolling mid-flight shifts the target and the card "chases"
  // the wrong position.  Also lock during the celebration overlay.
  useEffect(() => {
    if (phase === 'idle' && !celebrating) return;
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, [phase, celebrating]);

  const handleStackClick = useCallback(() => {
    if (phase !== 'idle' || topIndex >= cards.length) return;
    // Request gyroscope permission on iOS 13+ so the lifted card gets gyro
    // tilt active during the dwell. Fire-and-forget — animation proceeds
    // regardless.
    const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof DOE.requestPermission === 'function') DOE.requestPermission().catch(() => {});
    setPhase('lifting');
    const card = cards[topIndex];
    if (card && typeof card.order === 'number') scrollToSlot(card.order);
    window.setTimeout(() => setPhase('lifted'), LIFT_DURATION_MS);
  }, [phase, topIndex, cards, scrollToSlot]);

  // Auto-advance from lifted → flying after the dwell. Re-scrolls to the
  // target slot so the landing is visible even if the user moved the
  // viewport during the dwell window.
  // Uses 'instant' scroll so the position settles in the same frame and the
  // subsequent rAF measurement reads the correct final rect — a smooth
  // re-scroll would still be mid-animation after a fixed 80ms delay.
  useEffect(() => {
    if (phase !== 'lifted') return;
    let rafId: number | undefined;
    const dwellTimer = window.setTimeout(() => {
      const card = cards[topIndex];
      if (!card || typeof card.order !== 'number') return;
      const order = card.order;
      scrollToSlot(order, 'instant');
      rafId = window.requestAnimationFrame(() => {
        const targetRect = getSlotRect(order);
        if (!targetRect) return;
        // Always escape into the viewport quadrant OPPOSITE the slot, so
        // the stack ends up in a corner clear of the flying card's path
        // and the landed-card slot.  Picking just a side wasn't enough on
        // middle-row slots where the stack stayed at the same height as
        // the slot.
        const slotMidX = targetRect.left + targetRect.width / 2;
        const slotMidY = targetRect.top + targetRect.height / 2;
        const vpWNow = window.innerWidth;
        const vpHNow = window.innerHeight;
        setEscapeRight(slotMidX < vpWNow / 2);
        setEscapeYShiftVh(slotMidY < vpHNow / 2 ? 24 : -24);
        setPhase('flying');
        setTarget(targetRect);
      });
    }, LIFTED_DWELL_MS);
    return () => {
      clearTimeout(dwellTimer);
      if (rafId !== undefined) cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, topIndex]);

  // Fired the instant the FlyingCard's position animation lands at the
  // target slot (t = FLIGHT_DURATION_MS). We reveal the slot HERE so the
  // FlipSlot is already solid by the time the FlyingCard starts fading —
  // no blink-gap between card disappearing and slot appearing.
  const handleCardLanded = useCallback(() => {
    const card = cards[topIndex];
    if (card && typeof card.order === 'number') onCardPlaced(card.order);
  }, [cards, topIndex, onCardPlaced]);

  // Fired AFTER the FlyingCard's settle-fade completes (t = FLIGHT + FADE).
  // Cleans up the active card and advances to the next stack card.
  const handleFlightDone = useCallback(() => {
    setTarget(null);
    setTopIndex((i) => i + 1);
    setPhase('idle');
    if (topIndex + 1 >= cards.length) {
      setCelebrating(true); // celebration plays; onAllPlaced fires after it exits
    }
  }, [topIndex, cards.length]);

  // Called by CelebrationOverlay after its auto-dismiss timer fires.
  const handleCelebrationDone = useCallback(() => {
    setCelebrating(false);
    window.setTimeout(onAllPlaced, 320); // wait for celebration exit-fade
  }, [onAllPlaced]);

  return {
    topIndex,
    phase,
    target,
    celebrating,
    escapeRight,
    escapeYShiftVh,
    handleStackClick,
    handleCardLanded,
    handleFlightDone,
    handleCelebrationDone,
  };
}
