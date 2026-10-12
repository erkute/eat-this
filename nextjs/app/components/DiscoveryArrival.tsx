'use client';

import { useEffect } from 'react';
import {
  hasDiscoveryImage,
  prefersReducedMotion,
  takeDiscoveryImage,
} from '@/lib/discovery-motion';

/** A decorative image travels between the two layouts; content is always visible. */
export default function DiscoveryArrival() {
  useEffect(() => {
    if (!hasDiscoveryImage()) return;
    if (prefersReducedMotion()) {
      takeDiscoveryImage(window.location.pathname);
      return;
    }
    let cancelled = false;
    let cleanup = () => {};
    void import('gsap').then(({ gsap }) => {
      const target = document.querySelector<HTMLImageElement>('[data-discovery-hero]');
      if (cancelled || !target || prefersReducedMotion()) return;
      // Consume only after the async boundary: Strict Mode's discarded effect
      // must not swallow the handoff meant for its replacement.
      const arrival = takeDiscoveryImage(window.location.pathname);
      if (!arrival) return;
      const end = target.getBoundingClientRect();
      const overlay = document.createElement('img');
      overlay.src = arrival.src;
      overlay.alt = '';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.dataset.discoveryTransition = '';
      Object.assign(overlay.style, {
        position: 'fixed',
        zIndex: '70',
        pointerEvents: 'none',
        objectFit: 'cover',
        left: `${arrival.rect.x}px`,
        top: `${arrival.rect.y}px`,
        width: `${arrival.rect.width}px`,
        height: `${arrival.rect.height}px`,
      });
      document.body.append(overlay);
      const timeline = gsap.timeline({ onComplete: () => overlay.remove() });
      timeline
        .to(overlay, {
          left: end.x,
          top: end.y,
          width: end.width,
          height: end.height,
          duration: 0.48,
          ease: 'power3.inOut',
        })
        .to(overlay, { opacity: 0, duration: 0.12 });
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const stop = () => {
        timeline.kill();
        overlay.remove();
      };
      window.addEventListener('wheel', stop, { passive: true, once: true });
      window.addEventListener('touchstart', stop, { passive: true, once: true });
      window.addEventListener('keydown', stop, { once: true });
      motion.addEventListener('change', stop);
      cleanup = () => {
        stop();
        window.removeEventListener('wheel', stop);
        window.removeEventListener('touchstart', stop);
        window.removeEventListener('keydown', stop);
        motion.removeEventListener('change', stop);
      };
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);
  return null;
}
