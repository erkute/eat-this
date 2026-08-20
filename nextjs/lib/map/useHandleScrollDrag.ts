'use client';
import { useEffect, type RefObject } from 'react';
import { measureSheetTop, resolveSnap, snapOffsets } from './phoneSheetSnaps';

const PHONE_MAX = 767.98;

function isPhone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(max-width: ${PHONE_MAX}px)`).matches;
}

/**
 * Give the phone sheet a grabbable handle WITHOUT turning it back into a
 * transformed layer.
 *
 * The phone list/detail are window-scrolled in-flow documents on purpose: only
 * document scroll makes iOS Safari collapse its bottom URL bar and sample real
 * content behind the translucent chrome (see useBottomSheet's inflow gates). A
 * classic drag sheet would need `position: fixed` + `transform`, which kills
 * both — and a composited layer is exactly what broke the bar backdrop before.
 *
 * So the handle drives the native scroller instead of a transform: the finger
 * maps 1:1 onto window.scrollY, which keeps every Safari behaviour intact while
 * still feeling like you are moving the sheet.
 *
 * `dragMode: 'all'` was rejected upstream because binding touchmove on the
 * CONTENT would swallow the page's own scrolling. That objection does not apply
 * here: only the ~40x5 px handle claims its gesture, so the rows keep native
 * scroll untouched.
 */
export function useHandleScrollDrag(
  handleRef: RefObject<HTMLDivElement | null>,
  // Also re-binds the listeners — the handle element is swapped between views.
  view: 'list' | 'detail'
): void {
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;

    let drag: { pointerId: number; startY: number; startScrollY: number } | null = null;

    const onDown = (e: PointerEvent) => {
      // Tablets/desktop still use the real transform sheet in useBottomSheet.
      if (!isPhone()) return;
      drag = { pointerId: e.pointerId, startY: e.clientY, startScrollY: window.scrollY };
      try {
        handle.setPointerCapture(e.pointerId);
      } catch {
        /* capture is best-effort; the window listeners below still track. */
      }
      // Claims ONLY the handle's gesture — the list keeps native scrolling.
      e.preventDefault();
    };

    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      // Finger up ⇒ clientY shrinks ⇒ scroll further down ⇒ sheet rises over
      // the map, matching what the hand is doing.
      const next = Math.max(0, drag.startScrollY + (drag.startY - e.clientY));
      // globals.css sets `scroll-behavior: smooth` document-wide; without an
      // explicit instant the sheet would ease along behind the finger.
      window.scrollTo({ top: next, behavior: 'instant' as ScrollBehavior });
    };

    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      try {
        handle.releasePointerCapture(drag.pointerId);
      } catch {
        /* already released (pointercancel) — nothing to undo. */
      }
      /* Settle on one of the three stops. Deliberately only on RELEASE of the
         handle: CSS scroll-snap applies to the whole document and would tug at
         the rows while reading further down the list. */
      const target = resolveSnap(
        snapOffsets(view, window.innerHeight, measureSheetTop()),
        window.scrollY,
        drag.startScrollY
      );
      drag = null;
      if (target !== window.scrollY) {
        window.scrollTo({ top: target, behavior: 'smooth' });
      }
    };

    handle.addEventListener('pointerdown', onDown);
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
    return () => {
      handle.removeEventListener('pointerdown', onDown);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
    };
  }, [handleRef, view]);
}
