import type { MouseEvent } from 'react';

const KEY = 'eat-this:discovery-arrival';
export function hasDiscoveryImage(): boolean {
  try {
    return Boolean(sessionStorage.getItem(KEY));
  } catch {
    return false;
  }
}
export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Navigation itself remains a normal link, including modified clicks. */
export function rememberDiscoveryImage(
  event: MouseEvent<HTMLAnchorElement>,
  image: HTMLImageElement | null
) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    !image ||
    prefersReducedMotion()
  )
    return;
  const { x, y, width, height } = image.getBoundingClientRect();
  if (!image.complete || !image.naturalWidth || y + height < 0 || y > window.innerHeight) return;
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        path: new URL(event.currentTarget.href).pathname,
        src: image.currentSrc,
        rect: { x, y, width, height },
        time: Date.now(),
      })
    );
  } catch {
    /* Storage is optional; the link still works. */
  }
}

export function takeDiscoveryImage(
  path: string
): { src: string; rect: { x: number; y: number; width: number; height: number } } | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw || prefersReducedMotion()) return null;
    const value = JSON.parse(raw);
    if (value.path !== path || Date.now() - value.time > 5000) return null;
    if (typeof value.src !== 'string' || !value.src.startsWith('https://cdn.sanity.io/'))
      return null;
    if (!['x', 'y', 'width', 'height'].every((k) => Number.isFinite(value.rect?.[k]))) return null;
    return value;
  } catch {
    return null;
  }
}
