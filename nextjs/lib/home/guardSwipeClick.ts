/** Keep native touch scrolling; suppress only clicks that follow a swipe. */
export function guardSwipeClick(surface: HTMLElement): () => void {
  let start: { id: number; x: number; y: number } | null = null;
  let swiped = false;
  const down = (event: PointerEvent) => {
    swiped = false;
    start = event.pointerType === 'mouse' ? null : { id: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const markSwipe = () => { swiped = true; };
  const move = (event: PointerEvent) => {
    if (start?.id === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) markSwipe();
  };
  const cancel = () => { if (start) markSwipe(); start = null; };
  const up = (event: PointerEvent) => { move(event); start = null; };
  const click = (event: MouseEvent) => {
    // Keyboard and programmatic continuation clicks have no pointer detail.
    if (!swiped || event.detail === 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  surface.addEventListener('pointerdown', down, { passive: true });
  surface.addEventListener('pointermove', move, { passive: true });
  surface.addEventListener('pointerup', up, { passive: true });
  surface.addEventListener('pointercancel', cancel, { passive: true });
  surface.addEventListener('click', click, true);
  return () => {
    surface.removeEventListener('pointerdown', down);
    surface.removeEventListener('pointermove', move);
    surface.removeEventListener('pointerup', up);
    surface.removeEventListener('pointercancel', cancel);
    surface.removeEventListener('click', click, true);
  };
}
