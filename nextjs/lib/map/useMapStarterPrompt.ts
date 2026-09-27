'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useLoginModal } from '@/lib/auth/LoginModalContext';
import { starterPromptPaused } from '@/lib/auth/starterPromptCooldown';

interface Options {
  active: boolean;
  guest: boolean;
  spotId: string | null;
  detailOpen: boolean;
}

/** Offer the pack at a natural break, never while someone is reading a spot. */
export function useMapStarterPrompt({ active, guest, spotId, detailOpen }: Options) {
  const { isOpen, open } = useLoginModal();
  const spots = useRef(new Set<string>());
  const activeMs = useRef(0);
  const wasDetailOpen = useRef(false);
  const lastInteraction = useRef(0);
  const returnedToList = useRef(false);

  const offer = useCallback(() => {
    if (!active || !guest || isOpen || detailOpen || !returnedToList.current) return;
    if (spots.current.size < 3 || activeMs.current < 45_000) return;
    if (document.visibilityState !== 'visible' || starterPromptPaused()) return;
    // Closing animations may still leave a dialog mounted for a moment.
    // Retry on the next tick rather than losing the invitation forever.
    if (document.querySelector('[aria-modal="true"], dialog[open]')) return;
    returnedToList.current = false;
    open({ kind: 'map-prompt' });
  }, [active, guest, isOpen, detailOpen, open]);

  useEffect(() => {
    if (!active || !guest || isOpen) return;
    let lastTick = Date.now();
    const interact = () => {
      lastInteraction.current = Date.now();
    };
    const visibility = () => {
      lastTick = Date.now();
    };
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    events.forEach((event) => window.addEventListener(event, interact, { passive: true }));
    document.addEventListener('visibilitychange', visibility);
    const timer = window.setInterval(() => {
      const now = Date.now();
      if (document.visibilityState === 'visible' && now - lastInteraction.current < 30_000) {
        activeMs.current += Math.min(now - lastTick, 1000);
      }
      lastTick = now;
      offer();
    }, 1000);
    return () => {
      clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, interact));
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [active, guest, isOpen, offer]);

  useEffect(() => {
    const justClosed = wasDetailOpen.current && !detailOpen;
    wasDetailOpen.current = active && detailOpen;
    if (!active || !guest) return;
    if (detailOpen && spotId) {
      spots.current.add(spotId);
      lastInteraction.current = Date.now();
    }
    if (justClosed) returnedToList.current = true;
    offer();
  }, [active, guest, spotId, detailOpen, offer]);
}
