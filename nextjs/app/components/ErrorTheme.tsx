'use client';

import { useLayoutEffect } from 'react';
import { THEME_KEY } from '@/lib/theme';

/** A streamed 404 can replace <html> after the initial theme script ran. */
export default function ErrorTheme() {
  useLayoutEffect(() => {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      if (theme === 'dark' || theme === 'light') {
        document.documentElement.setAttribute('data-theme', theme);
      }
    } catch {
      // The error page remains usable when storage is unavailable.
    }
  }, []);
  return null;
}
