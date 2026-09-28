'use client';
import { useEffect, type RefObject } from 'react';
import { trackEvent } from '@/lib/analytics';
import { measureSheetTop, snapOffsets } from './phoneSheetSnaps';
import {
  clearBottom,
  dropLowered,
  followSheet,
  grabFromList,
  heldOffset,
  holdSheetAt,
  leaveSlabAt,
  LOWERED_GAP_PX,
  mapStripLine,
  raiseToList,
  restAt,
  settleOnMap,
} from './sheetSlide';

const PHONE_MAX = 767.98;
/* Slack around the ends — rounded offsets and iOS rubber-banding land a few
   px off the exact value. */
const AT_STOP_PX = 24;
/* Below this much movement a release is a tap. */
const TAP_PX = 6;
/* Below this much, the grip was pressed, not pulled: the finger wobbles on a
   press, and a sheet that stayed a few px off where it was — deep in the
   list, back at its top — read as the grip slipping (user, 28.09.2026). */
const STILL_PX = 16;
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
type Pending = { pointerId: number; startX: number; startY: number };

type Drag =
  /* Between the map stop and the strip line. `pos` is the scroll position the
     finger asks for; below the map stop the page stays there and the sheet
     is held that far down instead. */
  | {
      kind: 'scroll';
      pointerId: number;
      startY: number;
      startPos: number;
      pos: number;
      mapY: number;
      /* The lowest the bar may go, as a scroll position (mapY when the sheet
         has no map behind it). */
      floor: number;
      /* The highest: the bar on the strip line. */
      ceil: number;
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
      /* The lowest the bar may go, in slab offset. Past it the sticky bar
         would near the bottom edge — under Safari's URL bar, which also
         tints itself after it (see sheetSlide.ts). */
      lowLine: number;
      mapY: number;
    };

/**
 * The phone sheet's grip. It moves the sheet with the finger and leaves it
 * where the finger lets go — nothing snaps (user, 28.09.2026). Two bounds:
 * the bar never goes above the strip line, so the map strip stays, and never
 * below clearBottom(), so it stays clear of Safari's URL bar. Above the map
 * stop the sheet is the scrolled page; below it the page rests at the map
 * stop and the sheet is held down by a transform. A tap on the grip still
 * toggles: from the map the sheet comes up to the strip line, from there it
 * goes back to the map. Past the strip line the list reads natively.
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
           sliver of rows above the bottom that Safari's bars leave clear. */
        lowBy: slides(sheet)
          ? Math.max(
              0,
              Math.round(clearBottom() - zone.offsetHeight - LOWERED_GAP_PX - (sheetTop - mapY))
            )
          : 0,
      };
    };

    const begin = (pointerId: number, startY: number) => {
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
        /* The must-eat takeover has no strip: its grip scrolls it freely. */
        ceil: slides(sheet) ? Math.max(sheetStop, startPos) : Infinity,
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
        };
        return;
      }
      // Claims ONLY this gesture — the list keeps native scrolling.
      e.preventDefault();
      /* Lowered, a press on a row is the sheet's, not the row's. */
      claimedLate = !onGrip;
      begin(e.pointerId, e.clientY);
    };

    /* Put the sheet where the finger is — at most once per frame. */
    const apply = () => {
      frame = 0;
      const sheet = sheetEl();
      if (!drag) return;
      if (drag.kind === 'slab') {
        if (sheet) holdSheetAt(sheet, drag.offset);
        followSheet(drag.offset, drag.offset - drag.restLine);
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
          begin(p.pointerId, p.startY);
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
      } else {
        drag.pos = Math.min(
          drag.ceil,
          Math.max(drag.floor, drag.startPos + (drag.startY - e.clientY))
        );
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
        busy = true;
        let done: Promise<void> = Promise.resolve();
        if (!cancelled && tap && !claimedLate) {
          /* A tap on the bar: over to the map. */
          trackEvent('map_view_toggle', { direction: 'to_map' });
          done = settleOnMap(sheet, d.offset, d.restLine, {
            restLinePx: d.restLine,
            mapY: d.mapY,
          });
        } else if (!cancelled && Math.abs(e.clientY - d.startY) >= STILL_PX) {
          /* Where the finger let go. */
          leaveSlabAt(sheet, d.offset, { restLinePx: d.restLine, mapY: d.mapY });
        } else {
          /* Cancelled, or only pressed: the list stays where it was. */
          done = raiseToList(sheet, d.offset);
        }
        void done.finally(() => {
          busy = false;
        });
        return;
      }

      const { sheetStop } = geometry();
      const { mapY } = d;

      if (cancelled) {
        if (sheet && (d.startPos < mapY || d.pos < mapY)) settleBelow(sheet, d.pos, Math.min(mapY, d.startPos), mapY);
        else window.scrollTo({ top: d.startPos, behavior: 'instant' });
        return;
      }

      if (tap && !claimedLate && slides(sheet)) {
        /* Held below the map stop: back onto it. At the strip line: the map.
           Anywhere else: the sheet comes up to the strip line. */
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

      /* Only pressed: back to where it was. */
      if (Math.abs(e.clientY - d.startY) < STILL_PX) {
        if (sheet && (d.startPos < mapY || d.pos < mapY)) restAt(sheet, mapY - d.startPos);
        else if (d.pos !== d.startPos) window.scrollTo({ top: d.startPos, behavior: 'instant' });
        return;
      }

      /* Where the finger let go: the page is already there (apply), and
         below the map stop the sheet stays held. No snapping, and no CSS
         scroll-snap either — it would tug at the rows while reading. */
      if (sheet && (d.startPos < mapY || d.pos < mapY)) restAt(sheet, mapY - d.pos);
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
    return () => {
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
