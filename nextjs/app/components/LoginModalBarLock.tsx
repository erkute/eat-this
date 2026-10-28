'use client';
import { useLayoutEffect } from 'react';

/** Sperrt den Seiten-Scroll; die sichtbare Seite behält ihre Farben. */
export default function LoginModalBarLock() {
  useLayoutEffect(() => {
    const de = document.documentElement;
    const b = document.body;
    const mobile = window.matchMedia('(max-width: 1023.98px)').matches;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const prevBodyPosition = b.style.position;
    const prevBodyTop = b.style.top;
    const prevBodyWidth = b.style.width;
    // Scroll lock (all viewports) — single source of truth for the login
    // modal; BridgeAuth's old snapshot-restore lock raced with the closing
    // burger drawer and could re-apply its stale overflow:hidden.
    de.style.overflow = 'hidden';
    b.style.overflow = 'hidden';
    b.style.touchAction = 'none';
    if (mobile) {
      b.style.position = 'fixed';
      b.style.top = `-${scrollY}px`;
      b.style.width = '100%';
    }
    return () => {
      // Clear instead of restore-previous (see race note above).
      de.style.overflow = '';
      b.style.overflow = '';
      b.style.touchAction = '';
      b.style.position = prevBodyPosition;
      b.style.top = prevBodyTop;
      b.style.width = prevBodyWidth;
      if (mobile) {
        requestAnimationFrame(() => window.scrollTo(0, scrollY));
      }
    };
  }, []);
  return null;
}
