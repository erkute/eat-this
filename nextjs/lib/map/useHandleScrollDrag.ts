'use client';
import { useEffect, type RefObject } from 'react';
import { trackEvent } from '@/lib/analytics';
import { measureSheetTop, resolveSnap, snapOffsets } from './phoneSheetSnaps';
import {
  dropToMap,
  forgetListPosition,
  grabFromList,
  grabFromMap,
  holdSheetAt,
  raiseToList,
  rememberedListPosition,
  sinkBackToMap,
} from './sheetSlide';

const PHONE_MAX = 767.98;
/* Slack around a stop — rounded offsets and iOS rubber-banding land a few px
   off the exact value. */
const AT_STOP_PX = 24;
/* A pull this far, or a flick this fast, is a decision; less springs back. */
const INTENT_PX = 64;
const FLICK_PX_PER_MS = 0.5;
/* Below this much movement a release is a tap. */
const TAP_PX = 6;

function isPhone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(max-width: ${PHONE_MAX}px)`).matches;
}

type Drag =
  /* Between the stops: the finger drives the window scroller 1:1. */
  | { kind: 'scroll'; pointerId: number; startY: number; startScrollY: number }
  /* Deep in the list, or pulling a remembered list back up from the map: the
     finger drives the slab on screen (see sheetSlide.ts). */
  | {
      kind: 'slab';
      from: 'list' | 'map';
      pointerId: number;
      startY: number;
      base: number;
      offset: number;
      lastY: number;
      lastT: number;
      v: number;
    };

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
 * So between the stops the handle drives the native scroller: the finger maps
 * 1:1 onto window.scrollY, which keeps every Safari behaviour intact while
 * still feeling like you are moving the sheet.
 *
 * In the list the handle sits in the sticky filter bar, so it is on screen at
 * any depth. From deep in the list, scrolling back through every row is not
 * what a pull on the bar means — there the finger moves the visible slab
 * instead, the way the Google Maps and Airbnb sheets let you pull the list off
 * the map. A tap on the bar does the same. Back on the map, pulling the bar up
 * returns the list to where it was left. The transform lives only for the
 * gesture; see sheetSlide.ts.
 *
 * `dragMode: 'all'` was rejected upstream because binding touchmove on the
 * CONTENT would swallow the page's own scrolling. That objection does not apply
 * here: only the handle strip claims its gesture, so the rows keep native
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

    let drag: Drag | null = null;
    let busy = false;

    const sheetEl = () => handle.closest<HTMLElement>('[data-map-sheet]');
    const stops = () => snapOffsets(view, window.innerHeight, measureSheetTop());

    const onDown = (e: PointerEvent) => {
      // Tablets/desktop still use the real transform sheet in useBottomSheet.
      if (!isPhone() || busy) return;
      try {
        handle.setPointerCapture(e.pointerId);
      } catch {
        /* capture is best-effort; the window listeners below still track. */
      }
      // Claims ONLY the handle's gesture — the list keeps native scrolling.
      e.preventDefault();

      const sheet = sheetEl();
      const offsets = stops();
      const sheetStop = offsets[offsets.length - 1];
      const slab = (from: 'list' | 'map', base: number): Drag => ({
        kind: 'slab',
        from,
        pointerId: e.pointerId,
        startY: e.clientY,
        base,
        offset: base,
        lastY: e.clientY,
        lastT: e.timeStamp,
        v: 0,
      });

      if (view === 'list' && sheet) {
        if (window.scrollY > sheetStop + AT_STOP_PX) {
          drag = slab('list', grabFromList(sheet));
          return;
        }
        if (window.scrollY < sheetStop - AT_STOP_PX) {
          const base = grabFromMap(sheet);
          if (base !== null) {
            drag = slab('map', base);
            return;
          }
        }
      }
      drag = {
        kind: 'scroll',
        pointerId: e.pointerId,
        startY: e.clientY,
        startScrollY: window.scrollY,
      };
    };

    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      if (drag.kind === 'slab') {
        const sheet = sheetEl();
        if (!sheet) return;
        drag.offset = Math.min(
          window.innerHeight,
          Math.max(0, drag.base + (e.clientY - drag.startY))
        );
        const dt = e.timeStamp - drag.lastT;
        if (dt > 0) drag.v = (e.clientY - drag.lastY) / dt;
        drag.lastY = e.clientY;
        drag.lastT = e.timeStamp;
        holdSheetAt(sheet, drag.offset);
        return;
      }
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
      const d = drag;
      drag = null;

      if (d.kind === 'slab') {
        const sheet = sheetEl();
        if (!sheet) return;
        const moved = d.offset - d.base;
        const tap = Math.abs(e.clientY - d.startY) < TAP_PX && e.type === 'pointerup';
        const mapY = stops()[0];
        busy = true;
        let done: Promise<void>;
        if (d.from === 'list') {
          const toMap = tap || moved > INTENT_PX || d.v > FLICK_PX_PER_MS;
          if (toMap) trackEvent('map_view_toggle', { direction: 'to_map' });
          done = toMap ? dropToMap(sheet, d.offset, mapY) : raiseToList(sheet, d.offset);
        } else {
          const toList = tap || moved < -INTENT_PX || d.v < -FLICK_PX_PER_MS;
          if (toList) trackEvent('map_view_toggle', { direction: 'to_list' });
          done = toList
            ? raiseToList(sheet, d.offset)
            : sinkBackToMap(sheet, d.offset, d.base, mapY);
        }
        void done.finally(() => {
          busy = false;
        });
        return;
      }

      /* Settle on one of the three stops. Deliberately only on RELEASE of the
         handle: CSS scroll-snap applies to the whole document and would tug at
         the rows while reading further down the list. */
      const target = resolveSnap(stops(), window.scrollY, d.startScrollY);
      if (target !== window.scrollY) {
        window.scrollTo({ top: target, behavior: 'smooth' });
      }
    };

    /* A list position is only worth returning to while you are looking at the
       map. Scroll into the list by hand and that is the new place. */
    const onScroll = () => {
      if (busy || drag || rememberedListPosition() === null) return;
      const offsets = stops();
      if (window.scrollY > offsets[offsets.length - 1] + AT_STOP_PX) forgetListPosition();
    };

    handle.addEventListener('pointerdown', onDown);
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      handle.removeEventListener('pointerdown', onDown);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      window.removeEventListener('scroll', onScroll);
    };
  }, [handleRef, view]);
}
