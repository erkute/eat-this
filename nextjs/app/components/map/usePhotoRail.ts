'use client';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type UIEvent,
} from 'react';

/* Gemeinsamer Fotostreifen für Liste und Detail. Das Detail scrollt nativ.
   Die Liste steuert horizontale Touch-Gesten selbst; vertikale Gesten
   bleiben beim Dokument. Touch-Events halten eine einmal horizontal
   gestartete Geste auch bei einem pointercancel. Mausziehen funktioniert
   in beiden Ansichten; ein Ziehen löst danach keinen Klick aus.

   `startPage`: auf diesem Foto steht der Streifen, sobald es existiert —
   ohne Animation, bevor gemalt wird. Die Listenkarte bekommt ihre Galerie
   erst nach dem Mount, deshalb wartet der Sprung, bis `count` reicht. Hat
   jemand vorher selbst geblättert, gilt seine Wahl. */
export function usePhotoRail(
  count: number,
  { onPage, startPage = 0, touchDrag = false }: { onPage?: (page: number) => void; startPage?: number; touchDrag?: boolean } = {}
) {
  const railRef = useRef<HTMLDivElement>(null);
  const mouseDrag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const startSettled = useRef(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const rail = railRef.current;
    if (!touchDrag || count < 2 || !rail) return;
    let gesture: { x: number; y: number; left: number; width: number; axis: 'x' | 'y' | null } | null = null;
    let settleTarget: { page: number; left: number } | null = null;
    const finishScroll = () => {
      if (settleTarget === null || Math.abs(rail.scrollLeft - settleTarget.left) >= 1) return;
      settleTarget = null;
      rail.style.removeProperty('scroll-snap-type');
    };
    const settle = (cancelled: boolean, x?: number) => {
      const previous = gesture;
      gesture = null;
      if (!previous) return;
      if (previous.axis !== 'x') {
        rail.style.removeProperty('scroll-snap-type');
        return;
      }
      const from = Math.round(previous.left / rail.clientWidth);
      const dx = (x ?? previous.x) - previous.x;
      const next = cancelled ? Math.round(rail.scrollLeft / rail.clientWidth)
        : from + (Math.abs(dx) >= 40 ? (dx < 0 ? 1 : -1) : 0);
      // Snap erst am Ziel aktivieren: sonst springt WebKit vor dem Gleiten
      // kurz zum vorherigen Foto zurück.
      const targetPage = Math.max(0, Math.min(count - 1, next));
      settleTarget = { page: targetPage, left: targetPage * rail.clientWidth };
      rail.scrollTo({
        left: settleTarget.left,
        behavior: cancelled || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
      finishScroll();
    };
    const start = (event: TouchEvent) => {
      if (event.touches.length !== 1) { settle(true); return; }
      if (settleTarget !== null) {
        settleTarget = null;
        rail.scrollTo({ left: rail.scrollLeft, behavior: 'instant' });
      }
      suppressClick.current = false;
      startSettled.current = true;
      gesture = { x: event.touches[0].clientX, y: event.touches[0].clientY, left: rail.scrollLeft, width: rail.clientWidth, axis: null };
    };
    const move = (event: TouchEvent) => {
      if (!gesture) return;
      if (event.touches.length !== 1) { settle(true); return; }
      const dx = event.touches[0].clientX - gesture.x;
      const dy = event.touches[0].clientY - gesture.y;
      if (gesture.axis === null) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
        gesture.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (gesture.axis === 'x') {
          rail.style.scrollSnapType = 'none';
          suppressClick.current = true;
        }
      }
      if (gesture.axis !== 'x') return;
      if (event.cancelable) event.preventDefault();
      rail.scrollLeft = Math.max(0, Math.min((count - 1) * rail.clientWidth, gesture.left - dx));
    };
    const end = (event: TouchEvent) => settle(false, event.changedTouches[0]?.clientX);
    const cancel = () => settle(true);
    let width = rail.clientWidth;
    const resize = new ResizeObserver(() => {
      const nextWidth = rail.clientWidth;
      if (!nextWidth || nextWidth === width) return;
      width = nextWidth;
      if (!gesture && !settleTarget) return;
      const targetPage = settleTarget?.page ?? Math.round(gesture!.left / gesture!.width);
      gesture = null;
      settleTarget = null;
      rail.scrollTo({ left: Math.max(0, Math.min(count - 1, targetPage)) * width, behavior: 'instant' });
      rail.style.removeProperty('scroll-snap-type');
    });
    resize.observe(rail);
    rail.addEventListener('touchstart', start, { passive: true });
    rail.addEventListener('touchmove', move, { passive: false });
    rail.addEventListener('touchend', end, { passive: true });
    rail.addEventListener('touchcancel', cancel, { passive: true });
    rail.addEventListener('scroll', finishScroll, { passive: true });
    return () => {
      resize.disconnect();
      rail.removeEventListener('touchstart', start);
      rail.removeEventListener('touchmove', move);
      rail.removeEventListener('touchend', end);
      rail.removeEventListener('touchcancel', cancel);
      rail.removeEventListener('scroll', finishScroll);
      rail.style.removeProperty('scroll-snap-type');
    };
  }, [count, touchDrag]);

  useLayoutEffect(() => {
    const rail = railRef.current;
    if (startSettled.current || !startPage || startPage >= count || !rail?.clientWidth) return;
    startSettled.current = true;
    rail.scrollLeft = startPage * rail.clientWidth;
    setPage(startPage);
  }, [count, startPage]);

  const clampPage = (n: number) => Math.max(0, Math.min(count - 1, n));
  const scrollToPage = (n: number) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollTo({
      left: clampPage(n) * rail.clientWidth,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  };

  const handlers = {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      startSettled.current = true;
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      suppressClick.current = false;
      mouseDrag.current = {
        x: event.clientX,
        left: event.currentTarget.scrollLeft,
        moved: false,
      };
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      const drag = mouseDrag.current;
      if (!drag) return;
      const dx = event.clientX - drag.x;
      if (!drag.moved) {
        if (Math.abs(dx) < 6) return;
        drag.moved = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        // Snap würde jeden Zwischenstand sofort zurückziehen.
        event.currentTarget.style.scrollSnapType = 'none';
      }
      event.currentTarget.scrollLeft = drag.left - dx;
    },
    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      const drag = mouseDrag.current;
      mouseDrag.current = null;
      if (!drag?.moved) return;
      suppressClick.current = true;
      const rail = event.currentTarget;
      const dx = event.clientX - drag.x;
      const from = Math.round(drag.left / rail.clientWidth);
      rail.style.removeProperty('scroll-snap-type');
      scrollToPage(from + (Math.abs(dx) > 40 ? (dx < 0 ? 1 : -1) : 0));
    },
    onPointerCancel(event: PointerEvent<HTMLDivElement>) {
      if (!mouseDrag.current) return;
      mouseDrag.current = null;
      event.currentTarget.style.removeProperty('scroll-snap-type');
    },
    onClickCapture(event: MouseEvent<HTMLDivElement>) {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
    onScroll(event: UIEvent<HTMLDivElement>) {
      startSettled.current = true;
      const rail = event.currentTarget;
      if (!rail.clientWidth) return;
      const next = clampPage(Math.round(rail.scrollLeft / rail.clientWidth));
      setPage(next);
      onPage?.(next);
    },
  };

  return { railRef, page, scrollToPage, handlers };
}
