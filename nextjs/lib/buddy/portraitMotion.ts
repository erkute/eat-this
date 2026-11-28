import gsap from 'gsap';
import { prefersReducedMotion } from './reveal';

/** Sink behind the composer, then peek up into the title bar. */
export function animatePortraitHandoff(node: HTMLElement, origin: DOMRect, edge: number): () => void {
  if (prefersReducedMotion()) return () => {};
  const target = node.getBoundingClientRect();
  const face = node.firstElementChild;
  const visibleHeight = edge - origin.top;
  if (!(face instanceof HTMLElement) || origin.width <= 0 || target.width <= 0 || visibleHeight <= 0) return () => {};

  const x = origin.left - target.left;
  const y = origin.top - target.top;
  const scale = origin.width / target.width;
  const context = gsap.context(() => {
    node.dataset.buddyMotion = 'leaving';
    gsap.set(node, {
      x, y, scale,
      transformOrigin: '0 0',
      clipPath: `inset(0px -24px ${target.height - visibleHeight / scale}px -24px)`,
    });
    gsap.timeline({
      onComplete: () => {
        gsap.set(node, { clearProps: 'transform,transformOrigin,clipPath' });
        gsap.set(face, { clearProps: 'transform,transformOrigin' });
        delete node.dataset.buddyMotion;
      },
    })
      // Keep the lower edge fixed at the top of the composer as Remy sinks.
      .to(node, {
        y: y + visibleHeight + 6,
        clipPath: `inset(0px -24px ${target.height + 6 / scale}px -24px)`,
        duration: 0.38,
        ease: 'power2.in',
      })
      .set(face, { y: target.height + 8 }, '+=0.07')
      .set(node, { x: 0, y: 0, scale: 1, clipPath: 'none' })
      .call(() => { node.dataset.buddyMotion = 'entering'; })
      // The fixed header frame masks the figure while it looks over the edge.
      .to(face, { y: 0, duration: 0.6, ease: 'power2.out', force3D: true });
  }, node);

  return () => {
    context.revert();
    delete node.dataset.buddyMotion;
  };
}
