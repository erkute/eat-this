'use client';
import { useEffect, type RefObject } from 'react';
import { trackEvent } from '@/lib/analytics';
import { measureSheetTop, resolveSnap, snapOffsets } from './phoneSheetSnaps';
import {
  forgetSheetPosition,
  grabFromList,
  mapStripLine,
  SHEET_COLLAPSE_EVENT,
  grabFromMap,
  holdSheetAt,
  raiseToList,
  rememberedSheetPosition,
  settleOnMap,
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
/* After a drag that began on a chip, the click the browser may still send
   there is the drag's, not a tap's. */
const CLICK_AFTER_DRAG_MS = 400;

function isPhone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(max-width: ${PHONE_MAX}px)`).matches;
}

/* A press on the grab zone outside the grabber itself (the list's filter
   chips): a drag only once the finger clearly moves up or down, otherwise it
   stays the chip's tap. */
type Pending = { pointerId: number; startX: number; startY: number; timeStamp: number };

type Drag =
  /* Between the stops: the finger drives the window scroller 1:1. */
  | { kind: 'scroll'; pointerId: number; startY: number; startScrollY: number; fingerY: number }
  /* Deep in the list, or pulling a remembered list back up from the map: the
     finger drives the slab on screen (see sheetSlide.ts). */
  | {
      kind: 'slab';
      from: 'list' | 'map';
      pointerId: number;
      startY: number;
      base: number;
      offset: number;
      /* Where the bar rests over the map, in slab offset. The finger cannot
         take it lower: past that line the sticky bar would reach the bottom
         edge, and iOS Safari tints its URL bar after it (see sheetSlide.ts). */
      restLine: number;
      mapY: number;
      lastY: number;
      lastT: number;
      v: number;
    };

/**
 * Phone touch gestures use native document scrolling on the handle, chips and
 * content alike. No preventDefault, pointer capture, per-frame scrollTo or
 * release snap: Safari can scroll asynchronously and retain its own momentum.
 * A handle tap still reveals the map / restores the remembered reading place.
 *
 * Mouse dragging in a narrow window keeps the custom drag path below; a mouse
 * does not provide native drag-to-scroll. Tablets use useBottomSheet instead.
 */
export function useHandleScrollDrag(
  handleRef: RefObject<HTMLDivElement | null>,
  // Also re-binds the listeners — the handle element is swapped between views.
  view: 'list' | 'detail'
): void {
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;

    const zone = handle.closest<HTMLElement>('[data-sheet-grab-zone]') ?? handle;
    let drag: Drag | null = null;
    let pending: Pending | null = null;
    // Touch scrolling belongs to the browser, including momentum and arbitrary
    // resting positions. Only remember a possible tap on the handle.
    let touchTap: { pointerId: number; x: number; y: number; moved: boolean } | null = null;
    /* The current drag began on a chip: its release is never a tap, and the
       click the chip may still get is swallowed (see onClick). */
    let claimedLate = false;
    let suppressClickUntil = 0;
    let busy = false;
    /* The finger's latest position waits here for the next frame. */
    let frame = 0;

    const sheetEl = () => handle.closest<HTMLElement>('[data-map-sheet]');
    /* The list, and a restaurant detail — both have the map behind them. The
       must-eat detail is a takeover with the map hidden: nothing to reveal. */
    const slides = (sheet: HTMLElement | null): sheet is HTMLElement =>
      Boolean(sheet) && (view === 'list' || sheet?.dataset.detailKind === 'restaurant');
    /* The stops, and where the bar rests over the map. Where the map strip
       shows (list, restaurant detail), "all the way up" leaves the strip
       uncovered: the last stop is the sheet's top edge on the strip line, not
       on the viewport's top edge. */
    const geometry = () => {
      const sheet = sheetEl();
      const measured = measureSheetTop();
      const sheetTop = measured ?? 0;
      const strip = slides(sheet) ? mapStripLine() : 0;
      /* Unmeasurable (no sheet yet): snapOffsets falls back to its dvh estimate. */
      const offsets = snapOffsets(
        view,
        window.innerHeight,
        measured === undefined ? undefined : Math.max(0, sheetTop - strip)
      );
      const mapY = offsets[0];
      return {
        sheet,
        offsets,
        mapY,
        sheetStop: offsets[offsets.length - 1],
        /* Slab offset at which the bar stands where it stands at the map stop.
           At rest the bar sits on the strip line, so that is what it moves
           from. */
        restLine: Math.max(0, sheetTop - mapY - strip),
      };
    };
    const stops = () => geometry().offsets;

    const begin = (pointerId: number, startY: number, timeStamp: number) => {
      try {
        zone.setPointerCapture(pointerId);
      } catch {
        /* capture is best-effort; the window listeners below still track. */
      }

      const { sheet, sheetStop, mapY, restLine } = geometry();
      const slab = (from: 'list' | 'map', base: number): Drag => ({
        kind: 'slab',
        from,
        pointerId,
        startY,
        base,
        offset: base,
        restLine,
        mapY,
        lastY: startY,
        lastT: timeStamp,
        v: 0,
      });

      if (slides(sheet)) {
        if (window.scrollY > sheetStop + AT_STOP_PX) {
          drag = slab('list', grabFromList(sheet));
          return;
        }
        if (window.scrollY < sheetStop - AT_STOP_PX && grabFromMap(sheet, view, restLine)) {
          drag = slab('map', restLine);
          return;
        }
      }
      drag = {
        kind: 'scroll',
        pointerId,
        startY,
        startScrollY: window.scrollY,
        fingerY: startY,
      };
    };

    const onDown = (e: PointerEvent) => {
      // Tablets/desktop still use the real transform sheet in useBottomSheet.
      if (!isPhone() || busy || drag || pending) return;
      if (e.pointerType === 'touch') {
        touchTap = e.isPrimary !== false && e.target instanceof Node && handle.contains(e.target)
          ? { pointerId: e.pointerId, x: e.clientX, y: e.clientY, moved: false }
          : null;
        return;
      }
      if (!(e.target instanceof Node && handle.contains(e.target))) {
        /* Not claimed yet: the press may still be a tap on a chip. */
        pending = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          timeStamp: e.timeStamp,
        };
        return;
      }
      // Claims ONLY the grab zone's gesture — the list keeps native scrolling.
      e.preventDefault();
      claimedLate = false;
      begin(e.pointerId, e.clientY, e.timeStamp);
    };

    /* Put the sheet where the finger is — at most once per frame. */
    const apply = () => {
      frame = 0;
      if (!drag) return;
      if (drag.kind === 'slab') {
        const sheet = sheetEl();
        if (sheet) holdSheetAt(sheet, drag.offset);
        return;
      }
      // Finger up ⇒ clientY shrinks ⇒ scroll further down ⇒ sheet rises over
      // the map, matching what the hand is doing.
      const next = Math.max(0, drag.startScrollY + (drag.startY - drag.fingerY));
      // globals.css sets `scroll-behavior: smooth` document-wide; without an
      // explicit instant the sheet would ease along behind the finger.
      if (next !== window.scrollY) {
        window.scrollTo({ top: next, behavior: 'instant' as ScrollBehavior });
      }
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };
    /* Land the last position now, before the release decides anything. */
    const flush = () => {
      if (!frame) return;
      window.cancelAnimationFrame(frame);
      apply();
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        if (touchTap && touchTap.pointerId === e.pointerId) {
          touchTap.moved ||= Math.hypot(e.clientX - touchTap.x, e.clientY - touchTap.y) >= TAP_PX;
        }
        return;
      }
      if (pending && e.pointerId === pending.pointerId) {
        const dx = Math.abs(e.clientX - pending.startX);
        const dy = Math.abs(e.clientY - pending.startY);
        if (dy > TAP_PX && dy > dx) {
          const p = pending;
          pending = null;
          claimedLate = true;
          begin(p.pointerId, p.startY, p.timeStamp);
        } else if (dx > TAP_PX) {
          pending = null;
          return;
        } else {
          return;
        }
      }
      if (!drag || e.pointerId !== drag.pointerId) return;
      if (drag.kind === 'slab') {
        drag.offset = Math.min(drag.restLine, Math.max(0, drag.base + (e.clientY - drag.startY)));
        const dt = e.timeStamp - drag.lastT;
        if (dt > 0) drag.v = (e.clientY - drag.lastY) / dt;
        drag.lastY = e.clientY;
        drag.lastT = e.timeStamp;
      } else {
        drag.fingerY = e.clientY;
      }
      schedule();
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        const tap = touchTap;
        touchTap = null;
        if (!tap || tap.pointerId !== e.pointerId || tap.moved || e.type !== 'pointerup' ||
            Math.hypot(e.clientX - tap.x, e.clientY - tap.y) >= TAP_PX) return;
        // A tap keeps the shortcut to the map / remembered row. Swipes never
        // enter the transform-and-snap path used for mouse dragging below.
        const { sheet, sheetStop, restLine } = geometry();
        if (!slides(sheet)) return;
        if (window.scrollY > sheetStop + AT_STOP_PX) {
          onCollapse();
        } else if (window.scrollY < sheetStop - AT_STOP_PX && grabFromMap(sheet, view, restLine)) {
          busy = true;
          trackEvent('map_view_toggle', { direction: 'to_list' });
          void raiseToList(sheet, restLine).finally(() => { busy = false; });
        }
        return;
      }
      if (pending && e.pointerId === pending.pointerId) {
        pending = null;
        return;
      }
      if (!drag || e.pointerId !== drag.pointerId) return;
      flush();
      if (claimedLate) suppressClickUntil = e.timeStamp + CLICK_AFTER_DRAG_MS;
      try {
        zone.releasePointerCapture(drag.pointerId);
      } catch {
        /* already released (pointercancel) — nothing to undo. */
      }
      const d = drag;
      drag = null;

      if (d.kind === 'slab') {
        const sheet = sheetEl();
        if (!sheet) return;
        const moved = d.offset - d.base;
        const tap =
          !claimedLate && Math.abs(e.clientY - d.startY) < TAP_PX && e.type === 'pointerup';
        busy = true;
        let done: Promise<void>;
        if (d.from === 'list') {
          const toMap = tap || moved > INTENT_PX || d.v > FLICK_PX_PER_MS;
          if (toMap) trackEvent('map_view_toggle', { direction: 'to_map' });
          done = toMap
            ? settleOnMap(sheet, d.offset, d.restLine, d.mapY, { remember: view })
            : raiseToList(sheet, d.offset);
        } else {
          const toList = tap || moved < -INTENT_PX || d.v < -FLICK_PX_PER_MS;
          if (toList) trackEvent('map_view_toggle', { direction: 'to_list' });
          done = toList
            ? raiseToList(sheet, d.offset)
            : settleOnMap(sheet, d.offset, d.restLine, d.mapY, { remember: null });
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

    /* A tap on the map strip: the same as a tap on the grabber, from deep in
       the sheet. */
    const onCollapse = () => {
      if (!isPhone() || busy || drag) return;
      const { sheet, sheetStop, mapY, restLine } = geometry();
      if (!slides(sheet) || window.scrollY <= sheetStop + AT_STOP_PX) return;
      busy = true;
      trackEvent('map_view_toggle', { direction: 'to_map' });
      void settleOnMap(sheet, grabFromList(sheet), restLine, mapY, { remember: view }).finally(
        () => {
          busy = false;
        }
      );
    };

    /* A list position is only worth returning to while you are looking at the
       map. Scroll into the list by hand and that is the new place. */
    const onScroll = () => {
      if (busy || drag || rememberedSheetPosition(view) === null) return;
      const offsets = stops();
      if (window.scrollY > offsets[offsets.length - 1] + AT_STOP_PX) forgetSheetPosition(view);
    };

    const onClick = (e: MouseEvent) => {
      if (e.timeStamp > suppressClickUntil) return;
      suppressClickUntil = 0;
      e.preventDefault();
      e.stopPropagation();
    };

    zone.addEventListener('pointerdown', onDown);
    zone.addEventListener('pointermove', onMove);
    zone.addEventListener('pointerup', onUp);
    zone.addEventListener('pointercancel', onUp);
    zone.addEventListener('click', onClick, true);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener(SHEET_COLLAPSE_EVENT, onCollapse);
    return () => {
      window.removeEventListener(SHEET_COLLAPSE_EVENT, onCollapse);
      if (frame) window.cancelAnimationFrame(frame);
      zone.removeEventListener('pointerdown', onDown);
      zone.removeEventListener('pointermove', onMove);
      zone.removeEventListener('pointerup', onUp);
      zone.removeEventListener('pointercancel', onUp);
      zone.removeEventListener('click', onClick, true);
      window.removeEventListener('scroll', onScroll);
    };
  }, [handleRef, view]);
}
