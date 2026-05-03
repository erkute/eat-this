'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import type { MustEatAlbumCard } from '@/lib/types';
import styles from './ProfileDeckStackOverlay.module.css';

// Three nested motion layers per card:
//   1. position layer — animates left/top/width/height/opacity from stack
//      to lifted to slot. Pixel-based (not scale) so the dish stays sharp.
//   2. flip layer — animates rotateY 0 → 180 once during the lift, and
//      stays at 180 thereafter.
//   3. tilt layer — pointer-driven rotateX / rotateY (springed). Only
//      active during the LIFTED phase; locks to 0 otherwise.
//
// Stack itself is a separate, completely static element. No tilt, no float.

interface Props {
  cards:        MustEatAlbumCard[];
  // Smoothly scrolls the deck-grid so the target slot is centred in the
  // viewport. Called at click time so the slot is stable by the time the
  // dwell ends and the flight begins.
  scrollToSlot: (order: number) => void;
  // Returns the current viewport rect of the deck slot for `order`.
  // Measured AFTER scroll has settled so the rect is the true target.
  getSlotRect:  (order: number) => DOMRect | null;
  onCardPlaced: (order: number) => void;
  onAllPlaced:  () => void;
}

const MAX_VISIBLE_LAYERS = 10;
const LAYER_OFFSET_PX    = 2.5;
const LAYER_ROT_DEG      = 0.45;

// Lift = position move + flip combined. Snappier than before so the user
// can start tilting almost immediately. The flip itself completes within
// the first ~60% of this window; tilt is enabled from frame one.
const LIFT_DURATION_MS    = 520;
// Time the lifted card sits at centre, tilt-able, before automatically
// flying to its deck slot. No second click required.
const LIFTED_DWELL_MS     = 1500;
const FLIGHT_DURATION_MS  = 720;
const SETTLE_FADE_MS      = 220;

type Phase = 'idle' | 'lifting' | 'lifted' | 'flying';

