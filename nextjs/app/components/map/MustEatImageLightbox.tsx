'use client';
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  motion,
  useAnimationControls,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import styles from './MustEatImageLightbox.module.css';

export interface MustEatImageLightboxProps {
  imageUrl: string | null;
  alt: string;
  // null = closed; setting it to a DOMRect opens the lightbox and the
  // card flies out from that rect. Reverting to null triggers exit which
  // animates back to the same origin rect.
  originRect: DOMRect | null;
  onClose: () => void;
  // Fires on the exact frame the fly-back clone unmounts. Callers that hide
  // the origin card while the clone is on screen reveal it here — a timer
  // would leave a gap where neither is visible (the slot blinks).
  onExitComplete?: () => void;
  // Called once the dynamically loaded clone is ready to render. Callers keep
  // the origin visible until this fires so a cold chunk load cannot leave an
  // empty slot.
  onOpenReady?: () => void;
  /* Blättern im geöffneten Zoom. Ohne diese Felder bleibt der Zoom, was er
     war: eine Karte, Tippen schließt. Der Aufrufer besitzt die Reihenfolge —
     er kennt seine Liste UND die Slots im Raster, aus denen die Karte
     zurückfliegt. */
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  /** Zählstand für die Leiste, 1-basiert. */
  position?: { index: number; count: number };
}

interface InnerProps {
  imageUrl: string;
  alt: string;
  originRect: DOMRect;
  open: boolean;
  onClose: () => void;
  onClosed: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  position?: { index: number; count: number };
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  );
}

const SWIPE_PX = 60;

