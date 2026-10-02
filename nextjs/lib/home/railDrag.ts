/* Querleisten der Startseite („Was ist um dich herum?") mit der Maus ziehen.
   Finger und Trackpad scrollen die Leiste nativ, mit Schwung und Snap; ein
   Mausrad aber scrollt nur senkrecht, und ohne Ziehen kämen Mausnutzer nie
   an die Karten rechts heran (Ansage 01.10.2026: „horizontal scrollbar").
   Gezogen wird `scrollLeft` selbst — es gibt keinen zweiten Zustand neben
   dem Scroll. Beim Loslassen rastet die Leiste auf der nächsten Karte ein,
   ein Schwung blättert eine weiter. */

/** Ab hier ist ein Druck ein Ziehen und kein Klick. */
const SLOP = 6;
/** Ab diesem Tempo (px/ms) blättert ein Schwung eine Karte weiter. */
const FLICK = 0.5;

/** Auf welcher Karte das Ziehen landet: die nächste Kartenkante, ein
 *  deutlicher Schwung (Maus nach links = vorwärts) eine weiter. `starts`
 *  sind die Scrollpositionen, an denen je eine Karte einrastet. */
export function settleLeft(starts: number[], left: number, speed: number): number {
  if (!starts.length) return left;
  let nearest = 0;
  for (let i = 1; i < starts.length; i++) {
    if (Math.abs(starts[i] - left) < Math.abs(starts[nearest] - left)) nearest = i;
  }
  if (Math.abs(speed) > FLICK) {
    const ahead = speed > 0;
    const passed = ahead ? starts[nearest] <= left : starts[nearest] >= left;
    if (passed) nearest += ahead ? 1 : -1;
  }
  return starts[Math.max(0, Math.min(starts.length - 1, nearest))];
}

/** Macht `rail` mit der Maus ziehbar. Gibt die Aufräumfunktion zurück. */
export function armRailDrag(rail: HTMLElement): () => void {
  let pointer: number | null = null;
  let x0 = 0;
  let left0 = 0;
  let dragging = false;
  let last = { x: 0, t: 0 };
  let speed = 0;

  /* Wo jede Karte einrastet: ihre Kante an der Kante des Scroll-Polsters.
     (`offsetLeft` zählt ab der Leiste — sie ist `position: relative`.) */
  const starts = () => {
    const pad = parseFloat(getComputedStyle(rail).scrollPaddingInlineStart) || 0;
    const max = rail.scrollWidth - rail.clientWidth;
    return Array.from(rail.children as HTMLCollectionOf<HTMLElement>, (slide) =>
      Math.min(max, Math.max(0, slide.offsetLeft - pad))
    );
  };

  /* Ein Ziehen über eine Karte ist kein Klick auf sie: der Klick, den der
     Browser nach dem Loslassen schickt, wird geschluckt. */
  const swallow = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const down = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    pointer = event.pointerId;
    x0 = event.clientX;
    left0 = rail.scrollLeft;
    dragging = false;
    last = { x: event.clientX, t: event.timeStamp };
    speed = 0;
  };
  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    const dx = event.clientX - x0;
    if (!dragging) {
      if (Math.abs(dx) < SLOP) return;
      dragging = true;
      rail.setPointerCapture(event.pointerId);
      // Ohne Snap und ohne weiches Scrollen, solange die Hand führt.
      rail.setAttribute('data-dragging', '');
    }
    const dt = event.timeStamp - last.t;
    if (dt > 0) speed = (last.x - event.clientX) / dt;
    last = { x: event.clientX, t: event.timeStamp };
    rail.scrollLeft = left0 - dx;
  };
  const up = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    pointer = null;
    if (!dragging) return;
    dragging = false;
    rail.addEventListener('click', swallow, true);
    window.setTimeout(() => rail.removeEventListener('click', swallow, true), 0);
    const target = settleLeft(starts(), rail.scrollLeft, speed);
    rail.removeAttribute('data-dragging');
    rail.scrollTo({ left: target, behavior: 'smooth' });
  };
  // Links und Bilder sind von Haus aus ziehbar (in die Adressleiste) — das
  // stünde dem Ziehen der Leiste im Weg.
  const noNativeDrag = (event: DragEvent) => event.preventDefault();

  rail.addEventListener('pointerdown', down);
  rail.addEventListener('pointermove', move);
  rail.addEventListener('pointerup', up);
  rail.addEventListener('pointercancel', up);
  rail.addEventListener('dragstart', noNativeDrag);
  return () => {
    rail.removeEventListener('pointerdown', down);
    rail.removeEventListener('pointermove', move);
    rail.removeEventListener('pointerup', up);
    rail.removeEventListener('pointercancel', up);
    rail.removeEventListener('dragstart', noNativeDrag);
    rail.removeEventListener('click', swallow, true);
    rail.removeAttribute('data-dragging');
  };
}
