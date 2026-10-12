import gsap from 'gsap';
import { appScroller } from '@/lib/dom/appScroller';
import { scrollProgress } from '@/lib/dom/scrollProgress';

/** Karten folgen dem Scrollweg in beide Richtungen; ihre Textzeilen stehen still.
 * Gemessen wird am unbewegten Listenelement, bewegt nur dessen Karten-Link.
 * So fließt die eigene Transformation nie in die nächste Messung zurück. */
export function armMustEatCardMotion(deck: HTMLUListElement): () => void {
  const media = gsap.matchMedia();
  media.add(
    { motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 768px)' },
    (context) => {
      if (!context.conditions?.motion) return;
      const scroller = appScroller() ?? window;
      const slides = Array.from(deck.children) as HTMLElement[];
      const items = slides.flatMap((anchor, index) => {
        const target = anchor.querySelector('[data-stack-photo]')?.parentElement;
        if (!target) return [];
        return [{
          anchor, target, direction: index % 2 === 0 ? -1 : 1,
          y: gsap.quickTo(target, 'y', { duration: 0.25, ease: 'power1.out' }),
          rotation: gsap.quickTo(target, 'rotation', { duration: 0.25, ease: 'power1.out' }),
        }];
      });
      let frame = 0;
      let nearby = true;
      const update = (initial = false) => {
        const view = scroller instanceof HTMLElement
          ? scroller.getBoundingClientRect()
          : { top: 0, height: window.innerHeight };
        // Erst alle Positionen lesen, dann schreiben. Verdeckte mobile Karten
        // haben keine Box und brauchen auch keine Animation.
        const poses = items.map((item) => {
          const box = item.anchor.getBoundingClientRect();
          if (!box.height) return null;
          const progress = scrollProgress(box, view, 'top bottom', 'bottom top');
          return { item, y: 14 - progress * 42, rotation: item.direction * (3 - progress * 6) };
        });
        poses.forEach((pose) => {
          if (!pose) return;
          if (initial) gsap.set(pose.item.target, { y: pose.y, rotation: pose.rotation });
          else {
            pose.item.y(pose.y);
            pose.item.rotation(pose.rotation);
          }
        });
      };
      const schedule = () => {
        if (!nearby || frame) return;
        frame = requestAnimationFrame(() => { frame = 0; update(); });
      };
      const observer = new IntersectionObserver(([entry]) => {
        nearby = entry.isIntersecting;
        if (nearby) schedule();
      }, { root: scroller instanceof HTMLElement ? scroller : null, rootMargin: '160px' });
      update(true);
      observer.observe(deck);
      scroller.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      return () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        scroller.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        items.forEach(({ target, y, rotation }) => {
          y.tween.kill();
          rotation.tween.kill();
          gsap.set(target, { clearProps: 'transform,translate,rotate,scale' });
        });
      };
    }
  );
  return () => media.revert();
}
