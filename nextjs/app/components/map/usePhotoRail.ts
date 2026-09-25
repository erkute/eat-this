'use client';
import {
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type UIEvent,
} from 'react';

/* Ein Foto-Streifen zum Durchwischen, für das Restaurant-Detail und die
   Listenkarte. Der Finger bewegt einen echten Scroll-Container,
   `scroll-snap-stop: always` rastet pro Wisch genau ein Bild weiter, Schwung
   und Achsensperre kommen vom Browser — das CSS dazu trägt der Streifen
   selbst (`touch-action: pan-x pan-y`, `scroll-snap-type: x mandatory`).
   Die Vorgängerin zog `scrollLeft` per pointermove selbst nach, auf
   `touch-action: pan-y` — dadurch hing das Bild auf iOS einen Frame hinter
   dem Finger, ein schneller kurzer Wisch blätterte nicht, und sobald ein
   Wisch leicht schräg lief, übernahm iOS ihn als vertikalen Scroll, schickte
   pointercancel, und das Bild sprang ohne Bewegung zurück. Ziehen per JS
   bleibt nur für die Maus, die keinen nativen Wisch hat; ein Ziehen löst
   danach keinen Klick aus.

   `startPage`: auf diesem Foto steht der Streifen, sobald es existiert —
   ohne Animation, bevor gemalt wird. Die Listenkarte bekommt ihre Galerie
   erst nach dem Mount, deshalb wartet der Sprung, bis `count` reicht. Hat
   jemand vorher selbst geblättert, gilt seine Wahl. */
export function usePhotoRail(
  count: number,
  { onPage, startPage = 0 }: { onPage?: (page: number) => void; startPage?: number } = {}
) {
  const railRef = useRef<HTMLDivElement>(null);
  const mouseDrag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const startSettled = useRef(false);
  const [page, setPage] = useState(0);

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
