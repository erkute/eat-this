'use client';
import { useEffect } from 'react';
import { restoreStyle, snapshotStyle } from '@/lib/dom/styleSnapshot';

/** Dasselbe Schwarz wie der Vorhang (LoginModalOverlay.module.css). */
const LOGIN_CANVAS_COLOR = '#000';

/**
 * Scroll-Sperre und Leistenfarbe, solange das Login-Modal offen ist.
 *
 * Die Leisten faerbt auf iOS 26 der deckend schwarze Vorhang selbst — ein
 * fixiertes Vollbild-Element mit voller Deckkraft gibt Status- und URL-Leiste
 * seine Farbe. Hier kommt nur der Rueckfall dazu: html/body schwarz (die
 * Farbe, auf die Safari ohne fixiertes Randelement zurueckgreift) und
 * `theme-color` fuer aeltere Safaris. Der Weichzeichner auf der Seite und die
 * Schleier-Schuerze sind weg: hinter einem deckenden Vorhang sieht sie keiner.
 *
 * Inline-Stile mit Absicht — eine `:has()`-Regel im Stylesheet rechnete
 * richtig, faerbte die Leiste am Geraet aber nicht um.
 */
export default function LoginModalBarLock() {
  useEffect(() => {
    const de = document.documentElement;
    const b = document.body;
    const mobile = window.matchMedia('(max-width: 1023.98px)').matches;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const prevBodyPosition = b.style.position;
    const prevBodyTop = b.style.top;
    const prevBodyWidth = b.style.width;
    const prevHtmlBackground = snapshotStyle(de.style, 'background');
    const prevHtmlBackgroundColor = snapshotStyle(de.style, 'background-color');
    const prevBodyBackground = snapshotStyle(b.style, 'background');
    const prevBodyBackgroundColor = snapshotStyle(b.style, 'background-color');
    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const createdThemeMeta = !themeMeta;
    const activeThemeMeta = themeMeta ?? document.createElement('meta');
    const prevThemeColor = activeThemeMeta.getAttribute('content');

    // Scroll lock (all viewports) — single source of truth for the login
    // modal; BridgeAuth's old snapshot-restore lock raced with the closing
    // burger drawer and could re-apply its stale overflow:hidden.
    de.style.overflow = 'hidden';
    b.style.overflow = 'hidden';
    b.style.touchAction = 'none';
    if (mobile) {
      de.style.setProperty('background', LOGIN_CANVAS_COLOR, 'important');
      de.style.setProperty('background-color', LOGIN_CANVAS_COLOR, 'important');
      b.style.setProperty('background', LOGIN_CANVAS_COLOR, 'important');
      b.style.setProperty('background-color', LOGIN_CANVAS_COLOR, 'important');
      b.style.position = 'fixed';
      b.style.top = `-${scrollY}px`;
      b.style.width = '100%';
      if (createdThemeMeta) {
        activeThemeMeta.setAttribute('name', 'theme-color');
        document.head.appendChild(activeThemeMeta);
      }
      activeThemeMeta.setAttribute('content', LOGIN_CANVAS_COLOR);
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
        restoreStyle(de.style, 'background', prevHtmlBackground);
        restoreStyle(de.style, 'background-color', prevHtmlBackgroundColor);
        restoreStyle(b.style, 'background', prevBodyBackground);
        restoreStyle(b.style, 'background-color', prevBodyBackgroundColor);
        if (createdThemeMeta) {
          activeThemeMeta.remove();
        } else if (prevThemeColor == null) {
          activeThemeMeta.removeAttribute('content');
        } else {
          activeThemeMeta.setAttribute('content', prevThemeColor);
        }
        requestAnimationFrame(() => window.scrollTo(0, scrollY));
      }
    };
  }, []);
  return null;
}
