'use client';

import { useEffect, useRef } from 'react';
import styles from './landing.module.css';
import { useTranslation } from '@/lib/i18n';

const CARDS = [
  'https://cdn.sanity.io/images/ehwjnjr2/production/e74cc8257c7d0d37075e024274bd3a447ce8a6da-1449x2163.png',
  'https://cdn.sanity.io/images/ehwjnjr2/production/70e13f906df3aa37dd062fc6d83034ded924b1ae-1449x2163.png',
  'https://cdn.sanity.io/images/ehwjnjr2/production/7d58817e5ac7298642bdc2816944e5f64468e713-1449x2163.png',
];

// Same scroll-ancestor traversal as FanCards — proven to work in this SPA.
function getScrollAncestors(el: HTMLElement | null): (HTMLElement | Window)[] {
  const out: (HTMLElement | Window)[] = [];
  let node = el?.parentElement;
  while (node) {
    const o = getComputedStyle(node).overflowY;
    if (o === 'auto' || o === 'scroll') out.push(node);
    node = node.parentElement;
  }
  out.push(window);
  return out;
}

export default function Selection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section: HTMLElement | null = sectionRef.current;
    if (!section) return;
    // Narrow to a strictly-typed const so nested function declarations below
    // (compute / schedule / onResize) keep the non-null type without needing
    // assertions or arrow-function rewrites.
    const sec: HTMLElement = section;

    const cardEls = Array.from(sec.querySelectorAll<HTMLElement>('[data-sel-card]'));
    if (cardEls.length === 0) return;

    // Per-card offset = distance from card's natural left edge to viewport right
    // edge. Each card therefore starts exactly at the screen's right boundary.
    let offsets: number[] = [];
    let raf: ReturnType<typeof requestAnimationFrame> | null = null;
    let lastP = -1;

    function measureOffsets() {
      offsets = cardEls.map(card => {
        const prev = card.style.transform;
        card.style.transform = 'translateX(0)';
        const rect = card.getBoundingClientRect();
        card.style.transform = prev;
        // +24px buffer so the card is fully off-screen at p=0
        return Math.max(120, window.innerWidth - rect.left + 24);
      });
    }

    function compute() {
      raf = null;
      const rect = sec.getBoundingClientRect();
      const vh = window.innerHeight;
      const sectionCenter = rect.top + rect.height / 2;

      // Animation runs only while the section sits in the CENTRAL viewport band:
      // starts when section center reaches 80% (lower-middle), ends at 20%
      // (upper-middle). Wider range = more scroll required = slower animation.
      const startY = vh * 0.8;
      const endY = vh * 0.2;
      const p = Math.max(0, Math.min(1, (startY - sectionCenter) / (startY - endY)));

      if (Math.abs(p - lastP) < 0.002) return;
      lastP = p;

      // Card 0 reveals first (rightmost in the row to feel "from right edge"),
      // then card 1, then card 2. NO overlap between cards.
      const N = cardEls.length;
      const slice = 1 / N; // 0.333 per card

      cardEls.forEach((card, i) => {
        // First card (DOM index 0) lands at the leftmost slot — so it must
        // travel the furthest and start animating first. Index N-1 lands
        // rightmost (shortest path) and is the last to appear.
        const cardStart = i * slice;
        const cardEnd = cardStart + slice;
        const local = Math.max(0, Math.min(1, (p - cardStart) / (cardEnd - cardStart)));

        // Ease-out cubic on the per-card progress for a smooth landing.
        const eased = 1 - Math.pow(1 - local, 3);
        const x = (1 - eased) * offsets[i];

        card.style.transform = `translateX(${x.toFixed(1)}px)`;
        // No opacity fade — cards are always opaque, the clip wrapper hides them.
        // This removes the "halo / sudden appearance" feel.
        card.style.opacity = '1';
      });
    }

    function schedule() {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    }

    function onResize() {
      measureOffsets();
      lastP = -1;
      schedule();
    }

    measureOffsets();
    compute();

    const ancestors = getScrollAncestors(sec);
    ancestors.forEach(a => a.addEventListener('scroll', schedule, { passive: true }));
    const appPage = document.querySelector<HTMLElement>('.app-page[data-page="start"]');
    if (appPage && !ancestors.includes(appPage)) {
      appPage.addEventListener('scroll', schedule, { passive: true });
    }
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      ancestors.forEach(a => a.removeEventListener('scroll', schedule));
      if (appPage && !ancestors.includes(appPage)) {
        appPage.removeEventListener('scroll', schedule);
      }
      window.removeEventListener('resize', onResize);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.selection}>
      <div className={styles.selectionText}>
        <span className={styles.secLabel}>{t('landing.selectionEyebrow')}</span>
        <h2 className={styles.selectionHeadline}>{t('landing.selectionHeadline')}</h2>
        <p className={styles.selectionBody}>
          {t('landing.selectionBody')}
        </p>
      </div>
      <div className={styles.selectionCardsClip}>
        <div className={styles.selectionCards}>
          {CARDS.map((src, i) => (
            <div
              key={i}
              className={styles.selectionCard}
              data-sel-card
              style={{
                // Initial off-screen state — overridden by useEffect's first compute().
                // Opacity stays 1: clip wrapper hides off-screen cards visually.
                transform: 'translateX(2000px)',
                opacity: '1',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
