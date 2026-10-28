'use client';
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { useLocale } from 'next-intl';
import { whenImageReady } from '@/lib/dom/imageReady';
import {
  DEAL_IN_DELAY_MS,
  DEAL_IN_EASE,
  DEAL_IN_MS,
  DEAL_OUT_EASE,
  DEAL_OUT_MS,
  DEAL_TILT_DEG,
} from '@/lib/cardDeal';
import styles from './MustEatImageLightbox.module.css';
import ZoomCurtain from './ZoomCurtain';

export interface MustEatImageLightboxProps {
  imageUrl: string | null;
  alt: string;
  /* Was die Karte im Raster gerade zeigt (`currentSrc` des Slot-Bilds). Ein
     Raster aus Daumennaegeln hat das grosse `imageUrl` nie geladen — ohne
     Platzhalter flog die Karte leer heraus und fuellte sich erst nach dem
     Download. Mit ihm fliegt der Daumennagel, und das grosse Bild loest ihn
     ab, sobald es dekodiert ist. Gilt nur fuer die erste Karte, nicht fuers
     Blaettern. */
  placeholderUrl?: string | null;
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
  /* Ein Ausgang unter der Karte — als Slot, damit diese Komponente nicht
     weiss, wohin. Der Zoom war bis zum 04.09.2026 eine Sackgasse: eine
     verdeckte Karte zeigte ihre Rueckseite gross, und der einzige Weg
     weiter war Zumachen (Nutzer, 04.09.2026). Wer den Slot fuellt,
     entscheidet auch, wann er erscheint. */
  action?: React.ReactNode;
}

interface InnerProps {
  imageUrl: string;
  alt: string;
  placeholderUrl?: string | null;
  originRect: DOMRect;
  open: boolean;
  onClose: () => void;
  onClosed: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  position?: { index: number; count: number };
  /** Platz im Stapel, der zu `imageUrl` gehört — gemeinsam mit dem Bild
   *  gesetzt, damit Wurf und Bild nie auseinanderlaufen. */
  pageIndex?: number;
  action?: React.ReactNode;
}

const SWIPE_PX = 60;
/** Neigung der Karte unter dem Finger, Grad je Pixel. */
const DRAG_TILT = 0.04;

