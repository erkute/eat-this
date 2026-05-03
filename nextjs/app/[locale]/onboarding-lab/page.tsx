'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import styles from './lab.module.css';

const SAMPLE_CARDS = [
  'https://cdn.sanity.io/images/ehwjnjr2/production/e74cc8257c7d0d37075e024274bd3a447ce8a6da-1449x2163.png?w=600&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/a12687e545c871243fe9e7648e1d649d03fe4a8a-1449x2163.png?w=600&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/f56c68c3f207f5a62a85ad6dfd2db1eed95c2188-1449x2163.png?w=600&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/e74cc8257c7d0d37075e024274bd3a447ce8a6da-1449x2163.png?w=600&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/a12687e545c871243fe9e7648e1d649d03fe4a8a-1449x2163.png?w=600&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/f56c68c3f207f5a62a85ad6dfd2db1eed95c2188-1449x2163.png?w=600&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/e74cc8257c7d0d37075e024274bd3a447ce8a6da-1449x2163.png?w=600&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/a12687e545c871243fe9e7648e1d649d03fe4a8a-1449x2163.png?w=600&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/f56c68c3f207f5a62a85ad6dfd2db1eed95c2188-1449x2163.png?w=600&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/e74cc8257c7d0d37075e024274bd3a447ce8a6da-1449x2163.png?w=600&auto=format&q=80',
];

const CARDS_PER_ROW = 3;
const ROW_GAP_PX = 12;
const GRID_MARGIN_PCT = 6;

const SPARKLE_COUNT = 28;
const SMOKE_COUNT   = 8;
const DEBRIS_COUNT  = 14;

type Phase = 'idle' | 'zoom' | 'shatter' | 'reveal';

const FRAG_COLS = 4;
const FRAG_ROWS = 4;

