'use client';

/**
 * Pixel value of `env(safe-area-inset-top)`.
 *
 * CSS `env()` is unreachable from JS, and several map behaviours need the
 * number: IntersectionObserver rootMargins, and the flyTo/fitBounds padding
 * that has to keep pins clear of the floating top controls.
 *
 * Probing forces a style resolve, so the result is cached until the viewport
 * changes (rotation flips the inset on iPhones; the URL bar does not).
 */
let cached: { width: number; height: number; value: number } | null = null;

export function safeAreaInsetTop(): number {
  if (typeof document === 'undefined') return 0;
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (cached && cached.width === width && cached.height === height) return cached.value;

  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;' +
    'padding-top:env(safe-area-inset-top,0px);';
  document.body.appendChild(probe);
  const value = parseFloat(getComputedStyle(probe).paddingTop) || 0;
  document.body.removeChild(probe);

  cached = { width, height, value };
  return value;
}
