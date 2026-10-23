'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { appScroller } from '@/lib/dom/appScroller';

/** Only artwork moves. The entire Sanity story is readable before hydration. */
export default function AboutStoryMotion({ children, className }: { children: ReactNode; className: string }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let disposed = false;
    let revert: (() => void) | undefined;
    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ default: gsap }, { ScrollTrigger }]) => {
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);
      const media = gsap.matchMedia();
      media.add({ motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 768px)' }, (context) => {
        if (!context.conditions?.motion) return;
        const scroller = appScroller() ?? undefined;
        element.querySelectorAll<HTMLElement>('[data-about-art]').forEach((art) => {
          gsap.fromTo(art, { y: 36 }, {
            y: -16,
            ease: 'none',
            scrollTrigger: { scroller, trigger: art, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
          });
        });
        element.querySelectorAll<HTMLElement>('[data-about-card]').forEach((card) => {
          const front = card.dataset.aboutCard === 'front';
          gsap.fromTo(card, { rotation: front ? 0 : -2, xPercent: front ? -12 : 12 }, {
            rotation: front ? 9 : -9,
            xPercent: 0,
            ease: 'none',
            scrollTrigger: { scroller, trigger: card.closest('[data-about-chapter]'), start: 'top 85%', end: 'center 40%', scrub: 0.6 },
          });
        });
      });
      revert = () => media.revert();
    });
    return () => { disposed = true; revert?.(); };
  }, []);
  return <div ref={root} className={className}>{children}</div>;
}