export default function ProfileDeckStackOverlay({
  cards,
  scrollToSlot,
  getSlotRect,
  onCardPlaced,
  onAllPlaced,
}: Props) {
  const [topIndex, setTopIndex] = useState(0);
  const [phase, setPhase]       = useState<Phase>('idle');
  const [target, setTarget]     = useState<DOMRect | null>(null);

  const [portalReady, setPortalReady] = useState(false);
  // Measure an actual deck slot on mount so the stack matches the grid
  // card size exactly, regardless of viewport width or breakpoint.
  const [stackSize, setStackSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    setPortalReady(true);
    if (!cards.length || typeof cards[0].order !== 'number') return;
    const rect = getSlotRect(cards[0].order);
    if (rect && rect.width > 0) {
      setStackSize({ w: rect.width, h: rect.height });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // measure once — slot size is stable after mount

  const handleStackClick = () => {
    if (phase !== 'idle' || topIndex >= cards.length) return;
    // Request gyroscope permission on iOS 13+ so the lifted card gets gyro
    // tilt active during the dwell. Fire-and-forget — animation proceeds
    // regardless.
    const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof DOE.requestPermission === 'function') DOE.requestPermission().catch(() => {});
    setPhase('lifting');
    const card = cards[topIndex];
    if (card && typeof card.order === 'number') scrollToSlot(card.order);
    window.setTimeout(() => setPhase('lifted'), LIFT_DURATION_MS);
  };

  // Auto-advance from lifted → flying after the dwell. The scroll-to-slot
  // started at click time, so the slot is stationary by now.
  useEffect(() => {
    if (phase !== 'lifted') return;
    const t = window.setTimeout(() => {
      const card = cards[topIndex];
      if (!card || typeof card.order !== 'number') return;
      const targetRect = getSlotRect(card.order);
      if (!targetRect) return;
      setPhase('flying');
      setTarget(targetRect);
    }, LIFTED_DWELL_MS);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, topIndex]);

  // Fired the instant the FlyingCard's position animation lands at the
  // target slot (t = FLIGHT_DURATION_MS). We reveal the slot HERE so the
  // FlipSlot is already solid by the time the FlyingCard starts fading —
  // no blink-gap between card disappearing and slot appearing.
  const handleCardLanded = () => {
    const card = cards[topIndex];
    if (card && typeof card.order === 'number') onCardPlaced(card.order);
  };

  // Fired AFTER the FlyingCard's settle-fade completes (t = FLIGHT + FADE).
  // Cleans up the active card and advances to the next stack card.
  const handleFlightDone = () => {
    setTarget(null);
    setTopIndex((i) => i + 1);
    setPhase('idle');
    if (topIndex + 1 >= cards.length) {
      window.setTimeout(onAllPlaced, 480);
    }
  };

  if (!portalReady || !stackSize) return null;

  const remaining       = cards.length - topIndex;
  const stackLayerCount = Math.min(remaining, MAX_VISIBLE_LAYERS);
  // While a card is mid-lift / lifted / flying, the topmost stack layer
  // visually moves out — render one fewer layer so the stack reads as
  // shrinking.
  const baseStackCount =
    phase === 'idle' ? stackLayerCount : Math.max(0, stackLayerCount - 1);
  const topCard = topIndex < cards.length ? cards[topIndex] : null;

  return createPortal(
    <div className={styles.overlay} aria-hidden={phase === 'flying'}>
      {/* Stack — rigid, centred, no tilt, no float. Click target only when
       * idle. Renders up to 10 layers with offset/rotation so the deck
       * thickness is visible. While a card is FLYING to its slot, the
       * stack fades out so the flying card never visually crosses through
       * the deck thickness on its way to a slot that sits "behind" the
       * stack. The stack reappears at the next idle frame. */}
      {topCard && (
        <div
          className={`${styles.stackPositioner} ${phase === 'flying' ? styles.stackPositionerHidden : ''}`}
        >
          <div
            className={`${styles.stack} ${phase === 'idle' ? styles.stackInteractive : ''}`}
            style={{ width: stackSize.w, height: stackSize.h }}
            onClick={phase === 'idle' ? handleStackClick : undefined}
            role={phase === 'idle' ? 'button' : undefined}
            tabIndex={phase === 'idle' ? 0 : undefined}
            aria-label={phase === 'idle' ? 'Karte aufdecken' : undefined}
            onKeyDown={phase === 'idle' ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') handleStackClick();
            } : undefined}
          >
            {Array.from({ length: baseStackCount }).map((_, layerIdx) => {
              const offset = layerIdx * LAYER_OFFSET_PX;
              const rotZ   = (layerIdx % 2 === 0 ? 1 : -1) * layerIdx * LAYER_ROT_DEG;
              const z      = -layerIdx * 1.2;
              return (
                <div
                  key={`stack-layer-${topIndex + layerIdx}`}
                  className={styles.stackCard}
                  style={{
                    transform: `translate3d(${offset}px, ${offset}px, ${z}px) rotate(${rotZ.toFixed(2)}deg)`,
                    zIndex:    baseStackCount - layerIdx,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/pics/card-back.webp"
                    alt=""
                    className={styles.stackCardBack}
                    draggable={false}
                    aria-hidden="true"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active card — the one currently being lifted, tilted, or flown. */}
      <AnimatePresence>
        {topCard && phase !== 'idle' && (
          <ActiveCard
            key={`active-${topIndex}`}
            card={topCard}
            phase={phase}
            target={target}
            stackSize={stackSize}
            onLanded={handleCardLanded}
            onFlightDone={handleFlightDone}
          />
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

// ── Active card ─────────────────────────────────────────────────────────

interface ActiveCardProps {
  card:         MustEatAlbumCard;
  phase:        Phase;
  target:       DOMRect | null;
  stackSize:    { w: number; h: number };  // measured from a real deck slot
  onLanded:     () => void;   // fires at flight-end (start of fade)
  onFlightDone: () => void;   // fires after fade settled
}

function ActiveCard({ card, phase, target, stackSize, onLanded, onFlightDone }: ActiveCardProps) {
  const liftedRef = useRef<HTMLDivElement>(null);

  // Pointer-driven 3D tilt — same parameters as the deck-lightbox tilt
  // (per user feedback: stack tilt was too aggressive; lightbox feel is
  // the right reference). ±12°/±14° range, calm spring.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateXSpring = useSpring(
    useTransform(pointerY, [-0.5, 0.5], [12, -12]),
    { stiffness: 220, damping: 18 },
  );
  const rotateYSpring = useSpring(
    useTransform(pointerX, [-0.5, 0.5], [-14, 14]),
    { stiffness: 220, damping: 18 },
  );

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = liftedRef.current;
    if (!el || phase !== 'lifted') return;
    const rect = el.getBoundingClientRect();
    pointerX.set((e.clientX - rect.left) / rect.width  - 0.5);
    pointerY.set((e.clientY - rect.top)  / rect.height - 0.5);
  };
  const handlePointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  // Gyroscope tilt — active during the lifted dwell. Calibrates on the
  // first event so the phone's current orientation reads as neutral (0,0).
  // Sets the same pointerX/Y values as the pointer handler so both compose
  // through the same springs without conflicts.
  const gyroBaseRef = useRef<{ beta: number; gamma: number } | null>(null);
  useEffect(() => {
    if (phase !== 'lifted') {
      gyroBaseRef.current = null;
      return;
    }
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      if (!gyroBaseRef.current) {
        gyroBaseRef.current = { beta: e.beta, gamma: e.gamma };
        return; // first event = calibration baseline
      }
      const dGamma = e.gamma - gyroBaseRef.current.gamma;
      const dBeta  = e.beta  - gyroBaseRef.current.beta;
      // 20° of physical tilt → full ±0.5 spring input (→ ±14°/±12° card rotation)
      pointerX.set(Math.max(-0.5, Math.min(0.5, dGamma / 20)));
      pointerY.set(Math.max(-0.5, Math.min(0.5, dBeta  / 20)));
    };
    window.addEventListener('deviceorientation', onOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', onOrientation, true);
      gyroBaseRef.current = null;
    };
  }, [phase, pointerX, pointerY]);

  // Geometry — viewport-centred, sized for clear dish visibility.
  const vpW = typeof window !== 'undefined' ? window.innerWidth  : 800;
  const vpH = typeof window !== 'undefined' ? window.innerHeight : 1200;

  // Stack start position matches the measured slot size + accounts for the
  // .stackPositioner's margin-top: 2vh offset so the first animation frame
  // doesn't jump.
  const stackW = stackSize.w;
  const stackH = stackSize.h;
  const stackX = vpW / 2 - stackW / 2;
  const stackY = vpH / 2 + vpH * 0.02 - stackH / 2;

  // Lifted "hero" — matches the ExpandedOverlay lightbox size so the zoom
  // feels as deep as opening a revealed deck card (min(88vw, 420px), also
  // constrained by 78vh so it never overflows on short screens).
  const liftedW = Math.min(vpW * 0.88, 420, vpH * 0.78 * (1449 / 2163));
  const liftedH = liftedW * (2163 / 1449);
  const liftedX = vpW / 2 - liftedW / 2;
  const liftedY = vpH / 2 - liftedH / 2; // true viewport centre, same as ExpandedOverlay

  // Position-layer animate target.
  const positionTarget =
    phase === 'lifting' || phase === 'lifted'
      ? { left: liftedX, top: liftedY, width: liftedW, height: liftedH }
      : phase === 'flying' && target
      ? { left: target.left, top: target.top, width: target.width, height: target.height }
      : { left: liftedX, top: liftedY, width: liftedW, height: liftedH };

  // Crossfade after flight lands. At t = FLIGHT_DURATION_MS we BOTH start
  // the FlyingCard's opacity fade AND fire onLanded — the latter tells
  // the parent to reveal the underlying FlipSlot. With the slot already
  // solid behind the fading FlyingCard, the handoff is invisible (no
  // blink-gap that the previous "reveal-after-fade" timing produced).
  const [crossfade, setCrossfade] = useState(false);
  useEffect(() => {
    if (phase !== 'flying' || !target) return;
    const tLand = window.setTimeout(() => {
      onLanded();
      setCrossfade(true);
    }, FLIGHT_DURATION_MS);
    const tDone = window.setTimeout(onFlightDone, FLIGHT_DURATION_MS + SETTLE_FADE_MS);
    return () => {
      clearTimeout(tLand);
      clearTimeout(tDone);
    };
  }, [phase, target, onLanded, onFlightDone]);

  const positionTransition =
    phase === 'lifting'
      ? { duration: LIFT_DURATION_MS / 1000, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
      : phase === 'flying'
      ? { duration: FLIGHT_DURATION_MS / 1000, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }
      : { duration: 0.2 };

  const opacityTransition = crossfade
    ? { duration: SETTLE_FADE_MS / 1000, ease: 'linear' as const }
    : { duration: 0 };

  // Tilt becomes active the instant the card starts lifting — no waiting
  // for the flip animation to finish. The flip and the tilt compose
  // multiplicatively in the 3D matrix; visually, the user can already
  // gently steer the card while it's settling. Auto-advance to flight
  // happens on a timer in the parent — no second click needed.
  const tiltable = phase === 'lifting' || phase === 'lifted';

  return (
    <motion.div
      className={`${styles.activeCard} ${tiltable ? styles.activeCardTiltable : ''}`}
      initial={{ left: stackX, top: stackY, width: stackW, height: stackH, opacity: 1 }}
      animate={{ ...positionTarget, opacity: crossfade ? 0 : 1 }}
      transition={{ ...positionTransition, opacity: opacityTransition }}
    >
      {/* Flip layer — rotateY 0 (back-up) during 'lifting' start frame,
       *  animates to 180 (face-up) during the lift, holds at 180 thereafter. */}
      <motion.div
        className={styles.flipLayer}
        initial={{ rotateY: 0 }}
        animate={{ rotateY: phase === 'lifting' ? 180 : phase === 'lifted' || phase === 'flying' ? 180 : 0 }}
        transition={
          phase === 'lifting'
            ? { duration: LIFT_DURATION_MS / 1000, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
            : { duration: 0 }
        }
      >
        {/* Tilt layer — pointer-driven, only active during lifted. */}
        <motion.div
          ref={liftedRef}
          className={styles.tiltLayer}
          style={{
            rotateX: tiltable ? rotateXSpring : 0,
            rotateY: tiltable ? rotateYSpring : 0,
          }}
          onPointerMove={tiltable ? handlePointerMove : undefined}
          onPointerLeave={tiltable ? handlePointerLeave : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pics/card-back.webp"
            alt=""
            className={styles.cardFaceBack}
            draggable={false}
            aria-hidden="true"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.imageUrl}
            alt={card.dish}
            className={styles.cardFaceFront}
            draggable={false}
          />
          <Sheen rotateYSpring={rotateYSpring} visible={tiltable} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// Sheen — a soft horizontal highlight that slides across the card face,
// driven by the rotateY spring. Reinforces the 3D tilt feel.
function Sheen({ rotateYSpring, visible }: { rotateYSpring: MotionValue<number>; visible: boolean }) {
  const x = useTransform(rotateYSpring, [-14, 14], ['-30%', '30%']);
  return (
    <motion.div
      className={styles.cardSheen}
      style={{
        x,
        opacity: visible ? 1 : 0,
      }}
      aria-hidden="true"
    />
  );
}
