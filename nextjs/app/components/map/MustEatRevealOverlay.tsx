'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion'
import styles from './MustEatRevealOverlay.module.css'

type Phase = 'flyIn' | 'idle' | 'flipping' | 'revealed' | 'flyOut' | 'done'

interface Props {
  imageUrl: string
  alt: string
  originRect: DOMRect
  onDone: () => void
  // Where the card flies on the way out. Defaults to the navbar profile icon
  // (map behaviour). The profile deck passes the tapped slot so the card flies
  // back to its place instead.
  flyOutTarget?: { cx: number; cy: number; size: number }
  // When true (deck "return to slot"), the card lands fully opaque at the
  // target's exact size (no fade, no shrink-past) so the caller can reveal an
  // identical card underneath for a seamless hand-off. Default false = map
  // behaviour (shrink toward the profile icon + fade out).
  landOpaque?: boolean
}

// Total choreography ~4 s end-to-end. Sum of all phase durations below.
const FLY_IN_MS = 400
const IDLE_AUTO_FLIP_MS = 400
// Tornado spin with hin-und-her oscillation + slow zoom-in at the end.
// Keep in sync with .flipperOpen CSS animation duration.
const FLIP_MS = 1700
// Dwell window where pointer/gyroscope tilt is live so the user can
// move the card before it auto-flies to the profile icon.
const REVEALED_MS = 900
const FLY_OUT_MS = 600
// Match the freigestellt card art (1539×2115) so the contained card fills the
// overlay box without letterbox margins — and is never cropped.
const CARD_ASPECT = 2115 / 1539

// Locates the navbar profile icon. Falls back to the viewport top-right
// corner so the fly-out still has a target if the icon is unmounted.
function locateProfileTarget(): { cx: number; cy: number; size: number } {
  const el = document.getElementById('navProfileBtn')
  if (el) {
    const r = el.getBoundingClientRect()
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, size: Math.min(r.width, r.height) }
  }
  return { cx: window.innerWidth - 28, cy: 28, size: 24 }
}

