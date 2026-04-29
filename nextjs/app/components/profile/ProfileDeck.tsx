'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { openWelcomePack } from '@/lib/firebase/welcomePack';
import type { MustEatAlbumCard } from '@/lib/types';
import type { BoosterPack } from '@/lib/firebase/usePack';
import styles from './ProfileDeck.module.css';

const TOTAL_SLOTS    = 150;
const SCROLL_PAUSE_MS = 650;
const FLIP_DURATION_S = 0.7;
const POST_FLIP_PAUSE_MS = 850;

interface Props {
  pack:     BoosterPack;
  mustEats: MustEatAlbumCard[];
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function ProfileDeck({ pack, mustEats }: Props) {
  const { user } = useAuth();

  // pack.mustEatIds → look up the full card data, drop any with no order
  const packCardsByOrder = useMemo(() => {
    const map = new Map<number, MustEatAlbumCard>();
    for (const id of pack.mustEatIds) {
      const card = mustEats.find((m) => m._id === id);
      if (card && typeof card.order === 'number') {
        map.set(card.order, card);
      }
    }
    return map;
  }, [pack.mustEatIds, mustEats]);

  const sortedPackOrders = useMemo(
    () => Array.from(packCardsByOrder.keys()).sort((a, b) => a - b),
    [packCardsByOrder],
  );

  // Set of order numbers currently flipped to "front". On first paint:
  // - if pack.opened === true → all pack-card orders pre-revealed (no anim)
  // - if pack.opened === false → empty Set, animation runs
  const [revealed, setRevealed] = useState<Set<number>>(() =>
    pack.opened ? new Set(packCardsByOrder.keys()) : new Set(),
  );

  const slotRefs   = useRef<Map<number, HTMLDivElement>>(new Map());
  const triggered  = useRef(false);

  useEffect(() => {
    if (pack.opened || triggered.current) return;
    if (!user) return;
    if (sortedPackOrders.length === 0) return;
    triggered.current = true;

    // Mark the pack as opened in Firestore. Rules permit only the
    // false → true transition; failures are non-fatal for the animation.
    openWelcomePack(user.uid, pack.id).catch((err) => {
      console.error('[profile-deck] openWelcomePack failed:', err);
    });

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
    })();

    return () => {
      cancelled = true;
    };
  }, [pack.opened, pack.id, sortedPackOrders, user]);

  return (
    <div className={styles.albumGrid}>
      {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
        const order = i + 1;
        const card  = packCardsByOrder.get(order);
        if (card) {
          return (
            <FlipSlot
              key={order}
              order={order}
              card={card}
              flipped={revealed.has(order)}
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
  );
}

// ── Slot variants ──────────────────────────────────────────────────────

interface FlipSlotProps {
  order:   number;
  card:    MustEatAlbumCard;
  flipped: boolean;
  slotRef: (el: HTMLDivElement | null) => void;
}

function FlipSlot({ order, card, flipped, slotRef }: FlipSlotProps) {
  return (
    <div className={styles.slot} ref={slotRef} data-order={order}>
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
          className={`${styles.face} ${styles.faceFront}`}
          loading={flipped ? 'eager' : 'lazy'}
        />
      </motion.div>
    </div>
  );
}

function BackSlot() {
  return (
    <div className={styles.slot}>
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
