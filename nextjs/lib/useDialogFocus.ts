'use client';

import { useEffect, type RefObject } from 'react';

/** Keep keyboard navigation inside a modal, including CSS-hidden slides. */
export function useDialogFocus(
  open: boolean,
  panelRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    const previous = document.activeElement;
    const trigger = triggerRef.current;
    const focusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]')
      ).filter(
        (el) =>
          el.tabIndex >= 0 &&
          !el.matches(':disabled') &&
          !el.closest('[hidden], [inert], [aria-hidden="true"]') &&
          el.getClientRects().length > 0 &&
          getComputedStyle(el).visibility !== 'hidden'
      );
    const enter = () => (focusable()[0] ?? panel).focus();
    enter();
    const onFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !panel.contains(event.target)) enter();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = focusable();
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (
        !items.length ||
        index < 0 ||
        (event.shiftKey ? index === 0 : index === items.length - 1)
      ) {
        event.preventDefault();
        (event.shiftKey ? (items.at(-1) ?? panel) : (items[0] ?? panel)).focus();
      }
    };
    document.addEventListener('focusin', onFocus);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('keydown', onKey);
      const returnTo =
        previous instanceof HTMLElement && previous !== document.body && previous.isConnected
          ? previous
          : trigger;
      returnTo?.focus();
    };
  }, [open, panelRef, triggerRef]);
}
