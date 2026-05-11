'use client';

import { CSSProperties, useEffect, useRef } from 'react';
import styles from './landing.module.css';

// Curated trio rule for the row: at most one Döner and at most one Pizza,
// and no two Döner-style cards adjacent. The two slots that used to hold
// Slice Society (Tomate slice = 2nd pizza) and Bursa (2nd Döner) now hold
// Crapulix Croissant and Jones Cookies for visual range.
const CARDS = [
  'https://cdn.sanity.io/images/ehwjnjr2/production/e74cc8257c7d0d37075e024274bd3a447ce8a6da-1449x2163.png', // Banh Mi
  'https://cdn.sanity.io/images/ehwjnjr2/production/70e13f906df3aa37dd062fc6d83034ded924b1ae-1449x2163.png', // Spicy Thai Sausage
  'https://cdn.sanity.io/images/ehwjnjr2/production/7d58817e5ac7298642bdc2816944e5f64468e713-1449x2163.png', // Pizza Gemello
  'https://cdn.sanity.io/images/ehwjnjr2/production/b4d268a43fe8bf62708f6da1c36de049a17c225a-1449x2163.png', // Croissant (was 2nd pizza)
  'https://cdn.sanity.io/images/ehwjnjr2/production/b1a2aafdff07349d224a15a7b298af783db48271-1449x2163.png', // Sabich
  'https://cdn.sanity.io/images/ehwjnjr2/production/de27d072ad8d240ed1361d00b22b60525378375b-1449x2163.png', // Döner Hasir (only Döner)
  'https://cdn.sanity.io/images/ehwjnjr2/production/494772a7295c0d38fc0400f026b3902cd32b0373-1449x2163.png', // Cookies (was 2nd Döner)
  'https://cdn.sanity.io/images/ehwjnjr2/production/eb92a901eb444f36cb17f4ad7667c69f4227421a-1449x2163.png', // Babka
  'https://cdn.sanity.io/images/ehwjnjr2/production/f56c68c3f207f5a62a85ad6dfd2db1eed95c2188-1449x2163.png', // Single Burger
];

const SLOTS_DESKTOP = [-680, -510, -340, -170, 0, 170, 340, 510, 680];

const MOBILE_LAYOUT: { idx: number; row: 0 | 1; slot: number }[] = [
  { idx: 0, row: 0, slot: -120 },
  { idx: 2, row: 0, slot:    0 },
  { idx: 4, row: 0, slot:  120 },
  { idx: 5, row: 1, slot: -120 },
  { idx: 7, row: 1, slot:    0 },
  { idx: 8, row: 1, slot:  120 },
];

const REST_ROT = [-5, 3, -3, 4, 0, -2, 5, -4, 3];

export default function FanCards() {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const cards = Array.from(
      stage.querySelectorAll<HTMLDivElement>(`.${styles.rowCard}`)
    );

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

    let lastP = -1;
    let rafPending = false;

    // easeOutCubic - eased per-card progress masks scroll-tick jitter by
    // having the card decelerate as it approaches its rest position.
    // With linear interpolation the same scroll-pixel delta produced a
    // constant transform delta, which read as choppy whenever the
    // browser delivered uneven scroll events (common on trackpads and
    // 90 Hz mobile screens).
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    function compute() {
      rafPending = false;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const elemCenter = rect.top + rect.height / 2;
      // Section enters at 95% viewport height, fully revealed at 42% (just
      // above the page centre). Scrolling back up reverses p toward 0 so
      // the cards slide back out the way they came.
      const startY = vh * 0.95;
      const endY = vh * 0.42;
      const p = Math.max(0, Math.min(1, (startY - elemCenter) / (startY - endY)));
      // Finer early-exit: 0.003 was coarse enough that scroll-tick
      // updates skipped intermediate frames, making the cards appear to
      // step rather than glide. 0.001 keeps the work cheap while letting
      // every meaningful scroll tick produce a fresh transform.
      if (Math.abs(p - lastP) < 0.001) return;
      lastP = p;

      const isDesktop = vw >= 768;
      cards.forEach((card, idx) => {
        const startX = parseFloat(card.dataset.startX || '0');
        const finalXD = parseFloat(card.dataset.finalXd || '0');
        const finalXM = parseFloat(card.dataset.finalXm || '0');
        const restRot = parseFloat(card.dataset.restRot || '0');
        const onMobile = card.dataset.mobileShow === 'yes';
        if (!isDesktop && !onMobile) {
          card.style.display = 'none';
          return;
        }
        card.style.display = '';
        // Each card gets its own staggered local progress. Card 0 starts
        // animating immediately; the last card kicks in when global p
        // has reached ~0.35. So the cards land one-by-one rather than as
        // a synchronised group. Eased so the visual motion decelerates
        // toward the rest position instead of stepping linearly.
        const stagger = idx * 0.05;
        const linearP = Math.max(0, Math.min(1, (p - stagger) / (1 - stagger)));
        const cardP = easeOutCubic(linearP);
        const finalX = isDesktop ? finalXD : finalXM;
        const x = startX + (finalX - startX) * cardP;
        const rot = restRot * cardP;
        const scale = 0.85 + 0.15 * cardP;
        // translate3d nudges browsers to keep the card on its own
        // compositor layer alongside `will-change: transform`, which
        // helps especially on iOS Safari where layer promotion is
        // sometimes dropped between scroll bursts.
        card.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      });
    }

    function schedule() {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(compute);
    }

    const scrollAncestors = getScrollAncestors(stage);
    schedule();
    scrollAncestors.forEach((s) =>
      s.addEventListener('scroll', schedule, { passive: true })
    );
    window.addEventListener('resize', schedule, { passive: true });
    return () => {
      scrollAncestors.forEach((s) =>
        s.removeEventListener('scroll', schedule)
      );
      window.removeEventListener('resize', schedule);
    };
  }, []);

  const zIndex = [1, 2, 3, 4, 9, 4, 3, 2, 1];

  return (
    <section className={styles.fanWrap}>
      <div className={styles.fanStage} ref={stageRef}>
        {CARDS.map((src, i) => {
          const fromLeft = i < 5;
          const mobileInfo = MOBILE_LAYOUT.find((m) => m.idx === i);
          const onMobile = Boolean(mobileInfo);
          const style: CSSProperties = {
            zIndex: zIndex[i] ?? 1,
            // CSS var for two-row mobile vertical offset.
            ['--row-m' as string]: onMobile ? String(mobileInfo!.row) : '0',
          };
          return (
            <div
              key={i}
              className={styles.rowCard}
              data-mobile-show={onMobile ? 'yes' : 'no'}
              data-mobile-row={onMobile ? mobileInfo!.row : ''}
              data-start-x={fromLeft ? '-1500' : '1500'}
              data-final-xd={String(SLOTS_DESKTOP[i])}
              data-final-xm={onMobile ? String(mobileInfo!.slot) : '0'}
              data-rest-rot={String(REST_ROT[i])}
              style={style}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" decoding="async" />
            </div>
          );
        })}
      </div>
    </section>
  );
}
