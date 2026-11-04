'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { appScroller } from '@/lib/dom/appScroller';

/** Phones held sideways stack the cards instead of fanning them (AboutPage.module.css). */
const STACKED_CARDS = '(orientation: landscape) and (max-height: 500px) and (min-width: 600px) and (max-width: 1023.98px)';

/** Only the cards fan out. All other artwork stays still; CSS supplies the
 * open fan before hydration and for reduced motion. */
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
      // Rebuild when the breakpoint changes: desktop uses the app scroller,
      // mobile the document. The animation itself is the same in both.
      media.add({ motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 768px)', stacked: STACKED_CARDS }, (context) => {
        if (!context.conditions?.motion || context.conditions.stacked) return;
        const scroller = appScroller() ?? undefined;
        element.querySelectorAll<HTMLElement>('[data-about-fan]').forEach((fan) => {
          const cards = Array.from(fan.querySelectorAll<HTMLElement>('[data-about-card]'));
          gsap.fromTo(cards, {
            rotation: (index) => Number(cards[index].dataset.fanAngle) / 8,
            xPercent: 0,
            x: 0,
          }, {
            rotation: (index) => Number(cards[index].dataset.fanAngle),
            xPercent: (index) => Number(cards[index].dataset.fanX),
            x: 0,
            ease: 'power1.out',
            scrollTrigger: { scroller, trigger: fan, start: 'top 90%', end: 'top 20%', scrub: 0.6 },
          });
        });
      });
      revert = () => media.revert();
    });
    return () => { disposed = true; revert?.(); };
  }, []);
  return <div ref={root} className={className}>{children}</div>;
}
