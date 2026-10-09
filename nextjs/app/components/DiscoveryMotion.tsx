'use client';

import { useEffect, useRef } from 'react';

/** Small image entrances. Server-rendered content stays visible without JS. */
export default function DiscoveryMotion() {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = marker.current?.closest('main');
    if (!root) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let cancelled = false;
    let cleanup = () => {};
    if (motion.matches) return;
    void import('gsap').then(({ gsap }) => {
      if (cancelled || motion.matches) return;
      const context = gsap.context(() => {}, root);
      const observer = new IntersectionObserver((entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target);
        if (!visible.length) return;
        visible.forEach((target) => observer.unobserve(target));
        context.add(() => {
          const packs = visible.filter((target) => target.hasAttribute('data-discovery-pack'));
          const photos = visible.filter((target) => !target.hasAttribute('data-discovery-pack'));
          if (packs.length) gsap.fromTo(packs, { x: -24, y: 24, rotation: -12, scale: 0.94 }, {
            x: 0, y: 0, rotation: 0, scale: 1, duration: 1.25,
            ease: 'elastic.out(1, 0.7)', clearProps: 'transform',
          });
          if (photos.length) gsap.fromTo(photos, { y: 18, rotation: 0.8 }, {
            y: 0, rotation: 0, duration: 0.55, stagger: 0.045,
            ease: 'power3.out', clearProps: 'transform',
          });
        });
      }, { threshold: 0.12 });
      root.querySelectorAll('[data-discovery-motion], [data-discovery-pack]').forEach((target) => observer.observe(target));
      const stop = () => { observer.disconnect(); context.revert(); };
      motion.addEventListener('change', stop, { once: true });
      cleanup = () => { stop(); motion.removeEventListener('change', stop); };
    });
    return () => { cancelled = true; cleanup(); };
  }, []);
  return <span ref={marker} hidden />;
}
