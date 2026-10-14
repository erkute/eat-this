'use client';

import { useEffect, useRef } from 'react';

/** Das Booster-Pack wird beim Hereinkommen auf die Seite geworfen. Fotos und
 *  Texte bleiben ruhig. Ohne JS steht das Pack einfach da. */
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
        const packs = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target);
        if (!packs.length) return;
        packs.forEach((target) => observer.unobserve(target));
        context.add(() => {
          gsap.fromTo(packs, { x: -24, y: 24, rotation: -12, scale: 0.94 }, {
            x: 0, y: 0, rotation: 0, scale: 1, duration: 1.25,
            ease: 'elastic.out(1, 0.7)', clearProps: 'transform',
          });
        });
      }, { threshold: 0.12 });
      root.querySelectorAll('[data-discovery-pack]').forEach((target) => observer.observe(target));
      const stop = () => { observer.disconnect(); context.revert(); };
      motion.addEventListener('change', stop, { once: true });
      cleanup = () => { stop(); motion.removeEventListener('change', stop); };
    });
    return () => { cancelled = true; cleanup(); };
  }, []);
  return <span ref={marker} hidden />;
}
