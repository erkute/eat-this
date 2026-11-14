import { useEffect } from 'react';
import { isPhoneViewport, isSheetViewport } from './viewport';

/* Scroll keeper — TABLET only (768–1023.98px). There the map page is a
   fixed-height in-flow box (100lvh + 80px apron) whose drag-sheet captures
   every gesture, so the window's ~bar-height scroll range must stay pinned
   at 0 or the toolbar clips. PHONES are the opposite: the list is a
   window-scrolled in-flow document (rows frost through iOS Safari's bottom
   URL bar) — the window MUST scroll freely there; just reset once on entry
   so the map doesn't open half-scrolled from a previous visit. */
export function useMapWindowScrollKeeper(isActive: boolean): void {
  useEffect(() => {
    if (!isActive) return;
    if (!isSheetViewport()) return;
    if (isPhoneViewport()) {
      window.scrollTo(0, 0);
      return;
    }
    const onScroll = () => {
      if (!isSheetViewport() || isPhoneViewport()) return;
      if (window.scrollY !== 0) window.scrollTo({ top: 0, behavior: 'instant' });
    };
    onScroll(); // entering the map with a leftover scroll position
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isActive]);
}
