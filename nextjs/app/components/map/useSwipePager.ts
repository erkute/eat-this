'use client';
import { useEffect, useRef, type RefObject } from 'react';

interface SwipePagerOptions {
  /** Ein Wisch weit genug in eine Richtung, in der es weitergeht. Der Aufrufer
   *  spielt den Wechsel selbst (Must Eat: alte Karte raus, neue rein,
   *  gleichzeitig) und bekommt mit, wo die Vorschau-Karte gerade steht, damit
   *  die Abfahrt dort weitermacht statt zu springen. */
  onCommit: (dir: 'next' | 'prev', offsetPx: number) => void;
  /** Whether a neighbour exists in that direction — swiping into a missing
   *  neighbour rubber-bands back instead of paging. */
  hasPrev: boolean;
  hasNext: boolean;
  /** Optional element to animate while the root still owns the gesture. */
  transformRef?: RefObject<HTMLElement | null>;
}

/* Horizontal swipe paging for the must-eat detail sheet.
   Swipe left → next, right → prev. Axis-locked so it never fights the
   vertical sheet-drag / content scroll: the first significant move decides
   the axis; only a clearly-horizontal gesture pages (and preventDefault's).
   Touch-only — mouse drags bail (desktop uses the pager arrows).

   ACHTUNG beim Einbau: der Aufrufer schiebt die Karte beim Wechsel um eine
   volle Viewport-Breite. Ein Vorfahr MUSS die x-Achse klemmen (`overflow-x:
   clip`), sonst waechst das Dokument waehrend der Bewegung um diese Breite.
   Auf dem Desktop faellt das nicht auf (`.app-pages` klemmt dort ohnehin), auf
   iOS Safari zieht es die ganze Seite klein und beim Loslassen wieder gross. */
export function useSwipePager(ref: RefObject<HTMLElement | null>, opts: SwipePagerOptions) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const animatedEl = () => optsRef.current.transformRef?.current ?? el;
    const setTransform = (target: HTMLElement, value: string) =>
      target.style.setProperty('transform', value, 'important');
    let startX = 0,
      startY = 0,
      offset = 0,
      axis: 'h' | 'v' | null = null,
      active = false;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      // Don't hijack horizontal gestures that begin inside a region owning its
      // own horizontal scrolling (e.g. the photo-gallery carousel) — same axis
      // split the filter-chip rail uses against the sheet drag: a gesture moves
      // either that rail or the sheet, never both.
      if ((e.target as Element | null)?.closest?.('[data-h-scroll]')) return;
      startX = e.clientX;
      startY = e.clientY;
      offset = 0;
      axis = null;
      active = true;
    };
    const onMove = (e: PointerEvent) => {
      if (!active) return;
      const dx = e.clientX - startX,
        dy = e.clientY - startY;
      if (axis === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axis = Math.abs(dx) > Math.abs(dy) + 6 ? 'h' : 'v';
      }
      if (axis === 'h') {
        e.preventDefault();
        // Keep the composition calm: drag previews the top card, not the
        // whole sheet, and with enough resistance that text/content stays put.
        offset = dx * 0.24;
        const target = animatedEl();
        target.style.removeProperty('transition');
        setTransform(target, `translateX(${offset}px)`);
      }
    };
    /* preventDefault on pointermove does NOT stop native scrolling — once a
       slightly diagonal swipe accumulates vertical movement, iOS Safari
       claims the gesture as a pan-y scroll and fires pointercancel, killing
       the swipe midway. Only a non-passive touchmove preventDefault keeps
       the gesture once we've locked the horizontal axis. */
    const onTouchMove = (e: TouchEvent) => {
      if (active && axis === 'h' && e.cancelable) e.preventDefault();
    };
    const settle = () => {
      const target = animatedEl();
      target.style.setProperty('transition', 'transform .2s ease-out', 'important');
      setTransform(target, 'translateX(0)');
      window.setTimeout(() => {
        target.style.removeProperty('transition');
        target.style.removeProperty('transform');
      }, 220);
    };
    const end = (e: PointerEvent) => {
      if (!active) return;
      const dx = e.clientX - startX;
      const wasH = axis === 'h';
      active = false;
      axis = null;
      if (!wasH) return;
      const dir: 'next' | 'prev' = dx < 0 ? 'next' : 'prev';
      const canPage = dir === 'next' ? optsRef.current.hasNext : optsRef.current.hasPrev;
      if (Math.abs(dx) > 60 && canPage) optsRef.current.onCommit(dir, offset);
      else settle();
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointercancel', end);
    };
  }, [ref]);
}