function seedRand(seed: number, i: number, salt: number): number {
  let t = ((seed + 1) * 1000003 + i * 337 + salt * 7 + 0x6D2B79F5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function jaggedClip(
  x0: number, y0: number, x1: number, y1: number,
  seed: number, fragId: number,
  segs: number = 4, jitter: number = 1.6,
): string {
  const cellW = x1 - x0;
  const cellH = y1 - y0;
  const isLeftEdge   = x0 <= 0.01;
  const isRightEdge  = x1 >= 99.99;
  const isTopEdge    = y0 <= 0.01;
  const isBottomEdge = y1 >= 99.99;

  const pts: string[] = [];
  // Top edge (left → right). Points overlap UPWARD (toward top neighbor).
  for (let s = 0; s <= segs; s++) {
    const x = x0 + cellW * (s / segs);
    const isCorner = s === 0 || s === segs;
    const yOff = isCorner ? 0 : (isTopEdge ? 0 : -seedRand(seed, fragId, 100 + s) * jitter);
    pts.push(`${x.toFixed(2)}% ${(y0 + yOff).toFixed(2)}%`);
  }
  // Right edge (top → bottom). Points overlap RIGHTWARD.
  for (let s = 1; s <= segs; s++) {
    const y = y0 + cellH * (s / segs);
    const isCorner = s === segs;
    const xOff = isCorner ? 0 : (isRightEdge ? 0 : seedRand(seed, fragId, 200 + s) * jitter);
    pts.push(`${(x1 + xOff).toFixed(2)}% ${y.toFixed(2)}%`);
  }
  // Bottom edge (right → left). Points overlap DOWNWARD.
  for (let s = 1; s <= segs; s++) {
    const x = x1 - cellW * (s / segs);
    const isCorner = s === segs;
    const yOff = isCorner ? 0 : (isBottomEdge ? 0 : seedRand(seed, fragId, 300 + s) * jitter);
    pts.push(`${x.toFixed(2)}% ${(y1 + yOff).toFixed(2)}%`);
  }
  // Left edge (bottom → top). Points overlap LEFTWARD.
  for (let s = 1; s < segs; s++) {
    const y = y1 - cellH * (s / segs);
    const xOff = isLeftEdge ? 0 : -seedRand(seed, fragId, 400 + s) * jitter;
    pts.push(`${(x0 + xOff).toFixed(2)}% ${y.toFixed(2)}%`);
  }
  return `polygon(${pts.join(', ')})`;
}

interface Tweaks {
  packWidthPct:    number;
  cardScale:       number;
  packTopPct:      number;
  rowYPct:         number;
  cardSpacing:     number;
  burstScalePct:   number;
  glowScalePct:    number;
  sparkleDistance: number;
  stiffness:       number;
  damping:         number;
  mass:            number;
}

const DEFAULT_TWEAKS: Tweaks = {
  packWidthPct:    60,
  cardScale:       1,
  packTopPct:      18,
  rowYPct:         50,
  cardSpacing:     10,
  burstScalePct:   160,
  glowScalePct:    140,
  sparkleDistance: 220,
  stiffness:       180,
  damping:         22,
  mass:            1.1,
};

const STORAGE_KEY = 'onboarding-lab-tweaks-v10';

const SLIDER_GROUPS: ReadonlyArray<{
  title: string;
  defs:  ReadonlyArray<readonly [keyof Tweaks, number, number, number, string]>;
}> = [
  {
    title: 'Größen',
    defs: [
      ['packWidthPct',    30,  85,  1,    'Pack-Breite (% Stage)'],
      ['cardScale',       0.5, 1,   0.02, 'Card-Skala (1 = Max-Fit)'],
      ['packTopPct',      2,   30,  1,    'Pack Y-Position (%)'],
      ['rowYPct',         30,  80,  1,    'Card-Reihe Y-Position (% Stage)'],
      ['cardSpacing',     0,   24,  1,    'Card-Abstand in Reihe (px)'],
    ],
  },
  {
    title: 'Effekte',
    defs: [
      ['burstScalePct',   60,  260, 5,    'Light-Burst Größe (%)'],
      ['glowScalePct',    60,  240, 5,    'Card-Glow Größe (%)'],
      ['sparkleDistance', 60,  340, 5,    'Sparkle-Distanz (px)'],
    ],
  },
  {
    title: 'Spring-Physik (Flip)',
    defs: [
      ['stiffness',       50,  500, 5,    'Stiffness'],
      ['damping',         5,   60,  1,    'Damping'],
      ['mass',            0.3, 3,   0.1,  'Mass'],
    ],
  },
];

export default function OnboardingLabPage() {
  const reduced = useReducedMotion();
  const [tweaks, setTweaks] = useState<Tweaks>(DEFAULT_TWEAKS);
  const [phase,  setPhase]  = useState<Phase>('idle');
  const [seed,   setSeed]   = useState(0);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [hasBeenFlipped, setHasBeenFlipped] = useState<Set<number>>(new Set());

  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 380, h: 676 });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTweaks({ ...DEFAULT_TWEAKS, ...JSON.parse(raw) });
    } catch { /* localStorage unavailable */ }
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStage({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const updateTweak = useCallback(<K extends keyof Tweaks>(key: K, value: Tweaks[K]) => {
    setTweaks((prev) => {
      const merged = { ...prev, [key]: value };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
      return merged;
    });
  }, []);

  const resetTweaks = useCallback(() => {
    setTweaks(DEFAULT_TWEAKS);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  const replay = useCallback(() => {
    setPhase('idle');
    setFlipped(new Set());
    setHasBeenFlipped(new Set());
    setSeed((s) => s + 1);
  }, []);

  const open = useCallback(() => {
    if (phase !== 'idle') return;
    setPhase('zoom');
  }, [phase]);

  const toggleFlip = useCallback((i: number) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
    setHasBeenFlipped((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      return next;
    });
  }, []);

  const revealAll = useCallback(() => {
    const all = new Set(SAMPLE_CARDS.map((_, i) => i));
    setFlipped(all);
    setHasBeenFlipped(all);
  }, []);

  useEffect(() => {
    if (phase === 'zoom') {
      const t = window.setTimeout(() => setPhase('shatter'), 870);
      return () => clearTimeout(t);
    }
    if (phase === 'shatter') {
      const t = window.setTimeout(() => setPhase('reveal'), 750);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const spring = {
    type:      'spring' as const,
    stiffness: tweaks.stiffness,
    damping:   tweaks.damping,
    mass:      tweaks.mass,
  };

  const sw = stage.w;
  const sh = stage.h;
  const packW    = sw * tweaks.packWidthPct / 100;
  const packH    = packW * 1.5;
  const packLeft = (sw - packW) / 2;
  const packTop  = sh * tweaks.packTopPct / 100;

  const cardCount = SAMPLE_CARDS.length;
  const rowCount  = Math.ceil(cardCount / CARDS_PER_ROW);

  const availW = sw * (1 - (GRID_MARGIN_PCT * 2) / 100);
  const availH = sh * (1 - (GRID_MARGIN_PCT * 2) / 100);
  const maxCardW_fromWidth  = (availW - (CARDS_PER_ROW - 1) * tweaks.cardSpacing) / CARDS_PER_ROW;
  const maxCardH_fromHeight = (availH - (rowCount - 1) * ROW_GAP_PX) / rowCount;
  const maxCardW_fromHeight = maxCardH_fromHeight / 1.5;
  const fitCardW = Math.min(maxCardW_fromWidth, maxCardW_fromHeight);
  const cardW    = fitCardW * tweaks.cardScale;
  const cardH    = cardW * 1.5;
  const rowY     = sh * tweaks.rowYPct / 100;

  const burstSize = sw * tweaks.burstScalePct / 100;
  const glowSize  = cardW * tweaks.glowScalePct / 100;
  const explosionX = packLeft + packW / 2;
  const explosionY = packTop  + packH / 2;

  const totalRowsH = rowCount * cardH + (rowCount - 1) * ROW_GAP_PX;
  const firstRowCenterY = rowY - totalRowsH / 2 + cardH / 2;

  const fragments = useMemo(() => {
    return Array.from({ length: FRAG_COLS * FRAG_ROWS }, (_, i) => {
      const col = i % FRAG_COLS;
      const row = Math.floor(i / FRAG_COLS);
      const x0 = col * (100 / FRAG_COLS);
      const y0 = row * (100 / FRAG_ROWS);
      const x1 = x0 + 100 / FRAG_COLS;
      const y1 = y0 + 100 / FRAG_ROWS;
      const cx = (col + 0.5) - FRAG_COLS / 2;
      const cy = (row + 0.5) - FRAG_ROWS / 2;
      const norm = Math.max(0.5, Math.hypot(cx, cy));
      const dirX = cx / norm;
      const dirY = cy / norm;
      const flyMag    = 0.7 + seedRand(seed, i, 11) * 0.6;
      const upwardBias = -0.25 + (seedRand(seed, i, 17) - 0.5) * 0.4;
      const rotJitter  = (seedRand(seed, i, 12) - 0.5) * 540;
      const rotX       = (seedRand(seed, i, 14) - 0.5) * 720;
      const rotY       = (seedRand(seed, i, 15) - 0.5) * 540;
      return {
        clip:  jaggedClip(x0, y0, x1, y1, seed, i),
        dx:    dirX * flyMag + (seedRand(seed, i, 18) - 0.5) * 0.5,
        dy:    dirY * flyMag + upwardBias,
        rot:   Math.atan2(cy, cx) * 180 / Math.PI + rotJitter,
        rotX,
        rotY,
        delay: seedRand(seed, i, 13) * 0.06,
      };
    });
  }, [seed]);

  const sparkles = useMemo(() => {
    return Array.from({ length: SPARKLE_COUNT }, (_, i) => {
      const angle = (i / SPARKLE_COUNT) * Math.PI * 2 + (seedRand(seed, i, 21) - 0.5) * 0.5;
      const tone  = seedRand(seed, i, 22);
      const palette =
        tone < 0.30
          ? { core: 'rgba(255, 255, 255, 1)',  mid: 'rgba(255, 235, 195, 0.85)', glow: 'rgba(255, 215, 150, 0.55)' }
        : tone < 0.65
          ? { core: 'rgba(255, 235, 185, 1)',  mid: 'rgba(255, 175, 80, 0.85)',  glow: 'rgba(255, 130, 35, 0.55)' }
        : tone < 0.90
          ? { core: 'rgba(255, 200, 130, 1)',  mid: 'rgba(255, 120, 35, 0.85)',  glow: 'rgba(220, 65, 15, 0.5)'  }
        :   { core: 'rgba(255, 170, 100, 1)',  mid: 'rgba(220, 75, 30, 0.85)',   glow: 'rgba(160, 30, 10, 0.4)'  };
      const size = 1.5 + seedRand(seed, i, 25) * 5;
      return {
        angle,
        delay:    seedRand(seed, i, 23) * 0.22,
        distance: tweaks.sparkleDistance * (0.4 + seedRand(seed, i, 24) * 1.0),
        size,
        duration: 0.7 + seedRand(seed, i, 26) * 0.6,
        zPos:     Math.round((seedRand(seed, i, 27) - 0.5) * 100),
        bg: `radial-gradient(circle, ${palette.core} 0%, ${palette.mid} 38%, ${palette.glow} 68%, transparent 100%)`,
        shadow: `0 0 ${Math.round(size * 1.6)}px ${palette.glow}, 0 0 ${Math.round(size * 3)}px ${palette.glow}`,
      };
    });
  }, [seed, tweaks.sparkleDistance]);

  const smokes = useMemo(() => {
    return Array.from({ length: SMOKE_COUNT }, (_, i) => {
      const angle = (i / SMOKE_COUNT) * Math.PI * 2 + (seedRand(seed, i, 31) - 0.5) * 0.6;
      return {
        angle,
        delay:    seedRand(seed, i, 32) * 0.15,
        distance: 80 + seedRand(seed, i, 33) * 110,
        size:     35 + seedRand(seed, i, 34) * 45,
        duration: 1.2 + seedRand(seed, i, 35) * 0.8,
      };
    });
  }, [seed]);

  const debris = useMemo(() => {
    return Array.from({ length: DEBRIS_COUNT }, (_, i) => {
      const angle = (i / DEBRIS_COUNT) * Math.PI * 2 + (seedRand(seed, i, 41) - 0.5) * 0.5;
      return {
        angle,
        delay:    seedRand(seed, i, 42) * 0.10,
        distance: 130 + seedRand(seed, i, 43) * 200,
        sizeX:    1 + seedRand(seed, i, 44) * 3,
        sizeY:    1 + seedRand(seed, i, 45) * 3,
        rot:      seedRand(seed, i, 46) * 720 - 360,
        duration: 0.8 + seedRand(seed, i, 47) * 0.5,
      };
    });
  }, [seed]);


  return (
    <div className={styles.page}>
      <div className={styles.stageWrap}>
        <motion.div
          className={styles.stage}
          ref={stageRef}
          key={seed}
          animate={
            phase === 'shatter'
              ? { x: [0, -6, 8, -5, 4, -2, 0], y: [0, 4, -3, 5, -2, 1, 0] }
              : { x: 0, y: 0 }
          }
          transition={
            phase === 'shatter'
              ? { duration: 0.55, ease: 'easeOut' }
              : { duration: 0.2 }
          }
        >

          <motion.div
            className={styles.whiteFlash}
            animate={
              phase === 'shatter'
                ? { opacity: [0, 0, 0.45, 0.18, 0] }
                : { opacity: 0 }
            }
            transition={
              phase === 'shatter'
                ? { duration: 0.7, ease: 'easeOut', times: [0, 0.25, 0.32, 0.45, 1] }
                : { duration: 0.2 }
            }
          />

          {smokes.map((s, i) => {
            const dx = Math.cos(s.angle) * s.distance;
            const dy = Math.sin(s.angle) * s.distance - 20;
            return (
              <motion.div
                key={`smoke-${seed}-${i}`}
                className={styles.smoke}
                style={{
                  width:  `${s.size}px`,
                  height: `${s.size}px`,
                  left:   `${explosionX - s.size / 2}px`,
                  top:    `${explosionY - s.size / 2}px`,
                }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                animate={
                  phase === 'shatter' || phase === 'reveal'
                    ? { x: dx, y: dy, opacity: [0, 0.85, 0], scale: [0.4, 1.6, 2.6] }
                    : { x: 0, y: 0, opacity: 0, scale: 0.4 }
                }
                transition={
                  phase === 'shatter'
                    ? { duration: s.duration, ease: 'easeOut', delay: s.delay, times: [0, 0.35, 1] }
                    : { duration: 0.2 }
                }
              />
            );
          })}

          {debris.map((d, i) => {
            const dx = Math.cos(d.angle) * d.distance;
            const dy = Math.sin(d.angle) * d.distance - 30;
            return (
              <motion.div
                key={`debris-${seed}-${i}`}
                className={styles.debris}
                style={{
                  width:  `${d.sizeX}px`,
                  height: `${d.sizeY}px`,
                  left:   `${explosionX - d.sizeX / 2}px`,
                  top:    `${explosionY - d.sizeY / 2}px`,
                }}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 0 }}
                animate={
                  phase === 'shatter'
                    ? { x: dx, y: dy, rotate: d.rot, opacity: [0, 1, 0.4, 0] }
                    : { x: 0, y: 0, rotate: 0, opacity: 0 }
                }
                transition={
                  phase === 'shatter'
                    ? { duration: d.duration, ease: 'easeOut', delay: d.delay, times: [0, 0.15, 0.7, 1] }
                    : { duration: 0.2 }
                }
              />
            );
          })}

          <motion.div
            className={styles.lightBurst}
            style={{
              width:  `${burstSize}px`,
              height: `${burstSize}px`,
              left:   `${explosionX - burstSize / 2}px`,
              top:    `${explosionY - burstSize / 2}px`,
            }}
            animate={
              phase === 'shatter'
                ? { opacity: [0, 0.6, 0.5, 0.25], scale: [0.2, 1.0, 1.15, 0.95] }
                : { opacity: 0, scale: 0.2 }
            }
            transition={
              phase === 'shatter'
                ? { duration: 0.6, ease: 'easeOut', times: [0, 0.35, 0.6, 1] }
                : { duration: 0.6 }
            }
          />

          {sparkles.map((s, i) => {
            const dx = Math.round(Math.cos(s.angle) * s.distance);
            const dy = Math.round(Math.sin(s.angle) * s.distance - 25);
            return (
              <motion.div
                key={`sparkle-${seed}-${i}`}
                className={styles.sparkle}
                style={{
                  width:      `${s.size}px`,
                  height:     `${s.size}px`,
                  left:       `${explosionX - s.size / 2}px`,
                  top:        `${explosionY - s.size / 2}px`,
                  background: s.bg,
                  boxShadow:  s.shadow,
                }}
                initial={{ x: 0, y: 0, z: s.zPos, opacity: 0, scale: 0.3 }}
                animate={
                  phase === 'shatter'
                    ? { x: dx, y: dy, z: s.zPos, opacity: [0, 1, 0.9, 0], scale: [0.3, 1.6, 1.0, 0.5] }
                    : { x: 0, y: 0, z: s.zPos, opacity: 0, scale: 0.3 }
                }
                transition={
                  phase === 'shatter'
                    ? { duration: s.duration, ease: 'easeOut', delay: s.delay, times: [0, 0.22, 0.65, 1] }
                    : { duration: 0.2 }
                }
              />
            );
          })}

          {SAMPLE_CARDS.map((img, i) => {
            const row         = Math.floor(i / CARDS_PER_ROW);
            const col         = i % CARDS_PER_ROW;
            const cardsInThisRow = Math.min(cardCount - row * CARDS_PER_ROW, CARDS_PER_ROW);
            const thisRowWidth = cardsInThisRow * cardW + (cardsInThisRow - 1) * tweaks.cardSpacing;
            const thisRowStartLeft = (sw - thisRowWidth) / 2;
            const slotLeft    = thisRowStartLeft + col * (cardW + tweaks.cardSpacing);
            const slotCenterY = firstRowCenterY + row * (cardH + ROW_GAP_PX);
            const cardCenterX = slotLeft + cardW / 2;
            const isFlipped   = flipped.has(i);
            const atSlot       = phase === 'reveal';
            const visible      = atSlot;

            const startX = explosionX - cardCenterX;
            const startY = explosionY - slotCenterY;

            const flyInAngle = seedRand(seed, i, 51) * Math.PI * 2;
            const flyInDist  = Math.max(sw, sh) * (1.1 + seedRand(seed, i, 52) * 0.5);
            const flyInOffsetX = Math.round(Math.cos(flyInAngle) * flyInDist);
            const flyInOffsetY = Math.round(Math.sin(flyInAngle) * flyInDist);
            const flyInX = startX + flyInOffsetX;
            const flyInY = startY + flyInOffsetY;
            const flyInRot = Math.round((seedRand(seed, i, 53) - 0.5) * 220);

            return (
              <div key={`slot-${i}`}>
                <motion.div
                  className={styles.cardGlow}
                  style={{
                    width:  `${glowSize}px`,
                    height: `${glowSize}px`,
                    left:   `${cardCenterX - glowSize / 2}px`,
                    top:    `${slotCenterY - glowSize / 2}px`,
                  }}
                  animate={
                    isFlipped
                      ? { opacity: 0.7, scale: 1.0 }
                      : { opacity: 0,   scale: 0.5 }
                  }
                  initial={false}
                  transition={
                    isFlipped
                      ? { duration: 0.5, ease: 'easeOut' }
                      : { duration: 0.3 }
                  }
                />

                <motion.div
                  className={styles.cardSlot}
                  style={{
                    width:  `${cardW}px`,
                    height: `${cardH}px`,
                    left:   `${slotLeft}px`,
                    top:    `${slotCenterY - cardH / 2}px`,
                    pointerEvents: atSlot ? 'auto' : 'none',
                  }}
                  initial={{ x: flyInX, y: flyInY, scale: 3.5, opacity: 1, rotate: flyInRot }}
                  animate={
                    atSlot
                      ? { x: 0,      y: 0,      scale: 1,   opacity: 1, rotate: 0 }
                      : { x: flyInX, y: flyInY, scale: 3.5, opacity: 1, rotate: flyInRot }
                  }
                  transition={
                    atSlot
                      ? { type: 'spring', stiffness: 200, damping: 18, mass: 1, delay: (i * 70) / 1000 }
                      : { duration: 0.2 }
                  }
                  onClick={() => atSlot && toggleFlip(i)}
                  whileTap={atSlot ? { scale: 0.97 } : undefined}
                >
                  <div
                    className={`${styles.cardFloat} ${atSlot && !hasBeenFlipped.has(i) && !reduced ? styles.cardVibrating : ''}`}
                    style={{
                      animationDelay: `${0.55 + (i * 0.07) + seedRand(seed, i, 61) * 0.15}s`,
                    }}
                  >
                    <motion.div
                      className={styles.cardFlip}
                      animate={{ rotateY: isFlipped ? 180 : 0 }}
                      initial={false}
                      transition={spring}
                    >
                      <div className={`${styles.face} ${styles.back}`} />
                      <div className={`${styles.face} ${styles.front}`} style={{ backgroundImage: `url(${img})` }} />
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            );
          })}

          <motion.div
            className={`${styles.packGroup} ${phase === 'idle' ? styles.packClickable : ''}`}
            onClick={phase === 'idle' ? open : undefined}
            style={{
              width:  `${packW}px`,
              height: `${packH}px`,
              left:   `${packLeft}px`,
              top:    `${packTop}px`,
              transformOrigin: '50% 40%',
            }}
            initial={{ scale: 1, y: 0, rotate: 0, opacity: 1 }}
            animate={
              phase === 'idle' && !reduced
                ? { y: [0, -8, 0], rotate: [-1, 1, -1], scale: 1, opacity: 1 }
                : phase === 'idle'
                ? { y: 0, rotate: 0, scale: 1, opacity: 1 }
                : phase === 'zoom'
                ? { y: 0, rotate: 0, scale: 4.2, opacity: 1 }
                : phase === 'shatter'
                ? { y: 0, rotate: 0, scale: 1.6, opacity: 1 }
                : { y: 0, rotate: 0, scale: 1.6, opacity: 0 }
            }
            transition={
              phase === 'idle' && !reduced
                ? { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                : phase === 'zoom'
                ? { duration: 0.85, ease: [0.5, 0, 0.85, 0.4] }
                : phase === 'shatter'
                ? { duration: 0.12, ease: 'easeOut' }
                : phase === 'reveal'
                ? { duration: 0 }
                : { duration: 0.3 }
            }
          >
            {fragments.map((f, i) => {
              const flyX = f.dx * packW;
              const flyY = f.dy * packH;
              return (
                <motion.div
                  key={`frag-${seed}-${i}`}
                  className={styles.packFrag}
                  style={{ clipPath: f.clip }}
                  animate={
                    phase === 'shatter'
                      ? { x: flyX, y: flyY, rotate: f.rot, rotateX: f.rotX, rotateY: f.rotY, opacity: [1, 1, 0], scale: 1 }
                      : { x: 0, y: 0, rotate: 0, rotateX: 0, rotateY: 0, opacity: 1, scale: 1 }
                  }
                  transition={
                    phase === 'shatter'
                      ? { duration: 1.05, ease: [0.18, 0.55, 0.4, 1], times: [0, 0.88, 1], delay: f.delay }
                      : { duration: 0.2 }
                  }
                />
              );
            })}
          </motion.div>

        </motion.div>

      </div>
    </div>
  );
}
