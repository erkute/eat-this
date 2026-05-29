'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import type { MustEatAlbumCard } from '@/lib/types';
import ProfileDeckHeader from './ProfileDeckHeader';
import ProfileReferralCard from './ProfileReferralCard';
import styles from './ProfileDeck.module.css';

const TOTAL_SLOTS        = 150;
const FLIP_DURATION_S    = 0.7;

interface Props {
  mustEats:       MustEatAlbumCard[];
  mapUnlockedIds: Set<string>;
}

interface ExpandedState {
  card:  MustEatAlbumCard;
  rect:  DOMRect;
  order: number;
}

export default function ProfileDeck({ mustEats, mapUnlockedIds }: Props) {
  // Map-page reveals (`users/{uid}/unlockedMustEats/*`) — show face-up in
  // the album immediately, no further reveal step needed.
  const mapUnlockedByOrder = useMemo(() => {
    const map = new Map<number, MustEatAlbumCard>();
    for (const id of mapUnlockedIds) {
      const card = mustEats.find((m) => m._id === id);
      if (card && typeof card.order === 'number') map.set(card.order, card);
    }
    return map;
  }, [mapUnlockedIds, mustEats]);

  const [revealed, setRevealed] = useState<Set<number>>(() => {
    return new Set<number>(mapUnlockedByOrder.keys());
  });

  // Newly arriving map unlocks (e.g. user revealed one on the map and
  // navigated here without remount) need to be added to `revealed` too,
  // otherwise the album shows them as BackSlot until next page load.
  useEffect(() => {
    setRevealed((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const order of mapUnlockedByOrder.keys()) {
        if (!next.has(order)) { next.add(order); changed = true; }
      }
      return changed ? next : prev;
    });
  }, [mapUnlockedByOrder]);

  // Card that the user tapped to expand (null = none).
  const [expanded, setExpanded] = useState<ExpandedState | null>(null);
  // Order of the slot whose front-face should be hidden while the card is
  // in the lightbox or still animating back (prevents the "ghost" duplicate).
  const [hiddenSlotOrder, setHiddenSlotOrder] = useState<number | null>(null);

  // Close handler — stable reference so memoized ExpandedOverlay doesn't re-render mid-flight.
  const closeExpanded = useCallback(() => {
    setExpanded(null);
    // Reveal slot when the animated card starts its opacity fade (220 ms).
    // From that point on, the slot is fully opaque underneath while the
    // animated card crossfades to 0 — sub-pixel edges merge invisibly.
    setTimeout(() => setHiddenSlotOrder(null), 220);
  }, []);

  // Close expanded view on Escape.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeExpanded();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expanded, closeExpanded]);

  return (
    <>
      <ProfileReferralCard />
      <ProfileDeckHeader unlockedCount={revealed.size} totalSlots={TOTAL_SLOTS} />

      <div className={styles.albumGrid}>
        {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
          const order = i + 1;
          const card  = mapUnlockedByOrder.get(order);
          const isRevealed = revealed.has(order);

          if (card && isRevealed) {
            return (
              <FlipSlot
                key={order}
                order={order}
                card={card}
                flipped={isRevealed}
                hideCardFace={hiddenSlotOrder === order}
                onExpand={(rect) => {
                  setHiddenSlotOrder(order);
                  setExpanded({ card, rect, order });
                }}
              />
            );
          }
          return <BackSlot key={order} />;
        })}
      </div>

      <div className={styles.teaser}>
        <p className={styles.teaserCity}>BERLIN</p>
        <p className={styles.teaserLine}>IST ERST DER ANFANG.</p>
        <p className={styles.teaserSub}>Mehr Städte. Mehr Karten. Mehr Must Eats.</p>
      </div>

      <AnimatePresence>
        {expanded && (
          <ExpandedOverlay
            key={expanded.card._id}
            expanded={expanded}
            onClose={closeExpanded}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Expanded overlay — flies out from slot position ──────────────────

interface ExpandedOverlayProps {
  expanded: ExpandedState;
  onClose:  () => void;
}

const ExpandedOverlay = memo(function ExpandedOverlay({ expanded, onClose }: ExpandedOverlayProps) {
  const overlayW  = Math.min(420, window.innerWidth * 0.88);
  const screenCx  = window.innerWidth / 2;
  const screenCy  = window.innerHeight / 2;
  const slotCx    = expanded.rect.left + expanded.rect.width / 2;
  const slotCy    = expanded.rect.top  + expanded.rect.height / 2;
  const fromX     = slotCx - screenCx;
  const fromY     = slotCy - screenCy;
  const fromScale = expanded.rect.width / overlayW;

  // Tilt as it flies out — toss feel. Capped at ±7°.
  const tiltZ = Math.max(-7, Math.min(7, fromX * 0.025));

  // 3D tilt while the card is in the lightbox — same pattern as the stack
  // overlay's lifted card so the deck-card feels equally physical when
  // expanded. Pointer position drives rotateX / rotateY through soft
  // springs; ±14° max each axis.
  const cardRef  = useRef<HTMLDivElement>(null);
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
  // Sheen drifts horizontally with rotateY — same recipe as the stack
  // overlay's lifted card so the lightbox tilt has the same depth cue.
  const sheenX = useTransform(rotateYSpring, [-14, 14], ['-30%', '30%']);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    pointerX.set((e.clientX - rect.left) / rect.width  - 0.5);
    pointerY.set((e.clientY - rect.top)  / rect.height - 0.5);
  };
  const handlePointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  // Gyroscope tilt — calibrates on first event so the phone's orientation
  // at open-time reads as neutral. Same pointerX/Y values as the pointer
  // handler so both compose through the same springs.
  const gyroBaseRef = useRef<{ beta: number; gamma: number } | null>(null);
  useEffect(() => {
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      if (!gyroBaseRef.current) {
        gyroBaseRef.current = { beta: e.beta, gamma: e.gamma };
        return;
      }
      const dGamma = e.gamma - gyroBaseRef.current.gamma;
      const dBeta  = e.beta  - gyroBaseRef.current.beta;
      pointerX.set(Math.max(-0.5, Math.min(0.5, dGamma / 20)));
      pointerY.set(Math.max(-0.5, Math.min(0.5, dBeta  / 20)));
    };
    window.addEventListener('deviceorientation', onOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', onOrientation, true);
      gyroBaseRef.current = null;
    };
  }, [pointerX, pointerY]);

  // Lock body scroll while the lightbox is open — otherwise touch-drag on
  // the card to tilt it ALSO pans the deck behind on mobile, which the
  // user perceives as "the deck moves with my finger". Restore on close.
  useEffect(() => {
    const prevOverflow    = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow    = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow    = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, []);

  return (
    <motion.div
      className={styles.lightboxWrapper}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <motion.div
        className={styles.lightboxBg}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      />
      <motion.div
        ref={cardRef}
        className={styles.lightboxCard}
        initial={{ x: fromX, y: fromY, scale: fromScale, rotateZ: tiltZ, opacity: 1 }}
        animate={{
          x: 0, y: 0, scale: 1, rotateZ: 0, opacity: 1,
          // Tween (Apple-style ease-out) instead of spring — eliminates the
          // micro-bounce at settle that made the expand read as jerky.
          transition: { duration: 0.46, ease: [0.22, 1, 0.36, 1] },
        }}
        // Tween (Apple-style ease-in) back to the slot — replaces the
        // previous spring whose final-frame settle showed a tiny "Ruckler"
        // just before landing. The opacity fades in the final 70 ms while
        // the slot face is already revealed underneath, so any sub-pixel
        // mismatch crossfades invisibly.
        exit={{
          x: fromX, y: fromY, scale: fromScale, rotateZ: 0, opacity: 0,
          transition: {
            default: { duration: 0.34, ease: [0.4, 0, 0.2, 1] },
            opacity: { delay: 0.22, duration: 0.07, ease: 'linear' },
          },
        }}
        // rotateX / rotateY composed live with the spring-based opening
        // (which animates x/y/scale/rotateZ). They're separate transform
        // axes so Framer composes them without conflict.
        style={{
          rotateX: rotateXSpring,
          rotateY: rotateYSpring,
          transformStyle: 'preserve-3d',
        }}
        onClick={onClose}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {/* Inner clip wrapper keeps the sheen's drifting gradient inside
            the card's rounded shape — without it the sheen leaks past
            the right edge at strong rotateY tilts. */}
        <div className={styles.lightboxClip}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={expanded.card.imageUrl}
            alt={expanded.card.dish}
            className={styles.lightboxImg}
          />
          <motion.div
            className={styles.lightboxSheen}
            style={{ x: sheenX }}
            aria-hidden="true"
          />
        </div>
      </motion.div>
    </motion.div>
  );
});

// ── Slot variants ────────────────────────────────────────────────────

interface FlipSlotProps {
  order:        number;
  card:         MustEatAlbumCard;
  flipped:      boolean;
  hideCardFace: boolean;
  onExpand:     ((rect: DOMRect) => void) | undefined;
}

function FlipSlot({ order, card, flipped, hideCardFace, onExpand }: FlipSlotProps) {
  return (
    <div
      className={`${styles.slot}${flipped && onExpand ? ` ${styles.slotRevealed}` : ''}`}
      data-order={order}
      onClick={onExpand ? (e) => {
        // Request gyroscope permission on iOS 13+ from this user-gesture handler
        // so the lightbox tilt works immediately on first open.
        const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
        if (typeof DOE.requestPermission === 'function') DOE.requestPermission().catch(() => {});
        onExpand((e.currentTarget as HTMLDivElement).getBoundingClientRect());
      } : undefined}
      role={onExpand ? 'button' : undefined}
      tabIndex={onExpand ? 0 : undefined}
      onKeyDown={onExpand ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') onExpand((e.currentTarget as HTMLDivElement).getBoundingClientRect());
      } : undefined}
    >
      <motion.div
        className={styles.flipper}
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: FLIP_DURATION_S, ease: [0.4, 0.0, 0.2, 1] }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pics/card-back.webp"
          alt=""
          className={`${styles.face} ${styles.faceBack}`}
          loading="lazy"
          aria-hidden="true"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.imageUrl}
          alt={card.dish}
          className={`${styles.face} ${styles.faceFront}${hideCardFace ? ` ${styles.faceFrontHidden}` : ''}`}
          loading={flipped ? 'eager' : 'lazy'}
        />
      </motion.div>
    </div>
  );
}

function BackSlot() {
  const [shaking, setShaking] = useState(false);
  return (
    <div
      className={`${styles.slot} ${styles.slotBack}${shaking ? ` ${styles.slotShake}` : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => setShaking(true)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShaking(true); }}
      onAnimationEnd={() => setShaking(false)}
    >
      <div className={styles.flipper}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pics/card-back.webp"
          alt=""
          className={`${styles.face} ${styles.faceBack}`}
          loading="lazy"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
