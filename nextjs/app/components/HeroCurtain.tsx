'use client';

import { useEffect, useRef } from 'react';
import styles from './HeroCurtain.module.css';

export default function HeroCurtain() {
  const scene = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const html = document.documentElement;
    if (!html.hasAttribute('data-hero-intro')) return;
    let cancelled = false;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const finish = () => { if (!cancelled) html.removeAttribute('data-hero-intro'); };
    const motionChanged = () => { if (reduced.matches) finish(); };
    if (reduced.matches) finish();
    else Promise.all((scene.current?.getAnimations() ?? []).map(animation => animation.finished)).then(finish).catch(() => {});
    reduced.addEventListener('change', motionChanged);
    return () => {
      cancelled = true;
      reduced.removeEventListener('change', motionChanged);
    };
  }, []);
  return (
    <>
      <link rel="preload" as="image" href="/pics/home/elevator-left.webp" />
      <link rel="preload" as="image" href="/pics/home/elevator-right.webp" />
      <div ref={scene} className={styles.scene} data-hero-curtain="" aria-hidden="true">
        <div className={`${styles.door} ${styles.left}`} />
        <div className={`${styles.door} ${styles.right}`} />
      </div>
    </>
  );
}
