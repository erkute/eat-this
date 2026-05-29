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
import { selectTeaserOrders } from '@/lib/profile/teasers';
import ProfileDeckHeader from './ProfileDeckHeader';
import ProfileReferralCard from './ProfileReferralCard';
import MustEatRevealOverlay from '../map/MustEatRevealOverlay';
import styles from './ProfileDeck.module.css';

const TOTAL_SLOTS        = 150;
const FLIP_DURATION_S    = 0.7;
// The first N teaser reveals (ever) play the cinematic fly-to-centre overlay.
const CINEMATIC_LIMIT    = 2;

interface Props {
  mustEats:       MustEatAlbumCard[];
  mapUnlockedIds: Set<string>;
  unlock:         (mustEatId: string, restaurantId: string, dish: string) => Promise<void>;
}

interface ExpandedState {
  card:  MustEatAlbumCard;
  rect:  DOMRect;
  order: number;
}

export default function ProfileDeck({ mustEats, mapUnlockedIds, unlock }: Props) {
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

  // Every card keyed by its grid slot — superset of mapUnlockedByOrder, used
  // to render teaser slots (which are NOT yet unlocked) at their slot.
  const cardByOrder = useMemo(() => {
    const map = new Map<number, MustEatAlbumCard>();
    for (const c of mustEats) {
      if (typeof c.order === 'number') map.set(c.order, c);
    }
    return map;
  }, [mustEats]);

  // Slot orders that should render as tappable teaser cards.
  const teaserOrders = useMemo(
    () => selectTeaserOrders(mustEats, mapUnlockedIds),
    [mustEats, mapUnlockedIds],
  );

  // Hint inviting a tap — visible the whole time there are still un-revealed
  // teaser cards (the user asked for an always-present cue, not a subtle
  // one-shot). Disappears once every teaser has been revealed.
  const showHint = teaserOrders.size > 0;

  // The first TWO teaser reveals (ever) play the cinematic fly-to-centre
  // overlay reused from the map's proximity reveal; subsequent reveals use the
  // inline flip. Count persisted via localStorage.
  const [cinematicCount, setCinematicCount] = useState(CINEMATIC_LIMIT); // SSR-safe: assume done until storage read
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const n = parseInt(localStorage.getItem('deckCinematicCount') ?? '0', 10);
    setCinematicCount(Number.isFinite(n) ? n : 0);
  }, []);
  const cinematicArmed = cinematicCount < CINEMATIC_LIMIT;
  // The slot currently playing the cinematic (null = none). While set, that
  // slot renders a plain card-back so it doesn't duplicate the flying overlay.
  const [cinematic, setCinematic] = useState<{ card: MustEatAlbumCard; rect: DOMRect; order: number } | null>(null);
  // Stable fly-out target (the tapped slot) so the overlay flies BACK to its
  // place. Memoised so the overlay's phase timers don't reset on re-render.
  const cinematicTarget = useMemo(
    () => cinematic
      ? {
          cx: cinematic.rect.left + cinematic.rect.width / 2,
          cy: cinematic.rect.top + cinematic.rect.height / 2,
          size: cinematic.rect.width,
        }
      : undefined,
    [cinematic],
  );

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

  // Teaser tap → persist the unlock. The hook updates mapUnlockedIds, which
  // recomputes mapUnlockedByOrder, and the effect above promotes the order
  // into `revealed` — so the slot re-renders as a face-up FlipSlot. We let
  // the promise reject on failure so the TeaserSlot can roll its flip back.
  const handleReveal = useCallback(async (card: MustEatAlbumCard) => {
    // restaurantId is guaranteed by selectTeaserOrders; throw (not a silent
    // return) if it's ever missing, so the TeaserSlot rolls its flip back
    // instead of showing a "revealed" card that was never persisted.
    if (!card.restaurantId) throw new Error(`Must-eat ${card._id} has no restaurantId`);
    await unlock(card._id, card.restaurantId, card.dish);
  }, [unlock]);

  // First-reveal tap → play the cinematic instead of the inline flip. Persist
  // the unlock right away (like the map: the overlay is purely cosmetic) so
  // that once the overlay clears, the slot is already a face-up FlipSlot.
  const handleCinematicReveal = useCallback((card: MustEatAlbumCard, rect: DOMRect) => {
    if (typeof card.order !== 'number') return;
    setCinematicCount((c) => {
      const next = c + 1;
      if (typeof window !== 'undefined') localStorage.setItem('deckCinematicCount', String(next));
      return next;
    });
    setCinematic({ card, rect, order: card.order });
    void handleReveal(card).catch(() => {});
  }, [handleReveal]);

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

      {showHint && (
        <motion.p
          className={styles.revealHint}
          initial={{ y: -10 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          Tipp die wackelnden Karten an und deck deine Must Eats auf.
        </motion.p>
      )}

      <div className={styles.albumGrid}>
        {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
          const order = i + 1;
          const card  = cardByOrder.get(order);
          // While the first-reveal cinematic plays for this slot, render a
          // plain card-back so the slot doesn't duplicate the flying overlay
          // card. Once the overlay clears, the already-persisted unlock turns
          // this slot into a face-up FlipSlot.
          if (cinematic && cinematic.order === order) {
            // Empty slot while the cinematic plays — the card has "lifted out"
            // of its place and is flying in the overlay; it flies back into
            // this empty space when the animation finishes.
            return <div key={order} className={styles.slot} />;
          }
          // Treat a card already in mapUnlockedIds as revealed THIS render —
          // not only after the `revealed`-set effect runs post-paint. Without
          // this, a freshly-unlocked teaser drops out of `teaserOrders` before
          // `revealed` catches up, flashing a card-back BackSlot for one frame
          // between the face-up teaser and the face-up FlipSlot.
          const isRevealed = revealed.has(order) || (!!card && mapUnlockedIds.has(card._id));

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
          if (card && teaserOrders.has(order)) {
            return (
              <TeaserSlot
                key={order}
                order={order}
                card={card}
                cinematic={cinematicArmed}
                onReveal={handleReveal}
                onCinematic={handleCinematicReveal}
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

      {cinematic && (
        <MustEatRevealOverlay
          imageUrl={cinematic.card.imageUrl}
          alt={cinematic.card.dish}
          originRect={cinematic.rect}
          flyOutTarget={cinematicTarget}
          onDone={() => setCinematic(null)}
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

interface TeaserSlotProps {
  order:       number;
  card:        MustEatAlbumCard;
  // When true, a tap delegates to the parent's cinematic overlay instead of
  // the inline flip (used for the user's first-ever reveal).
  cinematic:   boolean;
  onReveal:    (card: MustEatAlbumCard) => Promise<void>;
  onCinematic: (card: MustEatAlbumCard, rect: DOMRect) => void;
}

// Sanity-flagged teaser: idle-shakes to invite a tap, then flips face-up and
// persists the unlock ON flip-completion — so the full 0.7s flip always plays
// before the parent swaps this slot for a face-up FlipSlot (both end at
// rotateY 180°, so the swap is seamless). On failure we flip back. revealedRef
// guards against a double-trigger from rapid taps or the rollback animation's
// own completion event.
function TeaserSlot({ order, card, cinematic, onReveal, onCinematic }: TeaserSlotProps) {
  const [flipped, setFlipped] = useState(false);
  const [busy,    setBusy]    = useState(false);
  const revealedRef = useRef(false);

  // First-ever reveal → hand off to the cinematic overlay; otherwise inline flip.
  const activate = (el: HTMLDivElement) => {
    if (cinematic) { onCinematic(card, el.getBoundingClientRect()); return; }
    if (busy || flipped) return;
    setFlipped(true);            // optimistic flip; persistence runs on completion
  };

  // Fires when the flip reaches 180° (and again if a rollback returns it to 0°).
  const handleFlipComplete = async () => {
    if (!flipped || busy || revealedRef.current) return;
    revealedRef.current = true;
    setBusy(true);
    try {
      await onReveal(card);
      // success → parent re-renders this slot as a FlipSlot, already at 180°.
    } catch {
      revealedRef.current = false;
      setFlipped(false);         // rollback — unlock failed
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`${styles.slot} ${styles.slotTeaser}${flipped ? '' : ` ${styles.slotIdleShake}`}`}
      data-order={order}
      role="button"
      tabIndex={0}
      aria-busy={busy}
      aria-label={`Karte aufdecken: ${card.dish}`}
      onClick={(e) => activate(e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(e.currentTarget); }
      }}
    >
      <motion.div
        className={styles.flipper}
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: FLIP_DURATION_S, ease: [0.4, 0.0, 0.2, 1] }}
        onAnimationComplete={handleFlipComplete}
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
          loading="lazy"
        />
      </motion.div>
    </div>
  );
}

function BackSlot() {
  return (
    <div className={`${styles.slot} ${styles.slotBack}`}>
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
