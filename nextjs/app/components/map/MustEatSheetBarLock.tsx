'use client';
import { useEffect } from 'react';
import { restoreStyle, snapshotStyle } from '@/lib/dom/styleSnapshot';

const INK = '#15120e';

/**
 * Dunkle Browserleisten zum dunklen Must-Eat-Sheet (Telefon und Tablet).
 *
 * Die Map fährt bewusst ohne theme-color (map/page.tsx): ihre Liste scrollt
 * unter Safaris durchscheinenden Leisten, die sollen die echten Seitenpixel
 * zeigen. Das Must-Eat-Sheet ist aber eine fixe Ebene, und fixe Ebenen
 * komponiert Safari nie in die Leisten (siehe LoginModalBarLock) — die Leisten
 * zeigten das weiße Dokument dahinter, über einem Ink-Sheet. Solange das Sheet
 * offen ist, sind html und body deshalb Ink und ein theme-color sagt es Chrome
 * auf Android (und Safari mit Tönung) direkt. Beim Schließen wird alles
 * zurückgesetzt, damit Liste und Restaurant-Sheet wieder auf Weiß liegen.
 *
 * Nur unter 1024px: im Desktop-Rail steht das Sheet neben der hellen Karte.
 */
export default function MustEatSheetBarLock() {
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    if (!window.matchMedia('(max-width: 1023.98px)').matches) return;
    const de = document.documentElement;
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

    for (const [prop] of prev) de.style.setProperty(prop, INK, 'important');
    for (const [prop] of prevBody) b.style.setProperty(prop, INK, 'important');
    if (createdMeta) {
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', INK);

    return () => {
      for (const [prop, snap] of prev) restoreStyle(de.style, prop, snap);
      for (const [prop, snap] of prevBody) restoreStyle(b.style, prop, snap);
      if (createdMeta) meta.remove();
      else if (prevThemeColor == null) meta.removeAttribute('content');
      else meta.setAttribute('content', prevThemeColor);
    };
  }, []);
  return null;
}
