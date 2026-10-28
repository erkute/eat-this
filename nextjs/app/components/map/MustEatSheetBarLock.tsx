'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { currentTheme, subscribeTheme } from '@/lib/theme';
import { restoreStyle, snapshotStyle } from '@/lib/dom/styleSnapshot';

const serverTheme = () => 'light' as const;

/** Browsergrund und theme-color folgen der Must-Eat-Fläche im aktuellen Theme.
 * Beim Schließen werden die vorherigen Seitenfarben wiederhergestellt.
 * Nur unter 1024px: der Desktop-Rail färbt die Browserleisten nicht ein. */
export default function MustEatSheetBarLock() {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, serverTheme);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    if (!window.matchMedia('(max-width: 1023.98px)').matches) return;
    const de = document.documentElement;
    const ground = getComputedStyle(de).getPropertyValue('--et-ground').trim();
    const b = document.body;
    const prev = [
      ['background', snapshotStyle(de.style, 'background')],
      ['background-color', snapshotStyle(de.style, 'background-color')],
    ] as const;
    const prevBody = [
      ['background', snapshotStyle(b.style, 'background')],
      ['background-color', snapshotStyle(b.style, 'background-color')],
    ] as const;
    const existingMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const createdMeta = !existingMeta;
    const meta = existingMeta ?? document.createElement('meta');
    const prevThemeColor = meta.getAttribute('content');

    for (const [prop] of prev) de.style.setProperty(prop, ground, 'important');
    for (const [prop] of prevBody) b.style.setProperty(prop, ground, 'important');
    if (createdMeta) {
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', ground);

    return () => {
      for (const [prop, snap] of prev) restoreStyle(de.style, prop, snap);
      for (const [prop, snap] of prevBody) restoreStyle(b.style, prop, snap);
      if (createdMeta) meta.remove();
      else if (prevThemeColor == null) meta.removeAttribute('content');
      else meta.setAttribute('content', prevThemeColor);
    };
  }, [theme]);
  return null;
}
