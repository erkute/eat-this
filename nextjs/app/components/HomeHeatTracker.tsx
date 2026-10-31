'use client';

import { useEffect } from 'react';
import { countHome } from '@/lib/analytics';
import { HOME_SECTIONS, PHONE_MAX_WIDTH, SCROLL_SECTIONS } from '@/lib/analytics/homeHeat';

/**
 * Misst auf der Startseite, wie weit ein Aufruf scrollt und wohin geklickt
 * wird — für den Reiter „Startseite" in /admin/stats.
 *
 * Gemessen wird am Rechteck der Seite, nicht an der Scrollposition des
 * Fensters: ab Desktop scrollt `.app-pages`, am Telefon das Fenster. Die
 * Rechtecke stimmen in beiden Fällen.
 *
 * Kein Speicher, keine Kennung: ein Scroll-Beacon beim Verlassen, ein
 * Klick-Beacon je Klick, beide über den Zähler in lib/analytics.ts.
 */

const INTERACTIVE =
  'a[href], button, [role="button"], input, textarea, select, summary, label, [data-heat]';

function sectionOf(element: Element): { key: string; box: Element } | null {
  for (const section of HOME_SECTIONS) {
    const box = element.closest(section.selector);
    if (box) return { key: section.key, box };
  }
  return null;
}

/** Was angeklickt wurde, so lesbar wie möglich: ein Pfad, ein Host oder die
 *  Beschriftung. Kürzen und säubern übernimmt die Route (targetKey). */
function targetOf(element: Element): string | null {
  const hit = element.closest(INTERACTIVE);
  if (!hit) return null;
  const named = hit.getAttribute('data-heat');
  if (named) return named;
  if (hit instanceof HTMLAnchorElement) {
    try {
      const url = new URL(hit.href, window.location.href);
      if (url.origin !== window.location.origin) return url.host;
      return url.hash && url.pathname === window.location.pathname ? url.hash : url.pathname;
    } catch {
      return null;
    }
  }
  return (
    hit.getAttribute('aria-label') ||
    (hit instanceof HTMLElement ? hit.innerText : '') ||
    hit.getAttribute('placeholder') ||
    hit.tagName.toLowerCase()
  );
}

export default function HomeHeatTracker() {
  useEffect(() => {
    const device = window.innerWidth <= PHONE_MAX_WIDTH ? 'phone' : 'desktop';
    const page = document.querySelector('[data-hub]');
    if (!page) return;

    let depth = 0;
    const reached = new Set<string>();
    let frame = 0;
    let sent = false;

    const measure = () => {
      frame = 0;
      const rect = page.getBoundingClientRect();
      if (rect.height > 0) {
        depth = Math.max(depth, Math.min(1, (window.innerHeight - rect.top) / rect.height));
      }
      for (const section of HOME_SECTIONS) {
        if (!SCROLL_SECTIONS.includes(section.key) || reached.has(section.key)) continue;
        const box = document.querySelector(section.selector);
        // Ausgeblendete Abschnitte (Starter Pack für Angemeldete) haben kein
        // Rechteck und stünden sonst bei top 0 als „erreicht" da.
        if (!box || box.getClientRects().length === 0) continue;
        if (box.getBoundingClientRect().top < window.innerHeight) reached.add(section.key);
      }
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    const flush = () => {
      if (sent) return;
      sent = true;
      measure();
      countHome({ home: 'scroll', device, depth, reached: [...reached] });
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const section = sectionOf(event.target);
      if (!section) return;
      const box = section.box.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0) return;
      const clamp = (v: number) => Math.min(1, Math.max(0, v));
      const target = targetOf(event.target);
      countHome({
        home: 'click',
        device,
        section: section.key,
        x: clamp((event.clientX - box.left) / box.width),
        y: clamp((event.clientY - box.top) / box.height),
        ...(target && { target }),
      });
    };

    measure();
    document.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    document.addEventListener('click', onClick, { capture: true });
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      // Ein Wechsel in der App (Startseite → Map) ist kein pagehide: der
      // Aufruf endet hier.
      flush();
      if (frame) window.cancelAnimationFrame(frame);
      document.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
      document.removeEventListener('click', onClick, { capture: true });
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  return null;
}