// Mirrors profile/ProfileDeck.ExpandedOverlay almost line-for-line so the
// two zoom interactions feel identical: open from origin → settle in centre
// with Apple-style ease-out, pointer-driven 3D-tilt, sheen drifts with
// rotateY, body scroll/touch locked. Click anywhere closes.
const Inner = memo(function Inner({
  imageUrl,
  alt,
  originRect,
  open,
  onClose,
  onClosed,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  position,
}: InnerProps) {
  const canPage = Boolean(onPrev || onNext);
  const cardAspect = originRect.width / originRect.height;
  const maxW = Math.min(420, window.innerWidth * 0.88);
  const maxH = window.innerHeight * 0.78;
  const overlayW = Math.min(maxW, maxH * cardAspect);
  const screenCx = window.innerWidth / 2;
  const screenCy = window.innerHeight / 2;
  const slotCx = originRect.left + originRect.width / 2;
  const slotCy = originRect.top + originRect.height / 2;
  const fromX = slotCx - screenCx;
  const fromY = slotCy - screenCy;
  const fromScale = originRect.width / overlayW;
  const tiltZ = Math.max(-7, Math.min(7, fromX * 0.025));

  const cardRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateXSpring = useSpring(useTransform(pointerY, [-0.5, 0.5], [12, -12]), {
    stiffness: 220,
    damping: 18,
  });
  const rotateYSpring = useSpring(useTransform(pointerX, [-0.5, 0.5], [-14, 14]), {
    stiffness: 220,
    damping: 18,
  });
  const sheenX = useTransform(rotateYSpring, [-14, 14], ['-30%', '30%']);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    pointerX.set((e.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handlePointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  useLayoutEffect(() => {
    dialogRef.current?.focus({ preventScroll: true });
  }, []);

  const [closing, setClosing] = useState(false);
  /* Der Zoom schliesst auf Tippen — ein Wisch darf das nicht ausloesen.
     Gemerkt wird der Anfasspunkt, und ob die letzte Geste ein Wisch war:
     nach einem Zeiger-Wisch feuert der Browser trotzdem noch ein `click`. */
  const downRef = useRef<{ x: number; y: number } | null>(null);
  const swipedRef = useRef(false);
  const dirRef = useRef(1);
  const page = useCallback(
    (d: number) => {
      if (d < 0 && hasPrev) {
        dirRef.current = -1;
        onPrev?.();
      } else if (d > 0 && hasNext) {
        dirRef.current = 1;
        onNext?.();
      }
    },
    [hasPrev, hasNext, onPrev, onNext]
  );
  // Flatten the pointer/gyro 3D-tilt before flying back — the springs would
  // otherwise hold the last tilt through the exit and the card lands skewed
  // against the flat origin card.
  const handleClose = useCallback(() => {
    if (closing) return;
    pointerX.set(0);
    pointerY.set(0);
    setClosing(true);
    onClose();
  }, [closing, onClose, pointerX, pointerY]);

  // Calibrating gyroscope tilt on mobile — first event sets neutral so
  // the phone's resting orientation reads as 0,0. Same pointer values
  // feed the same springs so pointer + gyro compose without conflict.
  const gyroBaseRef = useRef<{ beta: number; gamma: number } | null>(null);
  useEffect(() => {
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      if (!gyroBaseRef.current) {
        gyroBaseRef.current = { beta: e.beta, gamma: e.gamma };
        return;
      }
      const dGamma = e.gamma - gyroBaseRef.current.gamma;
      const dBeta = e.beta - gyroBaseRef.current.beta;
      pointerX.set(Math.max(-0.5, Math.min(0.5, dGamma / 20)));
      pointerY.set(Math.max(-0.5, Math.min(0.5, dBeta / 20)));
    };
    window.addEventListener('deviceorientation', onOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', onOrientation, true);
      gyroBaseRef.current = null;
    };
  }, [pointerX, pointerY]);

  // Lock body scroll + touch so finger-drag tilts the card instead of
  // scrolling the page underneath. iOS Safari otherwise pans the map.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, []);

  /* ── Der Wurf ───────────────────────────────────────────────────────────────
     Geblättert wird wie in einem Deck: die liegende Karte wird schräg zur
     Seite weggezogen, dann kommt die nächste aus der Gegenrichtung
     hereingeflogen und federt gerade. Das Bild hinkt der Auswahl deshalb um
     die Dauer des Abgangs hinterher — `shown` ist der Stand, der wirklich auf
     dem Tisch liegt, `imageUrl` der, der hinsoll.

     Der Wurf sitzt auf dem Clip, nicht auf der Karte: die Karte trägt die
     Fly-In/Fly-Back-Geometrie und die beiden Kipp-Federn, und zwei
     Animationen auf einem `transform` schlagen sich. Der Clip hat kein
     eigenes Overflow über sich, die Karte darf also aus ihrem Kasten
     herausfliegen. */
  /* Der Wurf haengt am PLATZ im Stapel, nicht am Bild: alle verdeckten Karten
     tragen dieselbe Rueckseite, zwei davon hintereinander haetten sonst
     denselben `src` — und die Karte blieb einfach stehen. */
  const pageKey = position ? String(position.index) : imageUrl;
  const [shown, setShown] = useState({ imageUrl, alt, key: pageKey });
  const dealControls = useAnimationControls();
  /* Der globale `prefers-reduced-motion`-Reset in globals.css setzt nur
     CSS-Transitions und -Animationen still; eine framer-motion-Sequenz läuft
     davon unbeirrt weiter. Für den Wurf gilt deshalb dieselbe Abfrage wie im
     Reveal-Overlay nebenan: wer keine Bewegung will, bekommt den Kartentausch
     ohne Flug. */
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (pageKey === shown.key) return;
    if (reducedMotion) {
      setShown({ imageUrl, alt, key: pageKey });
      dealControls.set({ x: 0, rotateZ: 0, scale: 1 });
      return;
    }
    let cancelled = false;
    const dir = dirRef.current;
    void (async () => {
      await dealControls.start({
        x: dir >= 0 ? '-62%' : '62%',
        rotateZ: dir >= 0 ? -9 : 9,
        scale: 0.86,
        transition: { duration: 0.19, ease: [0.4, 0, 1, 1] },
      });
      if (cancelled) return;
      setShown({ imageUrl, alt, key: pageKey });
      dealControls.set({
        x: dir >= 0 ? '62%' : '-62%',
        rotateZ: dir >= 0 ? 9 : -9,
        scale: 0.86,
      });
      /* Bewusst KEINE Feder für den Einflug. Federn erben die Geschwindigkeit
         der vorigen Animation, und die zeigte gerade mit voller Wucht nach
         draußen: gemessen schoss die Karte dadurch auf x −2100px und drehte
         sich um 140°, bevor sie nach ~900ms zurückfand. Eine Kurve mit
         leichtem Überschwung (y > 1 im zweiten Griff) landet dieselbe Geste
         deterministisch. */
      await dealControls.start({
        x: 0,
        rotateZ: 0,
        scale: 1,
        transition: { duration: 0.42, ease: [0.17, 1.06, 0.34, 1] },
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [pageKey, imageUrl, alt, shown.key, dealControls, reducedMotion]);
  /* Beim Zumachen fliegt die KARTE zurück in ihren Slot — ein Wurf, der genau
     dann noch unterwegs ist, würde sie schräg und versetzt landen lassen. */
  useEffect(() => {
    if (open) return;
    dealControls.stop();
    dealControls.set({ x: 0, rotateZ: 0, scale: 1 });
  }, [open, dealControls]);

  // Escape closes; die Pfeiltasten blättern, wenn es etwas zu blättern gibt.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      else if (canPage && e.key === 'ArrowLeft') page(-1);
      else if (canPage && e.key === 'ArrowRight') page(1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleClose, canPage, page]);

  return (
    <motion.div
      ref={dialogRef}
      className={closing ? `${styles.wrapper} ${styles.closing}` : styles.wrapper}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Must Eat'}
      tabIndex={-1}
      onKeyDown={(event) => {
        // The viewer has no separate controls; keep keyboard focus inside the
        // modal until Escape/click closes it.
        if (event.key === 'Tab') {
          event.preventDefault();
          dialogRef.current?.focus({ preventScroll: true });
        }
      }}
    >
      <div className={styles.backdrop} aria-hidden="true" />
      <motion.div
        ref={cardRef}
        className={styles.card}
        initial={{ x: fromX, y: fromY, scale: fromScale, rotateZ: tiltZ }}
        animate={
          open
            ? {
                x: 0,
                y: 0,
                scale: 1,
                rotateZ: 0,
                transition: { duration: 0.46, ease: [0.22, 1, 0.36, 1] },
              }
            : {
                x: fromX,
                y: fromY,
                scale: fromScale,
                rotateZ: 0,
                transition: { duration: 0.34, ease: [0.4, 0, 0.2, 1] },
              }
        }
        // No opacity fade on the way back — the card stays fully visible
        // until it has landed in its slot, then onExitComplete swaps in the
        // origin card on the same frame. A fade made it vanish mid-flight.
        onAnimationComplete={() => {
          if (!open) onClosed();
        }}
        style={{
          rotateX: rotateXSpring,
          rotateY: rotateYSpring,
          transformStyle: 'preserve-3d',
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (swipedRef.current) {
            swipedRef.current = false;
            return;
          }
          handleClose();
        }}
        onPointerDown={(e) => {
          downRef.current = { x: e.clientX, y: e.clientY };
          swipedRef.current = false;
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          const down = downRef.current;
          downRef.current = null;
          if (canPage && down) {
            const dx = e.clientX - down.x;
            const dy = e.clientY - down.y;
            /* Waagerecht und weit genug: blättern statt schliessen. Die
               Achsensperre verhindert, dass ein Daumen, der die Karte nur
               kippt, versehentlich weiterblättert. */
            if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
              swipedRef.current = true;
              page(dx < 0 ? 1 : -1);
              return;
            }
          }
          handleClose();
        }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {/* Inner clip wrapper keeps the sheen's drifting gradient inside
            the card's rounded shape — without it the sheen leaks past
            the right edge at strong rotateY tilts. */}
        <motion.div
          className={styles.clip}
          style={{ width: overlayW }}
          animate={dealControls}
        >
          <img src={shown.imageUrl} alt={shown.alt} className={styles.image} />
          <motion.div className={styles.sheen} style={{ x: sheenX }} aria-hidden="true" />
        </motion.div>
      </motion.div>

      {/* Dieselbe Leiste wie in der Foto-Galerie: ein Pfeil, der Stand, ein
          Pfeil. Sie schluckt ihre eigenen Klicks — der Vorhang darunter
          schliesst den Zoom. */}
      {canPage && position && position.count > 1 && (
        <div
          className={styles.nav}
          onClick={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className={styles.navBtn}
            aria-label="Vorherige Karte"
            disabled={!hasPrev}
            onClick={(e) => {
              e.stopPropagation();
              page(-1);
            }}
          >
            <Chevron dir="left" />
          </button>
          <span className={styles.counter}>
            {position.index} / {position.count}
          </span>
          <button
            type="button"
            className={styles.navBtn}
            aria-label="Nächste Karte"
            disabled={!hasNext}
            onClick={(e) => {
              e.stopPropagation();
              page(1);
            }}
          >
            <Chevron dir="right" />
          </button>
        </div>
      )}
    </motion.div>
  );
});

export default function MustEatImageLightbox({
  imageUrl,
  alt,
  originRect,
  onClose,
  onExitComplete,
  onOpenReady,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  position,
}: MustEatImageLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const openingRef = useRef(false);
  const [rendered, setRendered] = useState<{
    imageUrl: string;
    alt: string;
    originRect: DOMRect;
    open: boolean;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    // The first client commit still returns null while the portal target is
    // being established. Keep the origin visible until the same commit that
    // can render the clone; otherwise a cold import produces a one-frame gap.
    if (!mounted) return;

    if (originRect && imageUrl) {
      if (!openingRef.current) {
        restoreFocusRef.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        openingRef.current = true;
      }
      setRendered({ imageUrl, alt, originRect, open: true });
      onOpenReady?.();
      return;
    }
    // An unlocked ID can briefly outlive its hydrated private fields while
    // map data refreshes. Never create an image clone without a real source.
    if (originRect) return;
    setRendered((current) => (current ? { ...current, open: false } : null));
  }, [alt, imageUrl, mounted, onOpenReady, originRect]);

  if (!mounted) return null;

  return createPortal(
    rendered && (
      <Inner
        key="must-eat-lightbox"
        imageUrl={rendered.imageUrl}
        alt={rendered.alt}
        originRect={rendered.originRect}
        open={rendered.open}
        onPrev={onPrev}
        onNext={onNext}
        hasPrev={hasPrev}
        hasNext={hasNext}
        position={position}
        onClose={onClose}
        onClosed={() => {
          setRendered(null);
          openingRef.current = false;
          onExitComplete?.();
          const restoreTarget = restoreFocusRef.current;
          restoreFocusRef.current = null;
          window.requestAnimationFrame(() => restoreTarget?.focus({ preventScroll: true }));
        }}
      />
    ),
    document.body
  );
}
