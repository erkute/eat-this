'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { openWelcomePack } from '@/lib/firebase/welcomePack';
import type { MustEatAlbumCard } from '@/lib/types';
import type { BoosterPack } from '@/lib/firebase/usePack';
import ProfileDeckHeader from './ProfileDeckHeader';
import ProfileDeckStackOverlay from './ProfileDeckStackOverlay';
import styles from './ProfileDeck.module.css';

const TOTAL_SLOTS        = 150;
const FLIP_DURATION_S    = 0.7;

interface Props {
  pack:     BoosterPack;
  mustEats: MustEatAlbumCard[];
}

interface ExpandedState {
  card:  MustEatAlbumCard;
  rect:  DOMRect;
  order: number;
}

export default function ProfileDeck({ pack, mustEats }: Props) {
  const { user } = useAuth();

  const packCardsByOrder = useMemo(() => {
    const map = new Map<number, MustEatAlbumCard>();
    for (const id of pack.mustEatIds) {
      const card = mustEats.find((m) => m._id === id);
      if (card && typeof card.order === 'number') map.set(card.order, card);
    }
    return map;
  }, [pack.mustEatIds, mustEats]);

  // Pack cards in their deck order — used by the stack overlay so the
  // user clicks through cards top → bottom in the same sequence as the
  // deck slots fill in.
  const sortedPackCards = useMemo(
    () =>
      Array.from(packCardsByOrder.entries())
        .sort(([a], [b]) => a - b)
        .map(([, card]) => card),
    [packCardsByOrder],
  );

  // All pack cards start revealed if pack is already opened (returning user).
  const [revealed, setRevealed] = useState<Set<number>>(() =>
    pack.opened ? new Set(packCardsByOrder.keys()) : new Set(),
  );

  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');

  // Card that the user tapped to expand (null = none).
  const [expanded, setExpanded] = useState<ExpandedState | null>(null);
  // Order of the slot whose front-face should be hidden while the card is
  // in the lightbox or still animating back (prevents the "ghost" duplicate).
  const [hiddenSlotOrder, setHiddenSlotOrder] = useState<number | null>(null);

  const slotRefs  = useRef<Map<number, HTMLDivElement>>(new Map());
  const persistedRef = useRef(false);

  // Stack-overlay handlers — invoked by ProfileDeckStackOverlay as the user
  // clicks through their 10 face-down cards.
  const scrollToSlot = useCallback((order: number, behavior: ScrollBehavior = 'smooth') => {
    const el = slotRefs.current.get(order);
    if (el) el.scrollIntoView({ behavior, block: 'center' });
  }, []);

  const getSlotRect = useCallback((order: number): DOMRect | null => {
    const el = slotRefs.current.get(order);
    return el ? el.getBoundingClientRect() : null;
  }, []);

  const handleCardPlaced = useCallback((order: number) => {
    setRevealed((prev) => {
      if (prev.has(order)) return prev;
      const next = new Set(prev);
      next.add(order);
      return next;
    });
  }, []);

  const handleAllPlaced = useCallback(() => {
    if (!user || persistedRef.current) return;
    persistedRef.current = true;
    openWelcomePack(user.uid, pack.mustEatIds, pack.id).catch((err) => {
      console.error('[profile-deck] openWelcomePack failed:', err);
    });
  }, [user, pack.mustEatIds, pack.id]);

  // Show the stack overlay only on the first profile visit while the
  // user's pack hasn't been "opened" yet. After all 10 cards are placed,
  // openWelcomePack flips pack.opened → true and the overlay unmounts.
  const showStackOverlay = !pack.opened && sortedPackCards.length > 0 && !!user;

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
      <ProfileDeckHeader unlockedCount={revealed.size} totalSlots={TOTAL_SLOTS} />

      {!showStackOverlay && (
        <div className={styles.filterBar}>
          <div className={styles.segControl}>
            <button
              className={viewMode === 'all' ? styles.segActive : styles.segBtn}
              onClick={() => setViewMode('all')}
            >
              Alle
            </button>
            <button
              className={viewMode === 'mine' ? styles.segActive : styles.segBtn}
              onClick={() => setViewMode('mine')}
            >
              Meine
            </button>
          </div>
        </div>
      )}

      {viewMode === 'mine' ? (
        <div className={styles.mineGrid}>
          {sortedPackCards.map((card) => {
            const order = card.order!;
            const isRevealed = revealed.has(order);
            const slotRef = (el: HTMLDivElement | null) => {
              if (el) slotRefs.current.set(order, el);
              else slotRefs.current.delete(order);
            };
            if (isRevealed) {
              return (
                <FlipSlot
                  key={order}
                  order={order}
                  card={card}
                  flipped
                  hideCardFace={hiddenSlotOrder === order}
                  onExpand={(rect) => {
                    setHiddenSlotOrder(order);
                    setExpanded({ card, rect, order });
                  }}
                  slotRef={slotRef}
                />
              );
            }
            return <EmptySlot key={order} order={order} slotRef={slotRef} />;
          })}
        </div>
      ) : (
        <div className={styles.albumGrid}>
          {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
            const order = i + 1;
            const card  = packCardsByOrder.get(order);
            const isRevealed = revealed.has(order);

            if (card) {
              const slotRef = (el: HTMLDivElement | null) => {
                if (el) slotRefs.current.set(order, el);
                else slotRefs.current.delete(order);
              };
              if (isRevealed) {
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
                    slotRef={slotRef}
                  />
                );
              }
              return <EmptySlot key={order} order={order} slotRef={slotRef} />;
            }
            return <BackSlot key={order} />;
          })}
        </div>
      )}

      {viewMode === 'all' && (
        <div className={styles.teaser}>
          <p className={styles.teaserCity}>BERLIN</p>
          <p className={styles.teaserLine}>IST ERST DER ANFANG.</p>
          <p className={styles.teaserSub}>Mehr Städte. Mehr Karten. Mehr Must Eats.</p>
        </div>
      )}

      <AnimatePresence>
        {expanded && (
          <ExpandedOverlay
            key={expanded.card._id}
            expanded={expanded}
            onClose={closeExpanded}
          />
        )}
      </AnimatePresence>

      {showStackOverlay && (
        <ProfileDeckStackOverlay
          cards={sortedPackCards}
          scrollToSlot={scrollToSlot}
          getSlotRect={getSlotRect}
          onCardPlaced={handleCardPlaced}
          onAllPlaced={handleAllPlaced}
        />
      )}
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
  const imgRef   = useRef<HTMLImageElement>(null);
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

  const handlePointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    const el = imgRef.current;
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img
        ref={imgRef}
        src={expanded.card.imageUrl}
        alt={expanded.card.dish}
        className={styles.lightboxImg}
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
          position: 'relative',
          zIndex: 1,
          rotateX: rotateXSpring,
          rotateY: rotateYSpring,
          transformStyle: 'preserve-3d',
        }}
        onClick={onClose}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      />
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
  slotRef:      (el: HTMLDivElement | null) => void;
}

function FlipSlot({ order, card, flipped, hideCardFace, onExpand, slotRef }: FlipSlotProps) {
  return (
    <div
      className={`${styles.slot}${flipped && onExpand ? ` ${styles.slotRevealed}` : ''}`}
      ref={slotRef}
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

// Empty placeholder for one of the user's 10 pack cards before the
// stack-overlay flies it home. Visually it's a faint outlined slot so the
// user can spot where the next card will land. ProfileDeckStackOverlay
// reads its bounding rect via slotRef to compute the flight target.
interface EmptySlotProps {
  order:   number;
  slotRef: (el: HTMLDivElement | null) => void;
}

function EmptySlot({ order, slotRef }: EmptySlotProps) {
  return (
    <div
      className={`${styles.slot} ${styles.slotEmpty}`}
      ref={slotRef}
      data-order={order}
      aria-label={`Karte ${order} (noch nicht aufgedeckt)`}
    />
  );
}
