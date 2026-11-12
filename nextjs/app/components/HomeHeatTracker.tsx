'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isContentVisible } from '@/lib/analytics/contentVisibility';
import { pathKey } from '@/lib/analytics/pathKey';
import { countHome } from '@/lib/analytics';
import { HOME_SECTIONS, PHONE_MAX_WIDTH, SCROLL_SECTIONS } from '@/lib/analytics/homeHeat';

/** Ein Aufruf beim Öffnen; Scroll-Meilensteine einmalig beim Erreichen.
 * Die Messung läuft nach Tabwechseln weiter. Keine Kennung und kein Speicher. */

const INTERACTIVE =
  'a[href], button, [role="button"], input, textarea, select, summary, label, [data-heat]';

function sectionOf(element: Element): { key: string; box: Element } | null {
  for (const section of HOME_SECTIONS) {
    const box = element.closest(section.selector);
    if (box) return { key: section.key, box };
  }
  return null;
}

/** Was angeklickt wurde, so lesbar wie möglich: ein Pfad, ein Host oder ein
 *  fester Bedienelementtyp. Kürzen und säubern übernimmt die Route (targetKey). */
function targetOf(element: Element): string | null {
  const hit = element.closest(INTERACTIVE);
  if (!hit) return null;
  const named = hit.getAttribute('data-heat');
  if (named) return named;
  if (hit instanceof HTMLAnchorElement) {
    try {
      const url = new URL(hit.href, window.location.href);
      if (url.origin !== window.location.origin) return url.host;
      return pathKey(url.pathname);
    } catch {
      return null;
    }
  }
  return hit.tagName.toLowerCase();
}

export default function HomeHeatTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== '/' && pathname !== '/en') return;
    const device = window.innerWidth <= PHONE_MAX_WIDTH ? 'phone' : 'desktop';
    const page = document.querySelector('[data-hub]');
    if (!page) return;

    const depths = new Set<number>();
    const reached = new Set<string>();
    let frame = 0;
    countHome({ home: 'view', device });

    const measure = () => {
      frame = 0;
      if (!isContentVisible() || !page.getClientRects().length) return;
      const nextDepths: number[] = [];
      const nextReached: string[] = [];
      const rect = page.getBoundingClientRect();
      if (rect.height > 0) {
        const depth = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / rect.height));
        for (let step = 10; step <= 100; step += 10)
          if (depth >= step / 100 && !depths.has(step)) {
            depths.add(step);
            nextDepths.push(step);
          }
      }
      for (const section of HOME_SECTIONS) {
        if (!SCROLL_SECTIONS.includes(section.key) || reached.has(section.key)) continue;
        const box = document.querySelector(section.selector);
        // Ausgeblendete Abschnitte (Starter Pack für Angemeldete) haben kein
        // Rechteck und stünden sonst bei top 0 als „erreicht" da.
        if (!box || box.getClientRects().length === 0) continue;
        if (box.getBoundingClientRect().top < window.innerHeight) {
          reached.add(section.key);
          nextReached.push(section.key);
        }
      }
      if (nextDepths.length || nextReached.length)
        countHome({ home: 'progress', device, depths: nextDepths, reached: nextReached });
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    const onHide = () => {
      if (document.visibilityState === 'visible') schedule();
    };

    const onClick = (event: MouseEvent) => {
      if (!isContentVisible() || !(event.target instanceof Element)) return;
      if (event.detail === 0 && event.clientX === 0 && event.clientY === 0) return;
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
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      document.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
      document.removeEventListener('click', onClick, { capture: true });
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [pathname]);

  return null;
}