// Open from origin → settle in centre with Apple-style ease-out,
// pointer-driven 3D-tilt, body scroll/touch locked. Click anywhere closes.
// Kein Glanz-Overlay auf der Karte: ein weisser Verlauf im Overlay-Modus hat
// das Foto beim Kippen stellenweise ausgebleicht — die Farben bleiben, wie
// sie sind, nur die Karte bewegt sich.
const Inner = memo(function Inner({
  imageUrl,
  alt,
  placeholderUrl,
  originRect,
  open,
  onClose,
  onClosed,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  position,
  pageIndex,
  action,
}: InnerProps) {
  const english = useLocale() === 'en';
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

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el || draggingRef.current) return;
    /* Ein Finger, der eher waagerecht zieht, blättert — er kippt nicht. Sonst
       stand die Karte schon schief, bevor der Wisch als Wisch erkannt war. */
    const down = downRef.current;
    if (canPage && down && e.pointerType !== 'mouse') {
      if (Math.abs(e.clientX - down.x) >= Math.abs(e.clientY - down.y)) return;
    }
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
     nach einem Zeiger-Wisch feuert der Browser trotzdem noch ein `click`.

     Die Geste haengt am VORHANG, nicht an der Karte: auf dem Telefon fasst der
     Daumen beim Wischen oft neben die Karte, und ein Wisch, der auf dem
     Vorhang beginnt, muss genauso blaettern (Nutzer, 02.09.2026). Das `click`
     der Karte steigt ohnehin zum Vorhang auf — ein Handler fuer beides. */
  const downRef = useRef<{ x: number; y: number } | null>(null);
  const swipedRef = useRef(false);
  /* Waagerecht gezogen folgt die Karte dem Finger und neigt sich mit — wie
     eine Karte, die man vom Tisch zieht. Solange gezogen wird, ruht das
     3D-Kippen: es nahm den Wisch als Kippgeste und warf die Karte schief
     hinaus (gemessen bis 14° um die Hochachse). */
  const draggingRef = useRef(false);
  const dealX = useMotionValue(0);
  const dealRotate = useMotionValue(0);
  const reducedMotion = useReducedMotion();
  const springBack = () => {
    const back = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };
    void animate(dealX, 0, back);
    void animate(dealRotate, 0, back);
  };
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    downRef.current = { x: e.clientX, y: e.clientY };
    swipedRef.current = false;
    draggingRef.current = false;
  };
  const handleDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const down = downRef.current;
    if (!canPage || !down || reducedMotion) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    if (!draggingRef.current) {
      if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;
      draggingRef.current = true;
      pointerX.set(0);
      pointerY.set(0);
      rotateXSpring.jump(0);
      rotateYSpring.jump(0);
    }
    dealX.stop();
    dealRotate.stop();
    dealX.set(dx);
    dealRotate.set(dx * DRAG_TILT);
  };
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const down = downRef.current;
    const dragged = draggingRef.current;
    downRef.current = null;
    draggingRef.current = false;
    if (!canPage || !down) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    /* Waagerecht und weit genug: blaettern statt schliessen. Die Achsensperre
       verhindert, dass ein Daumen, der die Karte nur kippt, versehentlich
       weiterblaettert. Am Stapelende blaettert `page` nicht — der Wisch bleibt
       trotzdem ein Wisch und schliesst nichts, die Karte federt zurueck. */
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
      swipedRef.current = true;
      if (page(dx < 0 ? 1 : -1)) return;
    }
    if (dragged) springBack();
  };
  const handlePointerCancel = () => {
    downRef.current = null;
    if (draggingRef.current) springBack();
    draggingRef.current = false;
  };
  const handleWrapperClick = () => {
    if (swipedRef.current) {
      swipedRef.current = false;
      return;
    }
    handleClose();
  };
  const dirRef = useRef(1);
  const page = useCallback(
    (d: number) => {
      if (d < 0 && hasPrev) {
        dirRef.current = -1;
        onPrev?.();
        return true;
      }
      if (d > 0 && hasNext) {
        dirRef.current = 1;
        onNext?.();
        return true;
      }
      return false;
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
     Geblättert wird wie in einem Deck: die liegende Karte fliegt schräg zur
     Seite aus dem Bild, und WÄHREND sie fliegt, kommt die nächste aus der
     Gegenrichtung herein und landet gerade (lib/cardDeal). Bis 27.10.2026
     lief das nacheinander, dazwischen stand der Vorhang leer.

     Die abfahrende Karte ist ein eigener Clip (`leaving`) mit dem Bild, das
     eben noch zu sehen war; der feste Clip trägt sofort das neue Bild und
     wartet draußen, bis es zeichenbar ist — er kommt nie leer und nie mit dem
     alten Bild herein (lib/dom/imageReady).

     Der Wurf sitzt auf den Clips, nicht auf der Karte: die Karte trägt die
     Fly-In/Fly-Back-Geometrie und die beiden Kipp-Federn, und zwei
     Animationen auf einem `transform` schlagen sich. Der Clip hat kein
     eigenes Overflow über sich, die Karte darf also aus ihrem Kasten
     herausfliegen. */
  /* Der Wurf haengt am PLATZ im Stapel, nicht am Bild: alle verdeckten Karten
     tragen dieselbe Rueckseite, zwei davon hintereinander haetten sonst
     denselben `src` — und die Karte blieb einfach stehen. */
  const pageKey = pageIndex !== undefined ? String(pageIndex) : imageUrl;
  const [shown, setShown] = useState({ imageUrl, alt, key: pageKey });
  const [leaving, setLeaving] = useState<{
    id: number;
    imageUrl: string;
    fromX: number;
    fromRotate: number;
    toX: number;
    toRotate: number;
  } | null>(null);
  /* Zählt die Würfe; ein Bild, das erst nach dem nächsten Wurf oder nach dem
     Zumachen fertig wird, startet keine Einfahrt mehr. */
  const dealTokenRef = useRef(0);
  /* Der Platzhalter haelt nur fuer das Bild, mit dem der Zoom aufging. Der
     Deckel ist grosszuegig: laeuft er ab, stuende sonst ein leeres <img> da,
     wo eben noch der Daumennagel lag. */
  const [placeholderFor] = useState(placeholderUrl ? imageUrl : null);
  const [sharpUrl, setSharpUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!placeholderFor) return;
    let cancelled = false;
    void whenImageReady(placeholderFor, 20_000).then(() => {
      if (!cancelled) setSharpUrl(placeholderFor);
    });
    return () => {
      cancelled = true;
    };
  }, [placeholderFor]);
  const showPlaceholder =
    placeholderUrl && shown.imageUrl === placeholderFor && sharpUrl !== placeholderFor;
  const displayImageUrl = showPlaceholder ? placeholderUrl : shown.imageUrl;
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (pageKey === shown.key) return;
    const token = ++dealTokenRef.current;
    /* Der globale `prefers-reduced-motion`-Reset in globals.css setzt nur
       CSS-Transitions und -Animationen still; eine framer-motion-Sequenz
       läuft davon unbeirrt weiter. Wer keine Bewegung will, bekommt den
       Kartentausch deshalb ohne Flug — sobald das neue Bild zeichenbar ist,
       sonst stünde dort kurz eine leere Karte. */
    if (reducedMotion) {
      void whenImageReady(imageUrl).then(() => {
        if (token !== dealTokenRef.current) return;
        setLeaving(null);
        setShown({ imageUrl, alt, key: pageKey });
        dealX.set(0);
        dealRotate.set(0);
      });
      return;
    }
    const sign = dirRef.current >= 0 ? 1 : -1;
    // Ganz aus dem Bild, samt Neigung — auch am breiten Desktop.
    const out = (window.innerWidth + overlayW) / 2 + 48;
    setLeaving({
      id: token,
      imageUrl: displayImageUrl,
      fromX: dealX.get(),
      fromRotate: dealRotate.get(),
      toX: -sign * out,
      toRotate: -sign * DEAL_TILT_DEG,
    });
    setShown({ imageUrl, alt, key: pageKey });
    dealX.stop();
    dealRotate.stop();
    dealX.set(sign * out);
    dealRotate.set(sign * DEAL_TILT_DEG);
    void whenImageReady(imageUrl).then(() => {
      if (token !== dealTokenRef.current) return;
      const land = {
        duration: DEAL_IN_MS / 1000,
        delay: DEAL_IN_DELAY_MS / 1000,
        ease: DEAL_IN_EASE,
      };
      void animate(dealX, 0, land);
      void animate(dealRotate, 0, land);
    });
  }, [pageKey, imageUrl, alt, shown.key, displayImageUrl, overlayW, dealX, dealRotate, reducedMotion]);
  /* Beim Zumachen fliegt die KARTE zurück in ihren Slot — ein Wurf, der genau
     dann noch unterwegs ist, würde sie schräg und versetzt landen lassen. */
  useEffect(() => {
    if (open) return;
    dealTokenRef.current += 1;
    dealX.stop();
    dealRotate.stop();
    dealX.set(0);
    dealRotate.set(0);
    setLeaving(null);
  }, [open, dealX, dealRotate]);

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
      onClick={handleWrapperClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handleDragMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Must Eat'}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
          ) ?? []
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (document.activeElement === dialogRef.current) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <ZoomCurtain className={styles.backdrop} />
      <button
        type="button"
        className={styles.close}
        aria-label={english ? 'Close enlarged view' : 'Großansicht schließen'}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          handleClose();
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
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
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {/* Die abfahrende Karte steht VOR dem festen Clip im DOM: unter
            `preserve-3d` zählt die Reihenfolge, die einfahrende liegt oben. */}
        {leaving && (
          <motion.div
            key={leaving.id}
            className={`${styles.clip} ${styles.clipLeaving}`}
            style={{ width: overlayW }}
            aria-hidden="true"
            initial={{ x: leaving.fromX, rotateZ: leaving.fromRotate }}
            animate={{ x: leaving.toX, rotateZ: leaving.toRotate }}
            transition={{ duration: DEAL_OUT_MS / 1000, ease: DEAL_OUT_EASE }}
            onAnimationComplete={() =>
              setLeaving((current) => (current?.id === leaving.id ? null : current))
            }
          >
            <img src={leaving.imageUrl} alt="" className={styles.image} />
          </motion.div>
        )}
        {/* Inner clip wrapper keeps the card's rounded shape while it deals. */}
        <motion.div
          className={styles.clip}
          style={{ width: overlayW, x: dealX, rotateZ: dealRotate }}
        >
          {/* Ein eigenes <img> pro Karte — ein wiederverwendetes zeigt nach dem
              `src`-Wechsel weiter das alte Bild. */}
          {failedImageUrl === displayImageUrl ? (
            <div className={styles.imageFailure} role="status">
              <p>{english ? 'The card image could not be loaded.' : 'Das Kartenbild konnte nicht geladen werden.'}</p>
              <button type="button" className="et-btn et-btn-alt et-btn-sm" onClick={(event) => {
                event.stopPropagation();
                setFailedImageUrl(null);
              }}>{english ? 'Try again' : 'Erneut versuchen'}</button>
            </div>
          ) : (
            <img
              key={showPlaceholder ? `${shown.key}:placeholder` : shown.key}
              src={displayImageUrl}
              alt={shown.alt}
              className={styles.image}
              onError={(event) => {
                const image = event.currentTarget;
                if (image.dataset.retried) {
                  setFailedImageUrl(displayImageUrl);
                  return;
                }
                image.dataset.retried = 'true';
                const separator = displayImageUrl.includes('?') ? '&' : '?';
                image.src = `${displayImageUrl}${separator}retry=1`;
              }}
            />
          )}
        </motion.div>
      </motion.div>

      {/* Der Ausgang, wenn der Aufrufer einen mitgibt. Wie die Blaetterleiste
          schluckt er seine eigenen Zeiger-Ereignisse: der Vorhang darunter
          schliesst den Zoom, und ein Wisch, der auf dem Knopf beginnt, darf
          nicht blaettern. */}
      {action && (
        <div
          className={styles.action}
          onClick={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {action}
        </div>
      )}

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
            aria-label={english ? 'Previous card' : 'Vorherige Karte'}
            disabled={!hasPrev}
            onClick={(e) => {
              e.stopPropagation();
              page(-1);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M19 12H5m6-6-6 6 6 6" />
            </svg>
          </button>
          <span className={styles.counter}>
            {position.index} / {position.count}
          </span>
          <button
            type="button"
            className={styles.navBtn}
            aria-label={english ? 'Next card' : 'Nächste Karte'}
            disabled={!hasNext}
            onClick={(e) => {
              e.stopPropagation();
              page(1);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </button>
        </div>
      )}
    </motion.div>
  );
});

