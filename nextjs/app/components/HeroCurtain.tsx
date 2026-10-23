'use client';

import { useEffect } from 'react';
import styles from './HeroCurtain.module.css';

export default function HeroCurtain() {
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const finish = () => {
      if (reduced.matches) document.documentElement.removeAttribute('data-hero-intro');
    };
    finish();
    reduced.addEventListener('change', finish);
    return () => reduced.removeEventListener('change', finish);
  }, []);

  return (
    <>
      <link rel="preload" as="image" href="/pics/home/elevator-left.webp" />
      <link rel="preload" as="image" href="/pics/home/elevator-right.webp" />
      <div className={styles.scene} data-hero-curtain="" aria-hidden="true">
        <div className={`${styles.door} ${styles.left}`} />
        <div className={`${styles.door} ${styles.right}`} />
      </div>
    </>
  );
}
