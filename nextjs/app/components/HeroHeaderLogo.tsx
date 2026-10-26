'use client';

import { useEffect } from 'react';

/** The header mark appears only after the hero mark has scrolled behind it. */
export default function HeroHeaderLogo() {
  useEffect(() => {
    const mark = document.querySelector<HTMLElement>('[data-hero-mark]');
    const header = document.querySelector<HTMLElement>('[data-nav-logo]')?.closest('nav');
    if (!mark) return;
    const html = document.documentElement;
    let observer: IntersectionObserver | undefined;
    const observe = () => {
      observer?.disconnect();
      const top = Math.max(0, header?.getBoundingClientRect().bottom ?? 0);
      html.toggleAttribute('data-hero-mark-out', mark.getBoundingClientRect().bottom <= top);
      observer = new IntersectionObserver(([entry]) => {
        html.toggleAttribute('data-hero-mark-out', !entry.isIntersecting && entry.boundingClientRect.bottom <= top);
      }, { rootMargin: `-${top}px 0px 0px 0px`, threshold: 0 });
      observer.observe(mark);
    };
    observe();
    window.addEventListener('resize', observe);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', observe);
      html.removeAttribute('data-hero-mark-out');
    };
  }, []);
  return null;
}
