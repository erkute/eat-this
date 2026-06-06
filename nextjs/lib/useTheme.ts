'use client';

import { useCallback, useEffect, useState } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSysPref = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setIsDark(e.matches);
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', onSysPref);

    const onThemeChange = (e: Event) => setIsDark((e as CustomEvent).detail.dark);
    document.addEventListener('themechange', onThemeChange);

    return () => {
      mq.removeEventListener('change', onSysPref);
      document.removeEventListener('themechange', onThemeChange);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const next = document.documentElement.getAttribute('data-theme') !== 'dark';
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
    setIsDark(next);
    document.dispatchEvent(new CustomEvent('themechange', { detail: { dark: next } }));
  }, []);

  return { isDark, toggleTheme };
}
