'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { whenImageReady } from '@/lib/dom/imageReady';
import { normalizeName } from '@/lib/normalizeName';
import type { RevealStatus } from './useMustEatDetailState';
import styles from './MustEatRevealOverlay.module.css';

/* Aufdecken in drei Takten, wie ein Pack, das man aufreißt (Betreiber,
   24.09.2026: „das muss befriedigender sein").

   1. Spannung (`lift`, `charge`): die Karte hebt sich auf eine dunkle Bühne,
      die sich aus ihr heraus öffnet, und zittert immer stärker, während Licht
      hinter ihr hervorsickert. Diese Phase deckt die Wartezeit auf den Server
      ab — sie dauert mindestens CHARGE_MIN_MS, auch wenn die Antwort sofort
      da ist, sonst fehlt der Anlauf.
   2. Knall (`flip`): kurz zurückholen, eine entschlossene Drehung, die Karte
      schlägt mit dem Gericht nach oben auf — und genau dann Strahlen,
      Schockwelle, Konfetti, Vibration.
   3. Beute (`show`): unter der Karte, auf der Bühne und nicht im Namensfeld
      des Sheets, steht, was man bekommen hat, und der Zähler der Sammlung
      tickt eins hoch. Lange genug zum Lesen; ein Tipp geht früher weiter.
      Dann fliegt die Karte in ihren Platz im Sheet und die Bühne schließt
      sich um sie (`collect`).

   Scheitert das Speichern, legt `abort` die Karte verdeckt zurück. */
type Phase = 'lift' | 'charge' | 'flip' | 'show' | 'collect' | 'abort' | 'done';

const LIFT_MS = 460;
const CHARGE_MIN_MS = 1100;
// Synchron halten mit .flipperFlip (Dauer, Aufschlag bei 88 %).
const FLIP_MS = 1150;
const SLAM_MS = 1010;
const SHOW_MS = 3600;
// Ein Tipp beendet die Beute erst, wenn die Zeilen stehen — sonst schluckt
// ein nervöser Doppeltipp den ganzen Moment.
const SKIP_AFTER_MS = 800;
const COUNT_TICK_MS = 700;
const COLLECT_MS = 640;
// Match the freigestellt card art (1539×2115) so the contained card fills the
// overlay box without letterbox margins — and is never cropped.
const CARD_ASPECT = 2115 / 1539;
// Platz unter der Karte für Kicker, Gericht und Zähler.
const CAPTION_H = 150;
const CAPTION_GAP = 26;

/* Konfetti: feste Streuung statt Math.random — dieselbe Explosion bei jedem
   Aufdecken, und Tests sehen dasselbe wie das Auge. Quadrate wie das gelbe
   Marken-Quadrat vor jedem Titel. */
const SPARKS = (() => {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  return Array.from({ length: 26 }, (_, i) => {
    const angle = (i / 26) * Math.PI * 2 + (rnd() - 0.5) * 0.5;
    const dist = 0.75 + rnd() * 0.95;
    return {
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      size: 6 + Math.round(rnd() * 7),
      rot: Math.round((rnd() - 0.5) * 900),
      delay: Math.round(rnd() * 90),
      white: i % 3 === 0,
    };
  });
})();

function vibrate(pattern: number | number[]) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(pattern);
}

interface Props {
  imageUrl: string;
  dish: string;
  originRect: DOMRect;
  status: RevealStatus;
  /** Stand der Sammlung MIT dieser Karte — der Zähler tickt von count − 1
   *  auf count. Fehlt er, bleibt die Zeile weg. */
  collection?: { count: number; total: number };
  /** Die Bühne deckt das Sheet jetzt ganz ab — bis zum Heimflug. */
  onCovered: () => void;
  onDone: () => void;
  onAbort: () => void;
}

