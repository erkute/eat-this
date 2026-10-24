import gsap from 'gsap';
import { prefersReducedMotion } from './reveal';

/** Sink behind the lower edge, then peek up into the title bar. */
export function animatePortraitHandoff(node: HTMLElement, origin: DOMRect): () => void {
  if (prefersReducedMotion()) return () => {};
  const target = node.getBoundingClientRect();
  const face = node.firstElementChild;
  if (!(face instanceof HTMLElement) || origin.width <= 0 || target.width <= 0) return () => {};

  const x = origin.left - target.left;
  const y = origin.top - target.top;
  const scale = origin.width / target.width;
  const context = gsap.context(() => {
    node.dataset.buddyMotion = 'leaving';
    gsap.set(node, { x, y, scale, transformOrigin: '0 0', clipPath: 'inset(0px -24px 0px -24px)' });
    gsap.timeline({
      onComplete: () => {
        gsap.set(node, { clearProps: 'transform,transformOrigin,clipPath' });
        gsap.set(face, { clearProps: 'transform,transformOrigin' });
        delete node.dataset.buddyMotion;
      },
    })
      // Animate translation and clipping together: the lower screen edge
      // stays stationary, so Remy never slides across the message input.
      .to(node, {
        y: y + origin.height + 6,
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
