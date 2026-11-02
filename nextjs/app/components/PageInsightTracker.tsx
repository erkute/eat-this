'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { countInsight } from '@/lib/analytics';
import {
  INSIGHT_SELECTORS,
  surfaceForPath,
  type InsightSignal,
  type InsightSection,
} from '@/lib/analytics/engagement';
import { isContentVisible } from '@/lib/analytics/contentVisibility';
import { subscribeInsightEvents } from '@/lib/analytics/eventSignals';

/** Einmalige Meilensteine je Seitenaufruf. Es werden weder Eingabetexte noch Personenverläufe gespeichert. */
export default function PageInsightTracker() {
  const pathname = usePathname();
  useEffect(() => {
    const surface = surfaceForPath(pathname);
    if (!surface) return;
    const device = window.innerWidth < 768 ? 'phone' : 'desktop';
    const sent = new Set<InsightSignal>();
    let visibleSeconds = 0;
    let frame = 0;
    let previous = performance.now();
    const root = () => {
      const element = document.querySelector<HTMLElement>(INSIGHT_SELECTORS[surface]);
      return surface === 'article' &&
        element?.getAttribute('data-article-slug') !== pathname.split('/').at(-1)
        ? null
        : element;
    };
    const take = (signals: InsightSignal[]) =>
      signals.filter((signal) => {
        if (sent.has(signal)) return false;
        sent.add(signal);
        return true;
      });
    const send = (signals: InsightSignal[]) => {
      const next = take(signals);
      if (next.length) countInsight({ insight: 'signals', device, signals: next });
    };
    send(['view']);
    const measure = () => {
      frame = 0;
      if (!isContentVisible()) return;
      const page = root();
      if (!page || !page.getClientRects().length) return;
      if (surface === 'map') {
        const detail = page.querySelector<HTMLElement>(
          '[data-detail-mount][data-detail-kind="restaurant"]'
        );
        if (
          detail &&
          !detail.closest('[aria-hidden="true"],[data-panel-hidden="true"]') &&
          detail.getClientRects().length
        ) {
          const bounds = detail.getBoundingClientRect();
          if (
            bounds.bottom > 0 &&
            bounds.top < innerHeight &&
            bounds.right > 0 &&
            bounds.left < innerWidth
          )
            send(['spot']);
        }
        return;
      }
      const content =
        surface === 'article'
          ? (page.querySelector<HTMLElement>('[data-article-content]') ?? page)
          : page;
      const rect = content.getBoundingClientRect();
      if (rect.height <= 0) return;
      const depth = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / rect.height));
      send(
        ([25, 50, 75, 100] as const)
          .filter((n) => depth >= n / 100)
          .map((n) => `depth${n}` as InsightSignal)
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const tick = () => {
      const now = performance.now();
      const elapsed = Math.min(2, (now - previous) / 1000);
      previous = now;
      if (!isContentVisible() || !root()?.getClientRects().length) return;
      visibleSeconds += elapsed;
      if (visibleSeconds >= 10) send(['engaged']);
      if (visibleSeconds >= 30) send(['read30']);
    };
    const onVisibility = () => {
      previous = performance.now();
      if (isContentVisible()) schedule();
    };
    const onClick = (event: MouseEvent) => {
      if (!isContentVisible() || !(event.target instanceof Element)) return;
      const page = root();
      if (!page?.contains(event.target)) return;
      const hit = event.target.closest('a[href],button,input,select,summary,[role="button"]');
      const signals: InsightSignal[] = ['engaged'];
      let target = hit ? 'control' : 'other';
      const link = hit?.closest('a[href]');
      if (link instanceof HTMLAnchorElement) {
        const url = new URL(link.href, location.href);
        if (url.origin !== location.origin) {
          signals.push('outbound');
          target = 'external';
        }
        if (url.origin === location.origin && url.pathname !== location.pathname) {
          signals.push('onward');
          const dest = surfaceForPath(url.pathname);
          if (dest === 'article') {
            signals.push('article');
            target = 'article';
          } else if (/\/(?:en\/)?restaurant\//.test(url.pathname)) {
            signals.push('spot');
            target = 'spot';
          } else if (dest === 'map') target = 'map';
          else if (/\/pack(?:s|\/)/.test(url.pathname)) target = 'pack';
          else target = 'navigation';
        }
      }
      if (surface === 'map') {
        if (hit?.closest('[data-filter-chip-row],[data-filter-picker]')) signals.push('filter');
        send(signals);
        return;
      }
      if (event.detail === 0 && event.clientX === 0 && event.clientY === 0) {
        send(signals);
        return;
      }
      const point = hit ?? event.target;
      const section: InsightSection = point.closest('header')
        ? 'header'
        : point.closest('[data-site-footer],footer')
          ? 'footer'
          : 'content';
      const box =
        section === 'header'
          ? page.querySelector('header')
          : section === 'footer'
            ? page.querySelector('[data-site-footer],footer')
            : (page.querySelector('[data-article-content]') ?? page.querySelector('main') ?? page);
      const rect = (box ?? page).getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        send(signals);
        return;
      }
      const unit = (value: number) => Math.min(1, Math.max(0, value));
      countInsight({
        insight: 'click',
        device,
        section,
        target,
        x: unit((event.clientX - rect.left) / rect.width),
        y: unit((event.clientY - rect.top) / rect.height),
        signals: take(signals),
      });
    };
    const onInput = (event: Event) => {
      if (
        isContentVisible() &&
        surface === 'map' &&
        event.target instanceof HTMLInputElement &&
        event.target.type === 'search' &&
        root()?.contains(event.target)
      )
        send(['engaged', 'search']);
    };
    const unsubscribe = subscribeInsightEvents((name) => {
      if (!isContentVisible()) return;
      if (surface === 'map' && name === 'restaurant_opened') send(['spot']);
      else if (
        surface === 'map' &&
        [
          'restaurant_maps_clicked',
          'restaurant_menu_clicked',
          'restaurant_reservation_clicked',
        ].includes(name)
      )
        send(['engaged', 'outbound']);
      else if (
        surface === 'map' &&
        (name === 'map_view_toggle' || name === 'map_location_invite_accepted')
      )
        send(['engaged', 'filter']);
    });
    const timer = window.setInterval(tick, 1000);
    measure();
    document.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    document.addEventListener('click', onClick, true);
    document.addEventListener('input', onInput, true);
    document.addEventListener('visibilitychange', onVisibility);
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-detail-kind', 'aria-hidden', 'data-panel-hidden'],
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-consent-pending', 'data-consent-gate'],
    });
    return () => {
      unsubscribe();
      observer.disconnect();
      clearInterval(timer);
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pathname]);
  return null;
}
