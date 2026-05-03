'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { openWelcomePack } from '@/lib/firebase/welcomePack';
import type { MustEatAlbumCard } from '@/lib/types';
import type { BoosterPack } from '@/lib/firebase/usePack';
import ProfileDeckHeader from './ProfileDeckHeader';
import styles from './ProfileDeck.module.css';

const TOTAL_SLOTS        = 150;
const SCROLL_PAUSE_MS    = 650;
const FLIP_DURATION_S    = 0.7;
const POST_FLIP_PAUSE_MS = 850;
const CLOSE_DURATION_S   = 0.32;

interface Props {
  pack:     BoosterPack;
  mustEats: MustEatAlbumCard[];
}

interface ExpandedState {
  card:  MustEatAlbumCard;
  rect:  DOMRect;
  order: number;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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

  const sortedPackOrders = useMemo(
    () => Array.from(packCardsByOrder.keys()).sort((a, b) => a - b),
    [packCardsByOrder],
  );

  // All pack cards start revealed if pack is already opened (returning user).
  const [revealed, setRevealed] = useState<Set<number>>(() =>
    pack.opened ? new Set(packCardsByOrder.keys()) : new Set(),
  );

  // Card that the user tapped to expand (null = none).
  const [expanded, setExpanded] = useState<ExpandedState | null>(null);
  // Order of the slot whose front-face should be hidden while the card is
  // in the lightbox or still animating back (prevents the "ghost" duplicate).
  const [hiddenSlotOrder, setHiddenSlotOrder] = useState<number | null>(null);

  const slotRefs  = useRef<Map<number, HTMLDivElement>>(new Map());
  const triggered = useRef(false);

  useEffect(() => {
    if (pack.opened || triggered.current) return;
    if (!user) return;
    if (sortedPackOrders.length === 0) return;
    triggered.current = true;

    let cancelled = false;
    (async () => {
      for (const order of sortedPackOrders) {
        if (cancelled) return;
        const el = slotRefs.current.get(order);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(SCROLL_PAUSE_MS);
        if (cancelled) return;
        setRevealed((prev) => {
          const next = new Set(prev);
          next.add(order);
          return next;
        });
        await sleep(POST_FLIP_PAUSE_MS);
      }
      // Mark opened only after the full animation so the snapshot update
      // (opened → true) doesn't cancel the loop via effect cleanup. Also
      // auto-unlocks the pack's cards on the map (batched inside the call).
      if (!cancelled) {
        openWelcomePack(user.uid, pack.mustEatIds, pack.id).catch((err) => {
          console.error('[profile-deck] openWelcomePack failed:', err);
        });
      }
    })();

    return () => { cancelled = true; };
  }, [pack.opened, pack.id, sortedPackOrders, user]);

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
      <div className={styles.albumGrid}>
        {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
          const order = i + 1;
          const card  = packCardsByOrder.get(order);
          const isRevealed = revealed.has(order);

          if (card) {
            return (
              <FlipSlot
                key={order}
                order={order}
                card={card}
                flipped={isRevealed}
                hideCardFace={hiddenSlotOrder === order}
                onExpand={isRevealed ? (rect) => {
                    setHiddenSlotOrder(order);
                    setExpanded({ card, rect, order });
                  } : undefined}
                slotRef={(el) => {
                  if (el) slotRefs.current.set(order, el);
                  else slotRefs.current.delete(order);
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
        src={expanded.card.imageUrl}
        alt={expanded.card.dish}
        className={styles.lightboxImg}
        initial={{ x: fromX, y: fromY, scale: fromScale, rotateZ: tiltZ, opacity: 1 }}
        animate={{
          x: 0, y: 0, scale: 1, rotateZ: 0, opacity: 1,
          transition: { type: 'spring', stiffness: 280, damping: 26 },
        }}
        // Critically-damped spring back to the slot, plus a delayed opacity
        // fade in the final 70 ms. The slot card is revealed at the start of
        // the fade — both sit at the same position with the same image, so
        // the crossfade hides any sub-pixel misalignment between the
        // transform-scaled lightbox img and the natively-sized slot face.
        exit={{
          x: fromX, y: fromY, scale: fromScale, rotateZ: 0, opacity: 0,
          transition: {
            default: { type: 'spring', stiffness: 360, damping: 40, mass: 0.9 },
            opacity: { delay: 0.22, duration: 0.07, ease: 'linear' },
          },
        }}
        style={{ position: 'relative', zIndex: 1 }}
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
      onClick={onExpand ? (e) => onExpand((e.currentTarget as HTMLDivElement).getBoundingClientRect()) : undefined}
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
