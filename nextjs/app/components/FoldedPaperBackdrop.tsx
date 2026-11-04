'use client';

import { useEffect, useRef, useState } from 'react';
import { appScroller } from '@/lib/dom/appScroller';
import styles from './FoldedPaperBackdrop.module.css';

const FULL = '/pics/paper/folded-white.webp?v=20261028-hq';
/** Same paper, 1200 px wide: phones show no more than that. */
const PHONE = '/pics/paper/folded-white-phone.webp?v=20261104';

/** The parent provides position:relative and isolation:isolate. Colour layers
 * sit above this paper; mirrored edges keep the creases continuous at any height.
 * With `lazy`, for the surfaces above a footer: phones only (larger screens use
 * PaperPhoto). An SVG image has no native lazy loading, so the paper mounts
 * shortly before it scrolls into view. */
export default function FoldedPaperBackdrop({ id, lazy = false }: { id: string; lazy?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  const [paper, setPaper] = useState(lazy ? null : FULL);

  useEffect(() => {
    const element = ref.current;
    if (paper || !element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setPaper(PHONE);
      },
      { root: appScroller(), rootMargin: '150% 0px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [paper]);

  return (
    <svg
      ref={ref}
      className={`${styles.paper} ${lazy ? styles.phoneOnly : ''}`}
      aria-hidden="true"
      focusable="false"
      data-folded-paper=""
    >
      {paper && (
        <>
          <defs>
            <pattern id={id} width="100%" height="300vw" patternUnits="userSpaceOnUse">
              <image href={paper} width="100%" height="150vw" preserveAspectRatio="none" />
              <image href={paper} y="-300vw" width="100%" height="150vw" transform="scale(1 -1)" preserveAspectRatio="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id})`} />
        </>
      )}
    </svg>
  );
}
