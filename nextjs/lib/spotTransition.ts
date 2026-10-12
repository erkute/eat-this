import type { MouseEvent } from 'react';

let pending: { path: string; at: number } | undefined;

/** Record intent only: the real link navigates immediately and the current page stays visible. */
export function beginSpotTransition(event: MouseEvent<HTMLAnchorElement>) {
  const link = event.currentTarget;
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
      event.shiftKey || event.altKey || link.target === '_blank' || link.hasAttribute('download')) return;
  pending = undefined;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  pending = { path: new URL(link.href).pathname, at: Date.now() };
}

/** A small settling motion on the actual page, never an overlay or a duplicated image. */
export function arriveAtSpot(page: HTMLElement, path: string): () => void {
  const intent = pending;
  pending = undefined;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!intent || intent.path !== path || Date.now() - intent.at > 8000 ||
      motion.matches || !page.animate) return () => {};

  page.dataset.spotArrival = '';
  const animation = page.animate([
    { transform: 'translateY(8px)' },
    { transform: 'translateY(0)' },
  ], { duration: 240, easing: 'cubic-bezier(.22,1,.36,1)' });
  const finish = () => {
    animation.cancel();
    delete page.dataset.spotArrival;
    motion.removeEventListener('change', finish);
  };
  animation.onfinish = finish;
  motion.addEventListener('change', finish, { once: true });
  return finish;
}
