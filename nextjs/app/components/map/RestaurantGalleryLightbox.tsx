'use client'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { RestaurantGalleryImage } from '@/lib/map/useRestaurantDetail'
import { safeHttpUrl } from './MustEatImageLightbox'
import styles from './map.module.css'

interface Props {
  images: RestaurantGalleryImage[]
  // null = closed; a number opens the viewer at that index.
  startIndex: number | null
  onClose: () => void
  restaurantName: string
}

const SWIPE_THRESHOLD = 60

// Slide between photos with a horizontal translate (project rule: motion is
// translate, never an opacity fade). `dir` is +1 paging forward, -1 back.
const slide = {
  enter: (dir: number) => ({ x: dir >= 0 ? '100%' : '-100%' }),
  center: { x: 0 },
  exit: (dir: number) => ({ x: dir >= 0 ? '-100%' : '100%' }),
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  )
}

// Flat, swipeable photo viewer for the restaurant gallery. Unlike the
// must-eat lightbox (a 3D-tilt "playing card"), this is a plain image you
// page through — touch-swipe, arrow keys, or the on-screen chevrons.
function Viewer({
  images,
  startIndex,
  onClose,
  restaurantName,
}: {
  images: RestaurantGalleryImage[]
  startIndex: number
  onClose: () => void
  restaurantName: string
}) {
  const count = images.length
  const [[page, dir], setPage] = useState<[number, number]>([startIndex, 0])

  const go = useCallback(
    (d: number) => {
      setPage(([p]) => {
        const next = p + d
        return next < 0 || next >= count ? [p, 0] : [next, d]
      })
    },
    [count],
  )

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Escape closes; arrows page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, go])

  const img = images[page]
  const href = safeHttpUrl(img.creditUrl)

  return (
    <motion.div
      className={styles.galleryLb}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${restaurantName} – Foto ${page + 1} von ${count}`}
    >
      <motion.div
        className={styles.galleryLbBg}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />

      <button type="button" className={styles.galleryLbClose} aria-label="Schließen" onClick={onClose}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {count > 1 && (
        <span className={styles.galleryLbCounter}>
          {page + 1} / {count}
        </span>
      )}

      <div className={styles.galleryLbStage} onClick={(e) => e.stopPropagation()}>
        <AnimatePresence custom={dir} initial={false} mode="sync">
          <motion.div
            key={page}
            className={styles.galleryLbSlide}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ x: { type: 'spring', stiffness: 320, damping: 34 } }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE_THRESHOLD) go(1)
              else if (info.offset.x > SWIPE_THRESHOLD) go(-1)
            }}
          >
            <img src={img.full} alt={img.alt ?? restaurantName} className={styles.galleryLbImg} draggable={false} />
          </motion.div>
        </AnimatePresence>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            className={`${styles.galleryLbArrow} ${styles.galleryLbArrowPrev}`}
            aria-label="Vorheriges Foto"
            disabled={page === 0}
            onClick={(e) => {
              e.stopPropagation()
              go(-1)
            }}
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            className={`${styles.galleryLbArrow} ${styles.galleryLbArrowNext}`}
            aria-label="Nächstes Foto"
            disabled={page === count - 1}
            onClick={(e) => {
              e.stopPropagation()
              go(1)
            }}
          >
            <Chevron dir="right" />
          </button>
        </>
      )}

      {img.credit && (
        <span className={styles.galleryLbCredit} onClick={(e) => e.stopPropagation()}>
          {href ? (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {img.credit}
            </a>
          ) : (
            img.credit
          )}
        </span>
      )}
    </motion.div>
  )
}

export default function RestaurantGalleryLightbox({ images, startIndex, onClose, restaurantName }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {startIndex !== null && images[startIndex] && (
        <Viewer
          key="gallery-lightbox"
          images={images}
          startIndex={startIndex}
          onClose={onClose}
          restaurantName={restaurantName}
        />
      )}
    </AnimatePresence>,
    document.body,
  )
}
