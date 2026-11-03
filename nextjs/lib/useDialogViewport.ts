'use client';

import { useEffect, type RefObject } from 'react';

/** Follow the visible area above a software keyboard, including Safari's
 * viewport panning. CSS viewport units alone keep the keyboard's height. */
export function useDialogViewport(ref: RefObject<HTMLElement | null>, open = true) {
  useEffect(() => {
    const root = ref.current;
    const viewport = window.visualViewport;
    if (!open || !root || !viewport) return;
    const apply = () => {
      root.style.setProperty('--dialog-viewport-top', `${viewport.offsetTop}px`);
      root.style.setProperty('--dialog-viewport-height', `${viewport.height}px`);
      // Safari can also shrink innerHeight after the viewport event; the
      // document's layout height still distinguishes the software keyboard.
      const layoutHeight = Math.max(window.innerHeight, document.documentElement.clientHeight);
      root.toggleAttribute('data-keyboard', viewport.scale === 1 && layoutHeight - viewport.height > 120);
    };
    // Safari can retain the old keyboard viewport across a rotation. Blur the
    // editor so the browser lays out the new orientation; its draft is kept.
    const rotate = () => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && root.contains(active)
        && active.matches('input, textarea, [contenteditable="true"]')) active.blur();
      apply();
    };
    apply();
    viewport.addEventListener('resize', apply);
    viewport.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', rotate);
    return () => {
      viewport.removeEventListener('resize', apply);
      viewport.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', rotate);
      root.style.removeProperty('--dialog-viewport-top');
      root.style.removeProperty('--dialog-viewport-height');
      root.removeAttribute('data-keyboard');
    };
  }, [ref, open]);
}
