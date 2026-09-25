'use client';
import { useRef, useState, type MouseEvent, type PointerEvent, type UIEvent } from 'react';

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
   danach keinen Klick aus. */
export function usePhotoRail(count: number, onPage?: (page: number) => void) {
  const railRef = useRef<HTMLDivElement>(null);
  const mouseDrag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [page, setPage] = useState(0);

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
      const rail = event.currentTarget;
      if (!rail.clientWidth) return;
      const next = clampPage(Math.round(rail.scrollLeft / rail.clientWidth));
      setPage(next);
      onPage?.(next);
    },
  };

  return { railRef, page, scrollToPage, handlers };
}
