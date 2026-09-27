'use client';
import { useEffect, type RefObject } from 'react';
import { trackEvent } from '@/lib/analytics';
import { measureSheetTop, resolveSnap, snapOffsets } from './phoneSheetSnaps';
import {
  dropLowered,
  followSheet,
  grabFromList,
  heldOffset,
  holdSheetAt,
  LOWERED_GAP_PX,
  mapStripLine,
  raiseToList,
  SHEET_COLLAPSE_EVENT,
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
/* After a gesture of the grip, the click the browser may still send is the
   gesture's, not a tap's. */
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
  /* At and between the stops. `pos` is the scroll position the finger asks
     for; below 0 the page stays at the map stop and the sheet is held that
     far down instead — the lowest stop lies there. */
  | {
      kind: 'scroll';
      pointerId: number;
      startY: number;
      startPos: number;
      pos: number;
      mapY: number;
      /* The lowest stop, as a scroll position (mapY when there is none). */
      floor: number;
    }
  /* Deep in the list: the finger drives the slab on screen (see
     sheetSlide.ts). */
  | {
      kind: 'slab';
      pointerId: number;
      startY: number;
      offset: number;
      /* Where the bar rests over the map, in slab offset. */
      restLine: number;
      /* The lowest stop, in slab offset: the finger cannot take the bar
         lower. Past it the sticky bar would near the bottom edge, and iOS
         Safari tints its URL bar after it (see sheetSlide.ts). */
      lowLine: number;
      mapY: number;
      lastY: number;
      lastT: number;
      v: number;
    };

/**
 * The phone sheet's grip. Four stops: lowered (only the bar above the bottom),
 * map, split and sheet; past the last one the list reads natively.
 *
 * Content and filter touches keep native document scrolling. The grip alone
 * owns its drag: from deep in a list/detail it lowers the visible sheet
 * instead of scrolling through every row, and the sheet comes back at its
 * top. Lowered, the whole sheet is the grip. Movement is applied once per
 * frame. Tablets use useBottomSheet instead.
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
    const sheetEl = () => handle.closest<HTMLElement>('[data-map-sheet]');
    /* Presses land on the sheet: lowered, all of it is the grip. */
    const press = sheetEl() ?? zone;
    let drag: Drag | null = null;
    let pending: Pending | null = null;
    /* The current drag began on a chip or on a lowered sheet, not on the grip
       itself: a tap there is not the grip's tap (which opens or closes). */
    let claimedLate = false;
    let suppressClickUntil = 0;
    let busy = false;
    /* The finger's latest position waits here for the next frame. */
    let frame = 0;

    /* The list, and a restaurant detail — both have the map behind them. The
       must-eat detail is a takeover with the map hidden: nothing to reveal. */
    const slides = (sheet: HTMLElement | null): sheet is HTMLElement =>
      Boolean(sheet) && (view === 'list' || sheet?.dataset.detailKind === 'restaurant');
    const isLowered = () => sheetEl()?.dataset.sheetLowered !== undefined;
    /* The stops, and where the bar rests over the map. Where the map strip
       shows (list, restaurant detail), "all the way up" leaves the strip
       uncovered: the last stop is the sheet's top edge on the strip line, not
       on the viewport's top edge. */
    const geometry = () => {
      const sheet = sheetEl();
      const measured = measureSheetTop();
      /* Measured without the transform the sheet may be held at. */
      const sheetTop = (measured ?? 0) - (sheet ? heldOffset(sheet) : 0);
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
        /* How far below the map stop the sheet may go: down to the bar and a
           sliver of rows above the bottom edge. */
        lowBy: slides(sheet)
          ? Math.max(
              0,
              Math.round(
                window.innerHeight - zone.offsetHeight - LOWERED_GAP_PX - (sheetTop - mapY)
              )
            )
          : 0,
      };
    };

    const begin = (pointerId: number, startY: number, timeStamp: number) => {
      try {
        zone.setPointerCapture(pointerId);
      } catch {
        /* capture is best-effort; the window listeners below still track. */
      }

      const { sheet, sheetStop, mapY, restLine, lowBy } = geometry();
      if (slides(sheet) && window.scrollY > sheetStop + AT_STOP_PX) {
        drag = {
          kind: 'slab',
          pointerId,
          startY,
          offset: grabFromList(sheet),
          restLine,
          lowLine: restLine + lowBy,
          mapY,
          lastY: startY,
          lastT: timeStamp,
          v: 0,
        };
        return;
      }
      const startPos = sheet && isLowered() ? mapY - heldOffset(sheet) : window.scrollY;
      drag = {
        kind: 'scroll',
        pointerId,
        startY,
        startPos,
        pos: startPos,
        mapY,
        floor: mapY - lowBy,
      };
    };

    const onDown = (e: PointerEvent) => {
      // Tablets/desktop still use the real transform sheet in useBottomSheet.
      if (!isPhone() || busy || drag || pending) return;
      const onGrip = e.target instanceof Node && handle.contains(e.target);
      const inZone = e.target instanceof Node && zone.contains(e.target);
      if (!onGrip && !isLowered()) {
        if (!inZone) return;
        // Only the grip claims touch; filter chips retain native scrolling.
        if (e.pointerType === 'touch') return;
        /* Not claimed yet: the press may still be a tap on a chip. */
        pending = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          timeStamp: e.timeStamp,
        };
        return;
      }
      // Claims ONLY this gesture — the list keeps native scrolling.
      e.preventDefault();
      /* Lowered, a press on a row is the sheet's, not the row's. */
      claimedLate = !onGrip;
      begin(e.pointerId, e.clientY, e.timeStamp);
    };

    /* Put the sheet where the finger is — at most once per frame. */
    const apply = () => {
      frame = 0;
      const sheet = sheetEl();
      if (!drag) return;
      if (drag.kind === 'slab') {
        if (sheet) holdSheetAt(sheet, drag.offset);
        followSheet(drag.offset - drag.restLine);
        return;
      }
      if (sheet) holdSheetAt(sheet, Math.max(0, drag.mapY - drag.pos));
      followSheet(drag.mapY - drag.pos);
      // Finger up ⇒ clientY shrinks ⇒ scroll further down ⇒ sheet rises over
      // the map, matching what the hand is doing.
      const next = Math.max(drag.mapY, drag.pos);
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
        drag.offset = Math.min(drag.lowLine, Math.max(0, e.clientY - drag.startY));
        const dt = e.timeStamp - drag.lastT;
        if (dt > 0) drag.v = (e.clientY - drag.lastY) / dt;
        drag.lastY = e.clientY;
        drag.lastT = e.timeStamp;
      } else {
        drag.pos = Math.max(drag.floor, drag.startPos + (drag.startY - e.clientY));
      }
      schedule();
    };

    /* Glide a sheet held below the map stop to `target` (a scroll position;
       below the map stop = lowered). */
    const settleBelow = (sheet: HTMLElement, from: number, target: number, mapY: number) => {
      busy = true;
      const done =
        target < mapY
          ? settleOnMap(sheet, mapY - from, mapY - target, { restLinePx: 0, mapY })
          : raiseToList(sheet, mapY - from);
      void done.finally(() => {
        busy = false;
        if (target > mapY) window.scrollTo({ top: target, behavior: 'smooth' });
      });
    };

    const onUp = (e: PointerEvent) => {
      if (pending && e.pointerId === pending.pointerId) {
        pending = null;
        return;
      }
      if (!drag || e.pointerId !== drag.pointerId) return;
      flush();
      /* Whatever the grip did moved the sheet, and the click that follows is
         hit-tested where the sheet now is: a tap that raised a lowered detail
         opened the photo that came to lie under the finger. */
      suppressClickUntil = e.timeStamp + CLICK_AFTER_DRAG_MS;
      const d = drag;
      drag = null;
      try {
        zone.releasePointerCapture(d.pointerId);
      } catch {
        /* already released (pointercancel) — nothing to undo. */
      }
      const cancelled = e.type !== 'pointerup';
      const tap = Math.abs(e.clientY - d.startY) < TAP_PX && e.type === 'pointerup';
      const sheet = sheetEl();

      if (d.kind === 'slab') {
        if (!sheet) return;
        const moved = d.offset;
        const toMap = !cancelled && ((tap && !claimedLate) || moved > INTENT_PX || d.v > FLICK_PX_PER_MS);
        if (toMap) trackEvent('map_view_toggle', { direction: 'to_map' });
        /* Past the resting line, a pull that clearly goes on takes the sheet
           to the lowest stop. */
        const lower = d.lowLine > d.restLine && d.offset > d.restLine + Math.min(INTENT_PX, (d.lowLine - d.restLine) / 2);
        busy = true;
        const done = toMap
          ? settleOnMap(sheet, d.offset, lower ? d.lowLine : d.restLine, {
              restLinePx: d.restLine,
              mapY: d.mapY,
            })
          : raiseToList(sheet, d.offset);
        void done.finally(() => {
          busy = false;
        });
        return;
      }

      const { offsets, sheetStop } = geometry();
      const { mapY } = d;
      const stops = d.floor < mapY ? [d.floor, ...offsets] : offsets;

      if (cancelled) {
        if (sheet && (d.startPos < mapY || d.pos < mapY)) settleBelow(sheet, d.pos, Math.min(mapY, d.startPos), mapY);
        else window.scrollTo({ top: d.startPos, behavior: 'instant' });
        return;
      }

      if (tap && !claimedLate && slides(sheet)) {
        /* Lowered: back onto the map stop. On the map or between: the list
           comes up. At the top: the map. */
        let target: number;
        if (d.startPos < mapY - AT_STOP_PX) target = mapY;
        else target = window.scrollY >= sheetStop - AT_STOP_PX ? mapY : sheetStop;
        trackEvent('map_view_toggle', { direction: target === mapY ? 'to_map' : 'to_list' });
        if (d.startPos < mapY) settleBelow(sheet, d.pos, target, mapY);
        else window.scrollTo({ top: target, behavior: 'smooth' });
        return;
      }
      if (tap && claimedLate && sheet && d.startPos < mapY) {
        /* A tap on a lowered sheet brings it back onto the map stop. */
        settleBelow(sheet, d.pos, mapY, mapY);
        return;
      }

      /* Settle on one of the stops. Deliberately only on RELEASE of the
         handle: CSS scroll-snap applies to the whole document and would tug at
         the rows while reading further down the list. */
      const target = resolveSnap(stops, d.pos, d.startPos);
      if (sheet && (d.pos < mapY || target < mapY)) {
        settleBelow(sheet, d.pos, target, mapY);
        return;
      }
      /* Off the lowest stop, if it came from there. */
      if (sheet) void raiseToList(sheet, 0);
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
      void settleOnMap(sheet, grabFromList(sheet), restLine, { restLinePx: restLine, mapY }).finally(
        () => {
          busy = false;
        }
      );
    };

    /* Lowered sits at the map stop; anything that scrolls the page away from
       it (a filter, a returning detail) takes the sheet back up first. */
    const onScroll = () => {
      if (busy || drag || !isLowered()) return;
      if (Math.abs(window.scrollY - geometry().mapY) > 1) dropLowered();
    };

    const onClick = (e: MouseEvent) => {
      if (e.timeStamp > suppressClickUntil) return;
      suppressClickUntil = 0;
      e.preventDefault();
      e.stopPropagation();
    };

    press.addEventListener('pointerdown', onDown);
    // Capture is best-effort in mobile browsers. Finish even when the pointer
    // leaves the moving grip, or native scrolling takes its capture away.
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onUp, true);
    zone.addEventListener('lostpointercapture', onUp);
    press.addEventListener('click', onClick, true);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener(SHEET_COLLAPSE_EVENT, onCollapse);
    return () => {
      window.removeEventListener(SHEET_COLLAPSE_EVENT, onCollapse);
      if (frame) window.cancelAnimationFrame(frame);
      press.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
      zone.removeEventListener('lostpointercapture', onUp);
      press.removeEventListener('click', onClick, true);
      window.removeEventListener('scroll', onScroll);
      /* Another view (a detail opening, closing): it starts on its own stops. */
      dropLowered();
    };
  }, [handleRef, view]);
}