export default function MustEatRevealOverlay({
  imageUrl,
  dish,
  originRect,
  status,
  collection,
  onCovered,
  onDone,
  onAbort,
}: Props) {
  const tMap = useTranslations('map');
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>('lift');
  const [counted, setCounted] = useState(false);
  const reducedMotion = useReducedMotion();
  const finished = useRef(false);
  const chargeStartedAt = useRef(0);
  const showStartedAt = useRef(0);
  // Die Rückrufe kommen als Inline-Funktionen. In den Abhängigkeiten der
  // Phasen-Uhr startete jedes Neu-Rendern des Sheets deren Timer neu.
  const callbacks = useRef({ onCovered, onDone, onAbort });
  callbacks.current = { onCovered, onDone, onAbort };

  // Pointer + gyroscope tilt while the prize is on show — same recipe as the
  // must-eat zoom: pointer/gyro feed the motion values, soft springs turn them
  // into rotateX / rotateY.
  const tilterRef = useRef<HTMLDivElement>(null);
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
    if (phase !== 'show') return;
    const el = tilterRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    pointerX.set((e.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Tilt starts neutral on show and is levelled again for the flight home, so
  // the card lands flat on the identical card in the sheet.
  useEffect(() => {
    if (phase !== 'show' && phase !== 'collect') return;
    pointerX.set(0);
    pointerY.set(0);
  }, [phase, pointerX, pointerY]);

  // Gyroscope tilt — only while on show. Calibrates the device's resting
  // orientation on the first event so it reads as neutral.
  useEffect(() => {
    if (phase !== 'show') return;
    let baseGamma: number | null = null;
    let baseBeta: number | null = null;
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      if (baseGamma === null || baseBeta === null) {
        baseGamma = e.gamma;
        baseBeta = e.beta;
        return;
      }
      pointerX.set(Math.max(-0.5, Math.min(0.5, (e.gamma - baseGamma) / 20)));
      pointerY.set(Math.max(-0.5, Math.min(0.5, (e.beta - baseBeta) / 20)));
    };
    window.addEventListener('deviceorientation', onOrientation, true);
    return () => window.removeEventListener('deviceorientation', onOrientation, true);
  }, [phase, pointerX, pointerY]);

  const fast = (ms: number) => (reducedMotion ? 0 : ms);

  useEffect(() => {
    if (phase === 'lift') {
      const id = window.setTimeout(() => {
        chargeStartedAt.current = performance.now();
        // Ein anschwellendes Summen unter dem Daumen (Android; iOS kennt
        // navigator.vibrate nicht).
        if (!reducedMotion) vibrate([8, 110, 12, 90, 16, 70, 22, 50, 30, 30, 40]);
        callbacks.current.onCovered();
        setPhase('charge');
      }, fast(LIFT_MS));
      return () => window.clearTimeout(id);
    }
    if (phase === 'charge') {
      if (status === 'failed') {
        vibrate(0);
        setPhase('abort');
        return;
      }
      if (status !== 'ok') return;
      let cancelled = false;
      const waited = performance.now() - chargeStartedAt.current;
      const minLeft = new Promise<void>((resolve) =>
        window.setTimeout(resolve, Math.max(0, fast(CHARGE_MIN_MS) - waited))
      );
      // Die Karte dreht sich erst um, wenn ihr Gesicht zeichenbar ist — sonst
      // schlägt sie leer auf.
      void Promise.all([whenImageReady(imageUrl), minLeft]).then(() => {
        if (!cancelled) setPhase('flip');
      });
      return () => {
        cancelled = true;
      };
    }
    if (phase === 'flip') {
      const slam = window.setTimeout(() => vibrate([70, 40, 120]), fast(SLAM_MS));
      const id = window.setTimeout(() => {
        showStartedAt.current = performance.now();
        setPhase('show');
      }, fast(FLIP_MS));
      return () => {
        window.clearTimeout(slam);
        window.clearTimeout(id);
      };
    }
    if (phase === 'show') {
      const tick = window.setTimeout(() => setCounted(true), fast(COUNT_TICK_MS));
      const id = window.setTimeout(() => setPhase('collect'), SHOW_MS);
      return () => {
        window.clearTimeout(tick);
        window.clearTimeout(id);
      };
    }
    if (phase === 'collect' || phase === 'abort') {
      const id = window.setTimeout(() => {
        setPhase('done');
        if (finished.current) return;
        finished.current = true;
        if (phase === 'collect') callbacks.current.onDone();
        else callbacks.current.onAbort();
      }, fast(COLLECT_MS));
      return () => window.clearTimeout(id);
    }
    // `fast` reads reducedMotion, which is listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, status, imageUrl, reducedMotion]);

  const skip = useCallback(() => {
    if (phase !== 'show') return;
    if (performance.now() - showStartedAt.current < SKIP_AFTER_MS) return;
    setCounted(true);
    setPhase('collect');
  }, [phase]);

  useEffect(() => {
    if (phase !== 'show') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, skip]);

  if (!mounted || phase === 'done') return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Karte und Beschriftung als ein Block, mittig auf der Bühne.
  const cardW = Math.min(300, vw * 0.7, (vh - CAPTION_H - CAPTION_GAP - 96) / CARD_ASPECT);
  const cardH = cardW * CARD_ASPECT;
  const blockTop = Math.max(48, (vh - (cardH + CAPTION_GAP + CAPTION_H)) / 2);
  const stageCX = vw / 2;
  const stageCY = blockTop + cardH / 2;

  const originCX = originRect.left + originRect.width / 2;
  const originCY = originRect.top + originRect.height / 2;
  const home = phase === 'collect' || phase === 'abort';

  const box = home
    ? {
        left: originRect.left,
        top: originRect.top,
        width: originRect.width,
        height: originRect.height,
      }
    : { left: stageCX - cardW / 2, top: stageCY - cardH / 2, width: cardW, height: cardH };

  const flipped = phase === 'flip' || phase === 'show' || phase === 'collect';
  const burst = phase === 'flip' || phase === 'show';
  const showCaption = phase === 'show' || phase === 'collect';
  const cleanDish = normalizeName(dish);
  const countFrom = collection ? Math.max(0, collection.count - 1) : 0;

  const overlay = (
    <div
      className={styles.root}
      data-phase={phase}
      onClick={skip}
      style={
        {
          '--ox': `${originCX}px`,
          '--oy': `${originCY}px`,
          '--r0': `${Math.hypot(originRect.width, originRect.height) / 2}px`,
          '--r1': `${Math.hypot(Math.max(originCX, vw - originCX), Math.max(originCY, vh - originCY)) + 8}px`,
          '--cx': `${stageCX}px`,
          '--cy': `${stageCY}px`,
          '--card-w': `${cardW}px`,
          '--slam': `${SLAM_MS}ms`,
        } as React.CSSProperties
      }
    >
      {/* Licht und Beschriftung liegen IN der Bühne: die Iris schneidet sie
          beim Heimflug mit weg, statt sie über dem Sheet hängen zu lassen. */}
      <div className={`${styles.stage} ${home ? styles.stageClose : styles.stageOpen}`}>
        <div className={styles.fx} aria-hidden="true">
          <div
            className={`${styles.glow} ${
              home
                ? styles.fxOut
                : burst
                  ? styles.glowBurst
                  : phase === 'charge'
                    ? styles.glowCharge
                    : ''
            }`}
          />
          <div
            className={`${styles.rays} ${
              home
                ? styles.fxOut
                : burst
                  ? styles.raysBurst
                  : phase === 'charge'
                    ? styles.raysCharge
                    : ''
            }`}
          >
            <div className={styles.raysSpin} />
          </div>
          {burst && (
            <>
              <div className={styles.ring} />
              {SPARKS.map((s, i) => (
                <i
                  key={i}
                  className={`${styles.spark}${s.white ? ` ${styles.sparkWhite}` : ''}`}
                  style={
                    {
                      '--dx': s.dx,
                      '--dy': s.dy,
                      '--size': `${s.size}px`,
                      '--rot': `${s.rot}deg`,
                      '--delay': `${s.delay}ms`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </>
          )}
        </div>
        {showCaption && (
          <div
            className={`${styles.caption}${phase === 'collect' ? ` ${styles.captionOut}` : ''}`}
            style={{ top: blockTop + cardH + CAPTION_GAP }}
            aria-hidden="true"
          >
            <span className={styles.line}>
              <span className={`${styles.lineIn} ${styles.kicker}`}>{tMap('revealCollected')}</span>
            </span>
            <span className={styles.line}>
              <span className={`${styles.lineIn} ${styles.dish}`}>{cleanDish}</span>
            </span>
            {collection && (
              <span className={styles.line}>
                <span className={`${styles.lineIn} ${styles.count}`}>
                  <span
                    key={counted ? 'to' : 'from'}
                    className={counted ? styles.countTick : undefined}
                  >
                    {counted ? collection.count : countFrom}
                  </span>
                  <span className={styles.countTotal}> / {collection.total}</span>
                </span>
              </span>
            )}
          </div>
        )}
      </div>

      <motion.div
        className={styles.cardWrap}
        initial={{
          left: originRect.left,
          top: originRect.top,
          width: originRect.width,
          height: originRect.height,
        }}
        animate={box}
        transition={
          reducedMotion
            ? { duration: 0 }
            : phase === 'lift'
              ? { type: 'spring', stiffness: 230, damping: 24, mass: 1 }
              : home
                ? { duration: COLLECT_MS / 1000, ease: [0.45, 0, 0.2, 1] }
                : { duration: 0 }
        }
      >
        <div
          className={`${styles.dancer} ${
            phase === 'charge' ? styles.dancerCharge : home ? styles.dancerHome : ''
          }`}
        >
          <motion.div
            ref={tilterRef}
            className={styles.tilter}
            style={{
              rotateX: rotateXSpring,
              rotateY: rotateYSpring,
              transformStyle: 'preserve-3d',
            }}
            onPointerMove={phase === 'show' ? handlePointerMove : undefined}
            onPointerLeave={() => {
              pointerX.set(0);
              pointerY.set(0);
            }}
          >
            <div
              className={`${styles.flipper} ${
                flipped ? styles.flipperFlip : phase === 'charge' ? styles.flipperCharge : ''
              }`}
            >
              <img
                className={styles.faceBack}
                src="/pics/card-back.webp?v=7"
                alt=""
                aria-hidden="true"
              />
              <div className={styles.faceFront}>
                <img src={imageUrl} alt={cleanDish} />
                {/* Glanz, der über das Gesicht streicht, sobald es aufschlägt —
                    maskiert mit dem Kartenbild selbst, damit er nur auf der
                    Karte liegt und nicht auf dem freigestellten Rand. */}
                {burst && (
                  <span
                    className={styles.sheen}
                    style={{
                      WebkitMaskImage: `url("${imageUrl}")`,
                      maskImage: `url("${imageUrl}")`,
                    }}
                    aria-hidden="true"
                  />
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <p className={styles.srOnly} aria-live="polite">
        {phase === 'show' ? `${tMap('revealCollected')}: ${cleanDish}` : ''}
      </p>
    </div>
  );

  return createPortal(overlay, document.body);
}
