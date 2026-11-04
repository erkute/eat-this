'use client';

import { useEffect, useRef, useState } from 'react';
import { appScroller } from '@/lib/dom/appScroller';
import styles from './FoldedPaperBackdrop.module.css';

/** `height` is the image height in vw. Mirrored tiles repeat at twice that. */
const FULL = { href: '/pics/paper/folded-white.webp?v=20261028-hq', height: 150 };
/** Same paper, 1200 px wide: phones show no more than that. */
const PHONE = { href: '/pics/paper/folded-white-phone.webp?v=20261104', height: 150 };
/** The upper 60 %: footers on larger screens are shorter than that. */
const WIDE = { href: '/pics/paper/folded-white-wide.webp?v=20261104', height: 90 };
const PHONE_MAX_DEVICE_PX = 1300;

/** The parent provides position:relative and isolation:isolate. Colour layers
 * sit above this paper; mirrored edges keep the creases continuous at any height.
 * With `lazy`, for footers: an SVG image has no native lazy loading, so the paper
 * mounts shortly before it scrolls into view, in the size this screen needs. */
export default function FoldedPaperBackdrop({ id, lazy = false }: { id: string; lazy?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  const [paper, setPaper] = useState(lazy ? null : FULL);

  useEffect(() => {
    const element = ref.current;
    if (paper || !element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        const devicePx = window.innerWidth * window.devicePixelRatio;
        setPaper(devicePx <= PHONE_MAX_DEVICE_PX ? PHONE : WIDE);
      },
      { root: appScroller(), rootMargin: '150% 0px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [paper]);

  return (
    <svg ref={ref} className={styles.paper} aria-hidden="true" focusable="false" data-folded-paper="">
      {paper && (
        <>
          <defs>
            <pattern id={id} width="100%" height={`${paper.height * 2}vw`} patternUnits="userSpaceOnUse">
              <image href={paper.href} width="100%" height={`${paper.height}vw`} preserveAspectRatio="none" />
              <image
                href={paper.href}
                y={`-${paper.height * 2}vw`}
                width="100%"
                height={`${paper.height}vw`}
                transform="scale(1 -1)"
                preserveAspectRatio="none"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id})`} />
        </>
      )}
    </svg>
  );
}
