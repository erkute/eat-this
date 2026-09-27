'use client';

import { useEffect, useRef } from 'react';
import { notify } from '@/lib/notice';

const SEEN_KEY = 'eatthis:map-location-welcome';

/** Invite once, after the cookie gate and permission check have settled.
 * The browser permission prompt remains exclusively a user-triggered action. */
export function useLocationWelcome(eligible: boolean, locale: string, onLocate: () => void) {
  const shown = useRef(false);
  const locate = useRef(onLocate);
  useEffect(() => {
    locate.current = onLocate;
  }, [onLocate]);

  useEffect(() => {
    if (!eligible || shown.current) return;
    try {
      if (localStorage.getItem(SEEN_KEY)) return;
    } catch {
      /* Storage can be unavailable; the in-memory guard still applies. */
    }
    let dismiss: (() => void) | void;
    const timer = window.setTimeout(() => {
      if (!window.showNotice) return;
      shown.current = true;
      try {
        localStorage.setItem(SEEN_KEY, '1');
      } catch {
        /* Optional persistence. */
      }
      dismiss = notify('locationWelcome', locale, {
        action: { label: locale === 'en' ? 'Share' : 'Freigeben', onClick: () => locate.current() },
        dismissLabel: locale === 'en' ? 'Later' : 'Später',
        duration: 0,
      });
    }, 800);
    return () => {
      window.clearTimeout(timer);
      dismiss?.();
    };
  }, [eligible, locale]);
}
