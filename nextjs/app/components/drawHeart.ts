import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

gsap.registerPlugin(DrawSVGPlugin);

const TRACE_S = 0.32;
const SCRIBBLE_S = 0.3;
const ERASE_S = 0.18;

/** Loaded only for a reader's own tap. Revert inline styles to the rendered state. */
export function drawHeart(root: HTMLSpanElement, hearted: boolean): () => void {
  const context = gsap.context(() => {
    const q = gsap.utils.selector(root);
    const pen = q('[data-pen]');
    const scribble = q('[data-scribble]');
    const fill = q('[data-fill]');
    const tl = gsap.timeline();
    if (hearted) {
      tl.set(fill, { visibility: 'hidden' })
        .set([pen, scribble], { visibility: 'visible', drawSVG: '0%' })
        .to(pen, { drawSVG: '100%', duration: TRACE_S, ease: 'power1.inOut' })
        .to(scribble, { drawSVG: '100%', duration: SCRIBBLE_S, ease: 'power1.in' }, '-=0.08')
        .set(fill, { visibility: 'visible' })
        .to(root, { scale: 1.12, duration: 0.09, ease: 'power2.out' }, '-=0.04')
        .to(root, { scale: 1, duration: 0.24, ease: 'back.out(3)' });
    } else {
      tl.set(fill, { visibility: 'hidden' })
        .set([pen, scribble], { visibility: 'visible', drawSVG: '100%' })
        .to(scribble, { drawSVG: '0% 0%', duration: ERASE_S, ease: 'power2.out' })
        .to(pen, { drawSVG: '100% 100%', duration: ERASE_S, ease: 'power2.out' }, '<')
        .set([pen, scribble], { visibility: 'hidden' });
    }
    return () => tl.kill();
  }, root);
  return () => context.revert();
}
