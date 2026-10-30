'use client';

import { useEffect } from 'react';

/** Keep quick taps visible for one short beat; scrolling cancels the press. */
export default function PressFeedback() {
  useEffect(() => {
    let press: { element: Element; id: number; x: number; y: number; start: number } | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const clear = () => {
      clearTimeout(timeout);
      press?.element.removeAttribute('data-et-pressed');
      press = undefined;
    };
    const down = (event: PointerEvent) => {
      clear();
      if (!event.isPrimary || event.button !== 0 || !(event.target instanceof Element)) return;
      const element = event.target.closest('a[href], button, summary, [role="button"]');
      if (!element || element.matches(':disabled, [aria-disabled="true"]')) return;
      press = { element, id: event.pointerId, x: event.clientX, y: event.clientY, start: performance.now() };
      element.setAttribute('data-et-pressed', '');
    };
    const move = (event: PointerEvent) => {
      if (press?.id === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) clear();
    };
    const up = (event: PointerEvent) => {
      if (press?.id !== event.pointerId) return;
      const remaining = Math.max(0, 120 - (performance.now() - press.start));
      if (remaining) timeout = setTimeout(clear, remaining);
      else clear();
    };
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('pointermove', move, true);
    document.addEventListener('pointerup', up, true);
    document.addEventListener('pointercancel', clear, true);
    document.addEventListener('scroll', clear, true);
    window.addEventListener('blur', clear);
    return () => {
      clear();
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerup', up, true);
      document.removeEventListener('pointercancel', clear, true);
      document.removeEventListener('scroll', clear, true);
      window.removeEventListener('blur', clear);
    };
  }, []);
  return null;
}
