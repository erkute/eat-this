'use client';

import { CSSProperties, useEffect, useRef } from 'react';
import styles from './landing.module.css';

// Curated trio rule for the row: at most one Döner and at most one Pizza,
// and no two Döner-style cards adjacent. The two slots that used to hold
// Slice Society (Tomate slice = 2nd pizza) and Bursa (2nd Döner) now hold
// Crapulix Croissant and Jones Cookies for visual range.
//
// URLs are the bare Sanity CDN entries — raw 1449x2163 PNGs (~1-2 MB each).
// We pipe them through Sanity's CDN image params at render time:
//   ?w=<n>&auto=format&q=72
// auto=format → WebP/AVIF to capable browsers, fallback otherwise.
// Three srcset widths cover all DPR/viewport combos (display is 112px on
// mobile, 168px on desktop; DPR 2-3 → 240/360/520 lands every bucket).
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

const SLOTS_DESKTOP = [-760, -570, -380, -190, 0, 190, 380, 570, 760];

const MOBILE_LAYOUT: { idx: number; row: 0 | 1; slot: number }[] = [
  { idx: 0, row: 0, slot: -120 },
  { idx: 2, row: 0, slot:    0 },
  { idx: 4, row: 0, slot:  120 },
  { idx: 5, row: 1, slot: -120 },
  { idx: 7, row: 1, slot:    0 },
  { idx: 8, row: 1, slot:  120 },
];

const REST_ROT = [-5, 3, -3, 4, 0, -2, 1, -4, 3];

// Stacking order in the fan. Symmetric — centre card (idx 4) sits in
// front, outer cards behind, gives the row depth without overlap weight.
const Z_INDEX = [1, 2, 3, 4, 9, 4, 3, 2, 1];

// Scroll-driven entry parameters. All `*_VH` values are read as a
// fraction of viewport height applied to the section's centre y.
const START_OFFSET_PX = 1500;        // distance off-screen at p=0
const ENTRY_TRIGGER_START_VH = 1.4;  // entry begins when centerY ≥ this
const ENTRY_TRIGGER_END_VH = 0.5;    // entry completes when centerY ≤ this
const ENTRY_STAGGER = 0.04;          // per-card delay as fraction of [0..1]
// IO rootMargin extends the trigger root 1 viewport above + below so the
// RAF loop starts before the section enters view and stops shortly after
// it leaves — bounded battery cost on idle pages.
const IO_ROOT_MARGIN = '100% 0% 100% 0%';

export default function FanCards() {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const cards = Array.from(
      stage.querySelectorAll<HTMLDivElement>(`.${styles.rowCard}`)
    );

    // Per-card static data — derived once at mount. Cards fly in via X
    // translate from ±START_OFFSET_PX to their fan-slot finalX, with a
    // synchronised rotate from 0 → restRot. No opacity is touched (see
    // CLAUDE.md "Animation — no opacity fades").
    const cardData = CARDS.map((_, i) => {
      const mobileInfo = MOBILE_LAYOUT.find((m) => m.idx === i);
      return {
        startX: i < 5 ? -START_OFFSET_PX : START_OFFSET_PX,
        finalXD: SLOTS_DESKTOP[i] ?? 0,
        finalXM: mobileInfo ? mobileInfo.slot : 0,
        restRot: REST_ROT[i] ?? 0,
        onMobile: Boolean(mobileInfo),
      };
    });

    let isDesktop = window.innerWidth >= 768;
    let lastP = -1;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    function compute() {
      // Re-narrow inside the closure — TS doesn't propagate the outer
      // null-check past nested function boundaries.
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const vh = window.innerHeight;
      const centerY = rect.top + rect.height / 2;
      // Global entry progress p ∈ [0, 1]. Section centre crossing the
      // trigger window maps linearly to p.
      const startY = vh * ENTRY_TRIGGER_START_VH;
      const endY = vh * ENTRY_TRIGGER_END_VH;
      const p = Math.max(0, Math.min(1, (startY - centerY) / (startY - endY)));
      if (Math.abs(p - lastP) < 0.001) return;
      lastP = p;

      // Per-card progress: each card waits `idx * ENTRY_STAGGER` of the
      // global p before its own [0..1] window starts. All land at p=1.
      for (let idx = 0; idx < cards.length; idx++) {
        const data = cardData[idx];
        if (!isDesktop && !data.onMobile) continue;
        const stagger = idx * ENTRY_STAGGER;
        const linearP = Math.max(0, Math.min(1, (p - stagger) / (1 - stagger)));
        const cardP = easeOutCubic(linearP);
        const finalX = isDesktop ? data.finalXD : data.finalXM;
        const x = data.startX + (finalX - data.startX) * cardP;
        const rot = data.restRot * cardP;
        cards[idx].style.transform = `translate3d(${x.toFixed(1)}px, 0, 0) rotate(${rot.toFixed(2)}deg)`;
      }
    }

    // Position cards once at mount so they're at startX (off-screen) on
    // the first paint, not stacked at the CSS-default centre.
    compute();

    // Continuous RAF while the section is near the viewport — smooth at
    // any scroll cadence (iOS inertial flicks throttle scroll events, so
    // a scroll-listener-driven version would visibly hitch).
    let rafId = 0;
    let running = false;
    function frame() {
      compute();
      rafId = requestAnimationFrame(frame);
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true;
          frame();
        } else if (!entry.isIntersecting && running) {
          running = false;
          cancelAnimationFrame(rafId);
          lastP = -1;
        }
      },
      { rootMargin: IO_ROOT_MARGIN }
    );
    io.observe(stage);

    function handleResize() {
      isDesktop = window.innerWidth >= 768;
      lastP = -1;
    }
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      io.disconnect();
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <section className={styles.fanWrap}>
      <div className={styles.fanStage} ref={stageRef}>
        {CARDS.map((src, i) => {
          const mobileInfo = MOBILE_LAYOUT.find((m) => m.idx === i);
          const onMobile = Boolean(mobileInfo);
          const style: CSSProperties = {
            zIndex: Z_INDEX[i] ?? 1,
            // CSS var for two-row mobile vertical offset.
            ['--row-m' as string]: onMobile ? String(mobileInfo!.row) : '0',
          };
          return (
            <div
              key={i}
              className={styles.rowCard}
              data-mobile-show={onMobile ? 'yes' : 'no'}
              style={style}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${src}?w=520&auto=format&q=72`}
                srcSet={`${src}?w=240&auto=format&q=72 240w, ${src}?w=360&auto=format&q=72 360w, ${src}?w=520&auto=format&q=72 520w`}
                sizes="(max-width: 767px) 112px, 168px"
                alt=""
                loading="lazy"
                decoding="async"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