export default function MustEatRevealOverlay({ imageUrl, alt, originRect, onDone, flyOutTarget, landOpaque }: Props) {
  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<Phase>('flyIn')
  const [target, setTarget] = useState<{ cx: number; cy: number; size: number } | null>(null)
  const reducedMotion = useReducedMotion()
  const doneCalled = useRef(false)

  // Pointer + gyroscope tilt — only active during the revealed dwell so
  // the user can move the card around before it auto-flies away. Same
  // recipe as profile-deck's lightbox tilt: pointer/gyro feed the same
  // motion values, both go through soft springs to rotateX / rotateY.
  const tilterRef = useRef<HTMLDivElement>(null)
  const pointerX  = useMotionValue(0)
  const pointerY  = useMotionValue(0)
  const rotateXSpring = useSpring(
    useTransform(pointerY, [-0.5, 0.5], [12, -12]),
    { stiffness: 220, damping: 18 },
  )
  const rotateYSpring = useSpring(
    useTransform(pointerX, [-0.5, 0.5], [-14, 14]),
    { stiffness: 220, damping: 18 },
  )

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== 'revealed') return
    const el = tilterRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    pointerX.set((e.clientX - rect.left) / rect.width  - 0.5)
    pointerY.set((e.clientY - rect.top)  / rect.height - 0.5)
  }
  const handlePointerLeave = () => {
    pointerX.set(0)
    pointerY.set(0)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  // Reset tilt at start of revealed so the card opens at neutral, then
  // follows pointer/gyro from there.
  useEffect(() => {
    if (phase !== 'revealed') return
    pointerX.set(0)
    pointerY.set(0)
  }, [phase, pointerX, pointerY])

  // Reset tilt as the card flies back so it lands flat — matches the static
  // slot card the deck reveals underneath for a seamless hand-off.
  useEffect(() => {
    if (phase !== 'flyOut') return
    pointerX.set(0)
    pointerY.set(0)
  }, [phase, pointerX, pointerY])

  // Gyroscope tilt — only while revealed. Calibrates the device's
  // resting orientation on the first event so it reads as neutral.
  useEffect(() => {
    if (phase !== 'revealed') return
    let baseGamma: number | null = null
    let baseBeta:  number | null = null
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return
      if (baseGamma === null || baseBeta === null) {
        baseGamma = e.gamma
        baseBeta  = e.beta
        return
      }
      const dGamma = e.gamma - baseGamma
      const dBeta  = e.beta  - baseBeta
      pointerX.set(Math.max(-0.5, Math.min(0.5, dGamma / 20)))
      pointerY.set(Math.max(-0.5, Math.min(0.5, dBeta  / 20)))
    }
    window.addEventListener('deviceorientation', onOrientation, true)
    return () => window.removeEventListener('deviceorientation', onOrientation, true)
  }, [phase, pointerX, pointerY])

  // Phase auto-advance for non-interactive phases. Auth-gating happens at
  // the trigger (useMustEatDetailState.handleCardClick) so this component
  // can assume the user is signed-in once it's mounted.
  useEffect(() => {
    if (phase === 'flyIn') {
      const id = window.setTimeout(() => setPhase('idle'), reducedMotion ? 60 : FLY_IN_MS)
      return () => window.clearTimeout(id)
    }
    if (phase === 'idle') {
      // Auto-flip after a short dance window so the card opens itself.
      // Tapping during idle still starts the flip immediately.
      const id = window.setTimeout(
        () => setPhase('flipping'),
        reducedMotion ? 60 : IDLE_AUTO_FLIP_MS,
      )
      return () => window.clearTimeout(id)
    }
    if (phase === 'flipping') {
      const id = window.setTimeout(() => setPhase('revealed'), reducedMotion ? 60 : FLIP_MS)
      return () => window.clearTimeout(id)
    }
    if (phase === 'revealed') {
      // Capture the fly-out target now so it's stable. Defaults to the profile
      // icon (map); the deck passes the tapped slot so it flies back home.
      setTarget(flyOutTarget ?? locateProfileTarget())
      const id = window.setTimeout(
        () => setPhase('flyOut'),
        reducedMotion ? 60 : REVEALED_MS,
      )
      return () => window.clearTimeout(id)
    }
    if (phase === 'flyOut') {
      const id = window.setTimeout(() => {
        setPhase('done')
        if (!doneCalled.current) {
          doneCalled.current = true
          onDone()
        }
      }, reducedMotion ? 60 : FLY_OUT_MS)
      return () => window.clearTimeout(id)
    }
  }, [phase, reducedMotion, onDone, flyOutTarget])

  const handleTap = useCallback(() => {
    if (phase === 'idle') {
      setPhase('flipping')
      return
    }
    if (phase === 'revealed') {
      setPhase('flyOut')
    }
  }, [phase])

  if (!mounted || phase === 'done') return null

  const vw = window.innerWidth
  const vh = window.innerHeight
  // Stay comfortably away from the viewport edges and the bottom sheet
  // grabber so the fully-visible card never feels clipped.
  const cardW = Math.min(280, vw * 0.72, vh * 0.42 / CARD_ASPECT)
  const cardH = cardW * CARD_ASPECT
  const centerX = vw / 2
  const centerY = vh / 2

  const originCX = originRect.left + originRect.width / 2
  const originCY = originRect.top + originRect.height / 2

  let cx = centerX
  let cy = centerY
  let w = cardW
  let h = cardH
  let opacity = 1

  if (phase === 'flyOut') {
    const t = target ?? flyOutTarget ?? locateProfileTarget()
    cx = t.cx
    cy = t.cy
    if (landOpaque) {
      // Return to the origin slot: the flipper holds its 1.4 dwell-zoom, so
      // size the wrap to t.size / 1.4 → the VISIBLE card lands at the slot's
      // exact size. Stay fully opaque; the caller reveals an identical card
      // underneath in the same frame, so removing the overlay is seamless.
      w = t.size / 1.4
      h = w * CARD_ASPECT
      opacity = 1
    } else {
      // Shrink toward the icon while staying large enough to read until the
      // last frame so the user can track where the card lands.
      w = Math.max(28, t.size * 0.9)
      h = w * CARD_ASPECT
      opacity = 0
    }
  }

  const flipperClass =
    phase === 'flipping' || phase === 'revealed' || phase === 'flyOut'
      ? `${styles.flipper} ${styles.flipperOpen}`
      : styles.flipper

  const dancerExtraClass =
    phase === 'idle'     ? styles.dancerIdle :
    phase === 'revealed' ? styles.dancerRevealed :
    phase === 'flyOut'   ? styles.dancerFlyOut :
    ''

  const overlay = (
    <div className={styles.root} aria-live="polite">
      <motion.button
        type="button"
        className={styles.cardWrap}
        onClick={handleTap}
        disabled={phase !== 'idle' && phase !== 'revealed'}
        aria-label={
          phase === 'idle' ? 'Aufdecken' :
          phase === 'revealed' ? 'In dein Deck legen' :
          'Must Eat'
        }
        initial={{
          left: originCX - originRect.width / 2,
          top: originCY - originRect.height / 2,
          width: originRect.width,
          height: originRect.height,
          opacity: 1,
        }}
        animate={{
          left: cx - w / 2,
          top: cy - h / 2,
          width: w,
          height: h,
          opacity,
        }}
        transition={
          phase === 'flyIn'
            ? { type: 'spring', stiffness: 210, damping: 24, mass: 1 }
            : phase === 'flyOut'
              ? {
                  duration: FLY_OUT_MS / 1000,
                  ease: [0.45, 0, 0.2, 1],
                  opacity: { delay: (FLY_OUT_MS - 200) / 1000, duration: 0.2 },
                }
              : { duration: 0 }
        }
      >
        <div className={`${styles.dancer} ${dancerExtraClass}`}>
          <motion.div
            ref={tilterRef}
            className={styles.tilter}
            style={{
              rotateX: rotateXSpring,
              rotateY: rotateYSpring,
              transformStyle: 'preserve-3d',
            }}
            onPointerMove={phase === 'revealed' ? handlePointerMove : undefined}
            onPointerLeave={phase === 'revealed' ? handlePointerLeave : undefined}
          >
            <div className={flipperClass}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.faceBack} src="/pics/card-back.webp" alt="" aria-hidden="true" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.faceFront} src={imageUrl} alt={alt} />
            </div>
          </motion.div>
        </div>
      </motion.button>
    </div>
  )

  return createPortal(overlay, document.body)
}
