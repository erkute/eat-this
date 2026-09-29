import { useEffect } from 'react';
import { isPhoneViewport } from './viewport';

/* Scroll positions come in fractions; this close to the end is the end. */
const END_SLACK_PX = 2;

export function isAtPageEnd(scrollY: number, scrollHeight: number, viewportHeight: number): boolean {
  return scrollY >= scrollHeight - viewportHeight - END_SLACK_PX;
}

/**
 * Phone map: the end of the page stays above Safari's bar.
 *
 * Scrolling down, Safari shrinks its bottom bar (viewport 714 → 754px on an
 * iPhone 17); at the end of the page it unfolds it again. A plain page runs
 * into its rubber band meanwhile and settles at the new, deeper end. The map
 * has no rubber band (`overscroll-behavior-y: none` in globals.css, since
 * 23.09.2026 — it dragged the map along at the top), so the scroll stayed put
 * and the last 40px slid under the bar: at the end of a detail, the content
 * could be pushed up once more (Betreiber, 29.09.2026).
 *
 * So: whoever stood at the end when the viewport shrinks is put back at the
 * end — the way the rubber band would. Not while a finger is on the glass;
 * then as it lifts.
 */
export function usePageEndAnchor(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    /* The page as the last scroll left it — before Safari moved its bar. */
    let last = { y: window.scrollY, height: window.innerHeight };
    let touching = false;
    let pending = false;

    const note = () => {
      last = { y: window.scrollY, height: window.innerHeight };
    };
    const wasAtEnd = () => isAtPageEnd(last.y, root.scrollHeight, last.height);
    const toEnd = () => {
      pending = false;
      const end = root.scrollHeight - window.innerHeight;
      if (window.scrollY < end) window.scrollTo({ top: end, behavior: 'instant' });
      note();
    };

    const onResize = () => {
      if (!isPhoneViewport() || !wasAtEnd()) return note();
      if (touching) {
        pending = true;
        return;
      }
      toEnd();
    };
    const onTouchStart = () => {
      touching = true;
    };
    const onTouchEnd = (e: Event) => {
      if ((e as TouchEvent).touches?.length) return;
      touching = false;
      if (pending && wasAtEnd()) toEnd();
      pending = false;
    };

    window.addEventListener('scroll', note, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    window.visualViewport?.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('scroll', note);
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [active]);
}
