'use client'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion'
import styles from './map.module.css'

interface Props {
  imageUrl: string
  alt: string
  // null = closed; setting it to a DOMRect opens the lightbox and the
  // card flies out from that rect. Reverting to null triggers exit which
  // animates back to the same origin rect.
  originRect: DOMRect | null
  onClose: () => void
  // Fires on the exact frame the fly-back clone unmounts. Callers that hide
  // the origin card while the clone is on screen reveal it here — a timer
  // would leave a gap where neither is visible (the slot blinks).
  onExitComplete?: () => void
}

interface InnerProps {
  imageUrl:   string
  alt:        string
  originRect: DOMRect
  open:       boolean
  onClose:    () => void
  onClosed:   () => void
}

// Credit URLs come from CMS content (Google attribution data / manual Studio
// entry) — only link out for http(s) so a poisoned value can't become a
// javascript: href. Shared with the restaurant gallery viewer + detail hero.
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}

// Mirrors profile/ProfileDeck.ExpandedOverlay almost line-for-line so the
// two zoom interactions feel identical: open from origin → settle in centre
// with Apple-style ease-out, pointer-driven 3D-tilt, sheen drifts with
// rotateY, body scroll/touch locked. Click anywhere closes.
const Inner = memo(function Inner({ imageUrl, alt, originRect, open, onClose, onClosed }: InnerProps) {
  const cardAspect = originRect.width / originRect.height
  const maxW = Math.min(420, window.innerWidth * 0.88)
  const maxH = window.innerHeight * 0.78
  const overlayW = Math.min(maxW, maxH * cardAspect)
  const screenCx  = window.innerWidth / 2
  const screenCy  = window.innerHeight / 2
  const slotCx    = originRect.left + originRect.width / 2
  const slotCy    = originRect.top  + originRect.height / 2
  const fromX     = slotCx - screenCx
  const fromY     = slotCy - screenCy
  const fromScale = originRect.width / overlayW
  const tiltZ     = Math.max(-7, Math.min(7, fromX * 0.025))

  const cardRef  = useRef<HTMLDivElement>(null)
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const rotateXSpring = useSpring(
    useTransform(pointerY, [-0.5, 0.5], [12, -12]),
    { stiffness: 220, damping: 18 },
  )
  const rotateYSpring = useSpring(
    useTransform(pointerX, [-0.5, 0.5], [-14, 14]),
    { stiffness: 220, damping: 18 },
  )
  const sheenX = useTransform(rotateYSpring, [-14, 14], ['-30%', '30%'])

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    pointerX.set((e.clientX - rect.left) / rect.width  - 0.5)
    pointerY.set((e.clientY - rect.top)  / rect.height - 0.5)
  }
  const handlePointerLeave = () => {
    pointerX.set(0)
    pointerY.set(0)
  }

  const [closing, setClosing] = useState(false)
  // Flatten the pointer/gyro 3D-tilt before flying back — the springs would
  // otherwise hold the last tilt through the exit and the card lands skewed
  // against the flat origin card.
  const handleClose = useCallback(() => {
    if (closing) return
    pointerX.set(0)
    pointerY.set(0)
    setClosing(true)
    onClose()
  }, [closing, onClose, pointerX, pointerY])

  // Calibrating gyroscope tilt on mobile — first event sets neutral so
  // the phone's resting orientation reads as 0,0. Same pointer values
  // feed the same springs so pointer + gyro compose without conflict.
  const gyroBaseRef = useRef<{ beta: number; gamma: number } | null>(null)
  useEffect(() => {
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return
      if (!gyroBaseRef.current) {
        gyroBaseRef.current = { beta: e.beta, gamma: e.gamma }
        return
      }
      const dGamma = e.gamma - gyroBaseRef.current.gamma
      const dBeta  = e.beta  - gyroBaseRef.current.beta
      pointerX.set(Math.max(-0.5, Math.min(0.5, dGamma / 20)))
      pointerY.set(Math.max(-0.5, Math.min(0.5, dBeta  / 20)))
    }
    window.addEventListener('deviceorientation', onOrientation, true)
    return () => {
      window.removeEventListener('deviceorientation', onOrientation, true)
      gyroBaseRef.current = null
    }
  }, [pointerX, pointerY])

  // Lock body scroll + touch so finger-drag tilts the card instead of
  // scrolling the page underneath. iOS Safari otherwise pans the map.
  useEffect(() => {
    const prevOverflow    = document.body.style.overflow
    const prevTouchAction = document.body.style.touchAction
    document.body.style.overflow    = 'hidden'
    document.body.style.touchAction = 'none'
    return () => {
      document.body.style.overflow    = prevOverflow
      document.body.style.touchAction = prevTouchAction
    }
  }, [])

  // Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handleClose])

  return (
    <motion.div
      className={closing ? `${styles.lightboxWrapper} ${styles.lightboxWrapperClosing}` : styles.lightboxWrapper}
      onClick={handleClose}
      role="dialog"
    >
      <div className={styles.lightboxBg} aria-hidden="true" />
      <motion.div
        ref={cardRef}
        className={styles.lightboxCard}
        initial={{ x: fromX, y: fromY, scale: fromScale, rotateZ: tiltZ }}
        animate={open
          ? {
              x: 0, y: 0, scale: 1, rotateZ: 0,
              transition: { duration: 0.46, ease: [0.22, 1, 0.36, 1] },
            }
          : {
              x: fromX, y: fromY, scale: fromScale, rotateZ: 0,
              transition: { duration: 0.34, ease: [0.4, 0, 0.2, 1] },
            }}
        // No opacity fade on the way back — the card stays fully visible
        // until it has landed in its slot, then onExitComplete swaps in the
        // origin card on the same frame. A fade made it vanish mid-flight.
        onAnimationComplete={() => {
          if (!open) onClosed()
        }}
        style={{
          rotateX: rotateXSpring,
          rotateY: rotateYSpring,
          transformStyle: 'preserve-3d',
        }}
        onClick={(e) => {
          e.stopPropagation()
          handleClose()
        }}
        onPointerUp={(e) => {
          e.stopPropagation()
          handleClose()
        }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {/* Inner clip wrapper keeps the sheen's drifting gradient inside
            the card's rounded shape — without it the sheen leaks past
            the right edge at strong rotateY tilts. */}
        <div className={styles.lightboxClip} style={{ width: overlayW }}>
          <img
            src={imageUrl}
            alt={alt}
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
  )
})

export default function MustEatImageLightbox({ imageUrl, alt, originRect, onClose, onExitComplete }: Props) {
  const [mounted, setMounted] = useState(false)
  const [rendered, setRendered] = useState<{
    imageUrl: string
    alt: string
    originRect: DOMRect
    open: boolean
  } | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (originRect) {
      setRendered({ imageUrl, alt, originRect, open: true })
      return
    }
    setRendered((current) => current ? { ...current, open: false } : null)
  }, [alt, imageUrl, originRect])

  if (!mounted) return null

  return createPortal(
    rendered && (
      <Inner
        key="must-eat-lightbox"
        imageUrl={rendered.imageUrl}
        alt={rendered.alt}
        originRect={rendered.originRect}
        open={rendered.open}
        onClose={onClose}
        onClosed={() => {
          setRendered(null)
          onExitComplete?.()
        }}
      />
    ),
    document.body,
  )
}