export default function MustEatImageLightbox({
  imageUrl,
  alt,
  placeholderUrl,
  originRect,
  onClose,
  onExitComplete,
  onOpenReady,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  position,
  action,
}: MustEatImageLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const openingRef = useRef(false);
  const [rendered, setRendered] = useState<{
    imageUrl: string;
    alt: string;
    placeholderUrl?: string | null;
    originRect: DOMRect;
    open: boolean;
    pageIndex?: number;
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
      setRendered({
        imageUrl,
        alt,
        placeholderUrl,
        originRect,
        open: true,
        pageIndex: position?.index,
      });
      onOpenReady?.();
      return;
    }
    // An unlocked ID can briefly outlive its hydrated private fields while
    // map data refreshes. Never create an image clone without a real source.
    if (originRect) return;
    setRendered((current) => (current ? { ...current, open: false } : null));
  }, [alt, imageUrl, placeholderUrl, mounted, onOpenReady, originRect, position?.index]);

  if (!mounted) return null;

  return createPortal(
    rendered && (
      <Inner
        key="must-eat-lightbox"
        imageUrl={rendered.imageUrl}
        alt={rendered.alt}
        placeholderUrl={rendered.placeholderUrl}
        originRect={rendered.originRect}
        open={rendered.open}
        onPrev={onPrev}
        onNext={onNext}
        hasPrev={hasPrev}
        hasNext={hasNext}
        position={position}
        pageIndex={rendered.pageIndex}
        action={action}
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
