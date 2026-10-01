'use client';

import { Children, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import gsap from 'gsap';
import { appScroller } from '@/lib/dom/appScroller';
import { armSideDrag } from '@/lib/home/sideDrag';
import styles from './HomeGallery.module.css';

interface Props {
  children: ReactNode;
  label: string;
  footer?: ReactNode;
  heading?: ReactNode;
}

/** The stage's pin line in px. `--gallery-top` computes to `calc(64px + 0px)`,
 *  which `parseFloat` reads as NaN — `scroll-margin-top` (CSS) carries it as
 *  a resolved length instead, as on the Must-Eat runway. */
function pinLine(root: HTMLElement): number {
  return parseFloat(getComputedStyle(root).scrollMarginTop) || 0;
}

/** The page scroll is the only timeline. Native scroll animations keep the
 * phone's gallery in step with its compositor; GSAP supplies the same numeric
 * position in browsers without scroll timelines. Nothing holds the page's
 * wheel or vertical touch; a sideways finger drag only moves that same
 * scroll (lib/home/sideDrag.ts). */
export default function HomeGallery({
  children,
  label,
  footer,
  heading,
}: Props) {
  const items = Children.toArray(children);
  const rootRef = useRef<HTMLDivElement>(null);
  const count = items.length;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || count < 2) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    const native =
      CSS.supports('animation-timeline: view()') &&
      CSS.supports('animation-range: contain 0% contain 100%');
    const setPosition = gsap.quickSetter(root, '--gallery-position');
    const stage = root.firstElementChild as HTMLElement;
    // A scene is exactly as tall as its cards and actions, not a full empty
    // viewport. Re-measure after image/font loading and responsive changes.
    const measure = () => {
      const height = stage.offsetHeight;
      if (height > 0) root.style.setProperty('--gallery-height', `${height}px`);
    };
    let frame = 0;
    let removeFallback = () => {};
    let removeDrag = () => {};
    /** Where the band stands, for a sideways drag: card 0 sits at the pin
     *  line, every further card one equal share of the runway below. */
    const dragGeometry = () => {
      const scroller = appScroller();
      const pin = (scroller?.getBoundingClientRect().top ?? 0) + pinLine(root);
      const slide = root.querySelector<HTMLElement>('[data-gallery-slide]');
      if (!slide) return null;
      return {
        start: root.getBoundingClientRect().top - pin,
        step: (root.offsetHeight - stage.offsetHeight) / (count - 1),
        count,
        // A card moves one width (plus a narrow gap) per step.
        finger: slide.offsetWidth,
      };
    };

    const draw = () => {
      frame = 0;
      const scroller = appScroller();
      const top = (scroller?.getBoundingClientRect().top ?? 0) + pinLine(root);
      const travel = root.offsetHeight - stage.offsetHeight;
      const progress =
        travel > 0
          ? Math.max(0, Math.min(1, (top - root.getBoundingClientRect().top) / travel))
          : 0;
      setPosition(progress * (count - 1));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const configure = () => {
      removeFallback();
      removeDrag();
      removeDrag = () => {};
      cancelAnimationFrame(frame);
      frame = 0;
      root.style.removeProperty('--gallery-position');
      root.style.removeProperty('--gallery-height');
      if (calm.matches) {
        root.removeAttribute('data-motion');
        return;
      }
      root.setAttribute('data-motion', native ? 'native' : 'gsap');
      measure();
      removeDrag = armSideDrag(stage, dragGeometry);
      if (native) return;
      // Both scroll sources: the app changes its scroller at 768px.
      const container = document.querySelector<HTMLElement>('.app-pages');
      window.addEventListener('scroll', schedule, { passive: true });
      container?.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      const resize = new ResizeObserver(schedule);
      resize.observe(root);
      draw();
      removeFallback = () => {
        window.removeEventListener('scroll', schedule);
        container?.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        resize.disconnect();
      };
    };
    const stageResize = new ResizeObserver(() => {
      if (calm.matches) return;
      measure();
      if (!native) schedule();
    });
    stageResize.observe(stage);
    configure();
    calm.addEventListener('change', configure);
    return () => {
      removeFallback();
      removeDrag();
      stageResize.disconnect();
      cancelAnimationFrame(frame);
      calm.removeEventListener('change', configure);
      root.removeAttribute('data-motion');
      root.style.removeProperty('--gallery-position');
      root.style.removeProperty('--gallery-height');
    };
  }, [count]);

  if (!count) return null;

  return (
    <div
      ref={rootRef}
      className={styles.gallery}
      style={{ '--gallery-count': count } as CSSProperties}
      data-home-gallery=""
    >
      <div className={styles.stage} data-home-pointer="">
        {heading && <div className={styles.heading}>{heading}</div>}
        <ul className={styles.rail} aria-label={label} role="list">
          {items.map((item, index) => (
            <li
              className={styles.slide}
              data-gallery-slide=""
              key={typeof item === 'object' && item !== null && 'key' in item ? item.key : index}
              style={{ '--gallery-index': index } as CSSProperties}
              onFocusCapture={() => {
                const root = rootRef.current;
                if (!root?.hasAttribute('data-motion')) return;
                // Tab navigation also brings offstage links into view. A tap
                // on an already visible card never moves the page.
                if (!root.querySelector(':focus-visible')) return;
                const scroller = appScroller();
                const stage = root.firstElementChild as HTMLElement;
                const start =
                  root.getBoundingClientRect().top -
                  (scroller?.getBoundingClientRect().top ?? 0) -
                  pinLine(root);
                const travel = root.offsetHeight - stage.offsetHeight;
                const delta = start + (travel * index) / Math.max(1, count - 1);
                if (scroller) scroller.scrollTop += delta;
                else window.scrollTo({ top: window.scrollY + delta, behavior: 'instant' });
              }}
            >
              <div className={styles.face}>{item}</div>
            </li>
          ))}
        </ul>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
