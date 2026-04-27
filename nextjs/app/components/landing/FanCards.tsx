'use client';

import { useEffect, useRef } from 'react';
import styles from './landing.module.css';

const CARD_IMAGES = [
  'https://cdn.sanity.io/images/ehwjnjr2/production/e74cc8257c7d0d37075e024274bd3a447ce8a6da-1449x2163.png',
  'https://cdn.sanity.io/images/ehwjnjr2/production/70e13f906df3aa37dd062fc6d83034ded924b1ae-1449x2163.png',
  'https://cdn.sanity.io/images/ehwjnjr2/production/7d58817e5ac7298642bdc2816944e5f64468e713-1449x2163.png',
  'https://cdn.sanity.io/images/ehwjnjr2/production/b1a2aafdff07349d224a15a7b298af783db48271-1449x2163.png',
  'https://cdn.sanity.io/images/ehwjnjr2/production/de27d072ad8d240ed1361d00b22b60525378375b-1449x2163.png',
];

const ROTS_MOBILE = [-16, -8, 0, 8, 16];
const ROTS_DESKTOP = [-36, -18, 0, 18, 36];

// Rotation tied directly to element position in viewport: opening when scrolling down,
// closing when scrolling up, smoothed by a CSS transition on the cards.
export default function FanCards() {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const cards = Array.from(
      stage.querySelectorAll<HTMLDivElement>(`.${styles.fanCard}`)
    );

    // SPA layout has multiple auto-overflow ancestors (.app-page, .app-pages,
    // body, html). Which one actually scrolls depends on viewport size and
    // content length. Attach to all candidates instead of guessing.
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

    function update() {
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const vh = window.innerHeight;
      const elemCenter = rect.top + rect.height / 2;
      const startY = vh * 0.75;
      const endY = vh * 0.45;
      const p = Math.max(0, Math.min(1, (startY - elemCenter) / (startY - endY)));
      const rots = window.innerWidth >= 768 ? ROTS_DESKTOP : ROTS_MOBILE;
      cards.forEach((card, i) => {
        const r = rots[i] ?? 0;
        card.style.transform = `rotate(${(r * p).toFixed(2)}deg)`;
      });
    }

    const scrollAncestors = getScrollAncestors(stage);
    update();
    scrollAncestors.forEach((s) =>
      s.addEventListener('scroll', update, { passive: true })
    );
    window.addEventListener('resize', update, { passive: true });
    return () => {
      scrollAncestors.forEach((s) =>
        s.removeEventListener('scroll', update)
      );
      window.removeEventListener('resize', update);
    };
  }, []);

  const fcClasses = [styles.fc1, styles.fc2, styles.fc3, styles.fc4, styles.fc5];

  return (
    <section className={styles.fanWrap}>
      <div className={styles.fanStage} ref={stageRef}>
        {CARD_IMAGES.map((src, i) => (
          <div key={i} className={`${styles.fanCard} ${fcClasses[i]}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" loading="lazy" decoding="async" />
          </div>
        ))}
      </div>
    </section>
  );
}
