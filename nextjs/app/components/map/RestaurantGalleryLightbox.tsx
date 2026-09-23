'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { RestaurantGalleryImage } from '@/lib/map/useRestaurantDetail';
import { safeHttpUrl } from '@/lib/safeHttpUrl';
import styles from './RestaurantGalleryLightbox.module.css';

interface Props {
  images: RestaurantGalleryImage[];
  // null = closed; a number opens the viewer at that index.
  startIndex: number | null;
  onClose: () => void;
  restaurantName: string;
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

const BACKDROP_PIECES = [
  styles.galleryLbBgMain,
  styles.galleryLbBgTopLeft,
  styles.galleryLbBgTopRight,
  styles.galleryLbBgBottomLeft,
  styles.galleryLbBgBottomRight,
];

// Flat, swipeable photo viewer for the restaurant gallery. Unlike the
// must-eat lightbox (a 3D-tilt "playing card"), this is a plain image you
// page through — touch-swipe, arrow keys, or the on-screen chevrons.
function Viewer({
  images,
  startIndex,
  onClose,
  restaurantName,
}: {
  images: RestaurantGalleryImage[];
  startIndex: number;
  onClose: () => void;
  restaurantName: string;
}) {
  const count = images.length;
  const [page, setPage] = useState(startIndex);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(startIndex);
  pageRef.current = page;

  // Vor dem ersten Paint aufs angetippte Foto stellen, sonst blitzt Foto 1 auf.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (track) track.scrollLeft = startIndex * track.clientWidth;
  }, [startIndex]);

  const go = useCallback(
    (d: number) => {
      const track = trackRef.current;
      if (!track) return;
      const next = pageRef.current + d;
      if (next < 0 || next >= count) return;
      track.scrollTo({
        left: next * track.clientWidth,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
    },
    [count]
  );

  // Lock body scroll while open. `data-lightbox-open` also takes the map
  // strip out of Safari's sight (MapLayout.module.css): Safari keeps tinting
  // a bar after the last edge element it found for as long as that element
  // stays visible, and the strip would hold the top bar dark.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.dataset.lightboxOpen = '';
    return () => {
      document.body.style.overflow = prev;
      delete document.body.dataset.lightboxOpen;
    };
  }, []);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus({ preventScroll: true });
    return () => previousFocus?.focus({ preventScroll: true });
  }, []);

  // Escape closes; arrows page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, go]);

  return (
    <motion.div
      ref={dialogRef}
      className={styles.galleryLb}
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
          ) ?? []
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`${restaurantName} – Foto ${page + 1} von ${count}`}
    >
      {/* Der Vorhang in fünf Stücken, damit Safari die Leisten durchsichtig
          lässt und der Blur hinter Status- und URL-Leiste weiterläuft — siehe
          `.galleryLbBg` im Stylesheet. */}
      {BACKDROP_PIECES.map((piece) => (
        <motion.div
          key={piece}
          className={`${styles.galleryLbBg} ${piece}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      ))}

      <button
        ref={closeRef}
        type="button"
        className={styles.galleryLbClose}
        aria-label="Galerie schließen"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>

      {/* Ein echter Scroll-Container statt framer-`drag`: das Foto folgt dem
          Finger 1:1, das Nachbarfoto zieht sichtbar mit herein, und
          `scroll-snap-stop: always` rastet pro Wisch genau ein Foto weiter —
          wie bei Instagram. Die alte Fassung hielt das Bild mit
          `dragElastic: 0.18` fest, es ging nur ein Fünftel des Fingerwegs
          mit und klebte. Ein Wisch erzeugt keinen Klick, schließt also nie. */}
      <div
        ref={trackRef}
        className={styles.galleryLbStage}
        onScroll={(event) => {
          const track = event.currentTarget;
          if (!track.clientWidth) return;
          const next = Math.round(track.scrollLeft / track.clientWidth);
          setPage(Math.max(0, Math.min(count - 1, next)));
        }}
      >
        {images.map((img, index) => {
          const href = safeHttpUrl(img.creditUrl);
          const credit = img.credit?.trim();
          const near = Math.abs(index - page) <= 1;
          return (
            <div
              key={img._key}
              className={styles.galleryLbSlide}
              aria-hidden={index !== page || undefined}
            >
              <div className={styles.galleryLbPrint} onClick={(e) => e.stopPropagation()}>
                <img
                  src={img.full}
                  alt={img.alt ?? restaurantName}
                  className={styles.galleryLbImg}
                  draggable={false}
                  loading={near ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={index === page ? 'high' : 'auto'}
                />
                {credit && (
                  <span className={styles.galleryLbCredit}>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        tabIndex={index === page ? undefined : -1}
                      >
                        {credit}
                      </a>
                    ) : (
                      credit
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pfeile und Zählstand stehen als eine Leiste unter dem Abzug: seitliche
          Pfeile auf halber Höhe lagen genau im Wischweg und waren auf Touch
          deshalb ganz abgeschaltet — damit gab es am Telefon keinen Hinweis
          darauf, dass überhaupt weitere Fotos folgen. */}
      {count > 1 && (
        <div className={styles.galleryLbNav} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={styles.galleryLbArrow}
            aria-label="Vorheriges Foto"
            disabled={page === 0}
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
          >
            <Chevron dir="left" />
          </button>
          <span className={styles.galleryLbCounter}>
            {page + 1} / {count}
          </span>
          <button
            type="button"
            className={styles.galleryLbArrow}
            aria-label="Nächstes Foto"
            disabled={page === count - 1}
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
          >
            <Chevron dir="right" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function RestaurantGalleryLightbox({
  images,
  startIndex,
  onClose,
  restaurantName,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

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
    document.body
  );
}
