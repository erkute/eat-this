'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useIsPresent, useReducedMotion } from 'framer-motion';
import { useLocale } from 'next-intl';
import type { RestaurantGalleryImage } from '@/lib/map/useRestaurantDetail';
import { safeHttpUrl } from '@/lib/safeHttpUrl';
import styles from './RestaurantGalleryLightbox.module.css';
import ZoomCurtain from './ZoomCurtain';

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

function PhotoCredit({ image }: { image: RestaurantGalleryImage }) {
  const credit = image.credit?.trim();
  if (!credit) return null;
  const prefix = credit.match(/^(?:Foto|Photo):\s*/i)?.[0] ?? '';
  const name = credit.slice(prefix.length);
  const href = safeHttpUrl(image.creditUrl);

  return (
    <div className={styles.galleryLbCredit}>
      {prefix}
      {href && name ? (
        <a href={href} target="_blank" rel="noopener noreferrer">{name}</a>
      ) : name}
    </div>
  );
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
  images: RestaurantGalleryImage[];
  startIndex: number;
  onClose: () => void;
  restaurantName: string;
}) {
  const count = images.length;
  const english = useLocale() === 'en';
  const reducedMotion = useReducedMotion();
  const photoLabel = (index: number) =>
    english ? `Photo ${index + 1} of ${count}` : `Foto ${index + 1} von ${count}`;
  /* Beim Schliessen blendet der Vorhang 200 ms aus (ZoomCurtain). Foto,
     Schliessen und Blättern standen in der Zeit voll deckend weiter — das X
     lag sichtbar neben dem Burger, das Foto frei über der Seite (iOS-Audit
     28.09.2026). Sie gehen jetzt sofort, nur der Vorhang läuft aus. */
  const leaving = !useIsPresent();
  const [page, setPage] = useState(startIndex);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const trackWidthRef = useRef(0);
  const focusDirectionRef = useRef<string | null>(null);
  const pageRef = useRef(startIndex);
  pageRef.current = page;

  // Vor dem ersten Paint aufs angetippte Foto stellen, sonst blitzt Foto 1 auf.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    trackWidthRef.current = track.clientWidth;
    track.scrollLeft = startIndex * track.clientWidth;
    // Auch nach Drehen des Telefons bleibt das ausgewählte Foto eingerastet.
    const observer = new ResizeObserver(() => {
      trackWidthRef.current = track.clientWidth;
      track.scrollTo({ left: pageRef.current * track.clientWidth, behavior: 'instant' });
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, [startIndex]);

  const goTo = useCallback(
    (next: number) => {
      const track = trackRef.current;
      if (!track) return;
      if (next < 0 || next >= count) return;
      focusDirectionRef.current = document.activeElement?.getAttribute('data-direction') ?? null;
      track.scrollTo({
        left: next * track.clientWidth,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
    },
    [count]
  );

  const go = useCallback((direction: number) => goTo(pageRef.current + direction), [goTo]);

  useEffect(() => {
    // Ein Pfeilklick darf den Fokus nicht auf der nun inaktiven Folie verlieren.
    const direction = focusDirectionRef.current;
    if (direction) {
      const activeSlide = trackRef.current?.children[page];
      const arrows = Array.from(activeSlide?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
        .filter((button) => button.getClientRects().length > 0);
      const nextFocus = arrows.find((button) => button.dataset.direction === direction)
        ?? arrows[0]
        ?? closeRef.current;
      nextFocus?.focus({ preventScroll: true });
      focusDirectionRef.current = null;
    }
    const strip = thumbsRef.current;
    const selected = strip?.children[page] as HTMLElement | undefined;
    if (!strip || !selected) return;
    const left = selected.offsetLeft - strip.offsetLeft;
    if (left < strip.scrollLeft || left + selected.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollTo({
        left: left - (strip.clientWidth - selected.offsetWidth) / 2,
        behavior: 'instant',
      });
    }
  }, [page]);

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
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
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        go(e.key === 'ArrowLeft' ? -1 : 1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, go]);

  return (
    <motion.div
      ref={dialogRef}
      className={styles.galleryLb}
      data-leaving={leaving ? '' : undefined}
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
          ) ?? []
        ).filter((element) =>
          element.tabIndex >= 0 && !element.closest('[inert]') && element.getClientRects().length > 0
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
      aria-label={`${restaurantName} – ${english ? 'Photo gallery' : 'Fotogalerie'}`}
    >
      <ZoomCurtain className={styles.galleryLbCurtain} fade={!reducedMotion} />

      <span className={styles.galleryLbAnnouncement} role="status" aria-live="polite" aria-atomic="true">
        {photoLabel(page)}
      </span>
      <div className={styles.galleryLbHeader} onClick={(event) => event.stopPropagation()}>
        <span className={styles.galleryLbName}>{restaurantName}</span>
        <button
          ref={closeRef}
          type="button"
          className={styles.galleryLbClose}
          aria-label={english ? 'Close gallery' : 'Galerie schließen'}
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      {/* Ein echter Scroll-Container statt framer-`drag`: das Foto folgt dem
          Finger 1:1, das Nachbarfoto zieht sichtbar mit herein, und
          `scroll-snap-stop: always` rastet pro Wisch genau ein Foto weiter —
          wie bei Instagram. Die alte Fassung hielt das Bild mit
          `dragElastic: 0.18` fest, es ging nur ein Fünftel des Fingerwegs
          mit und klebte. Ein Wisch erzeugt keinen Klick, schließt also nie. */}
      <div
        ref={trackRef}
        className={styles.galleryLbStage}
        role="region"
        aria-label={english ? 'Browse photos' : 'Fotos durchblättern'}
        tabIndex={0}
        onScroll={(event) => {
          const track = event.currentTarget;
          if (!track.clientWidth || track.clientWidth !== trackWidthRef.current) return;
          const next = Math.round(track.scrollLeft / track.clientWidth);
          setPage(Math.max(0, Math.min(count - 1, next)));
        }}
      >
        {images.map((img, index) => {
          const near = Math.abs(index - page) <= 1;
          return (
            <div
              key={img._key}
              className={styles.galleryLbSlide}
              aria-hidden={index !== page || undefined}
              inert={index !== page}
            >
              <div className={styles.galleryLbMedia} onClick={(e) => e.stopPropagation()}>
                <img
                  src={img.full}
                  alt={img.alt ?? restaurantName}
                  className={styles.galleryLbImg}
                  draggable={false}
                  loading={near ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={index === page ? 'high' : 'auto'}
                />
                {count > 1 && (
                  <>
                    <button
                      type="button"
                      className={styles.galleryLbArrow}
                      data-direction="previous"
                      aria-label={english ? 'Previous photo' : 'Vorheriges Foto'}
                      disabled={index === 0}
                      onClick={() => go(-1)}
                    >
                      <Chevron dir="left" />
                    </button>
                    <button
                      type="button"
                      className={styles.galleryLbArrow}
                      data-direction="next"
                      aria-label={english ? 'Next photo' : 'Nächstes Foto'}
                      disabled={index === count - 1}
                      onClick={() => go(1)}
                    >
                      <Chevron dir="right" />
                    </button>
                  </>
                )}
                <PhotoCredit image={img} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Echte kleine Galerie-Bilder; der Streifen scrollt unabhängig vom Foto. */}
      {count > 1 && (
        <div
          ref={thumbsRef}
          className={styles.galleryLbThumbnails}
          role="group"
          aria-label={english ? 'Choose photo' : 'Foto auswählen'}
          onClick={(event) => event.stopPropagation()}
        >
          {images.map((img, index) => (
            <button
              key={img._key}
              type="button"
              className={styles.galleryLbThumbnail}
              aria-label={photoLabel(index)}
              aria-pressed={index === page}
              onClick={() => goTo(index)}
            >
              <img src={img.thumb} alt="" width={80} height={80} draggable={false} decoding="async" />
            </button>
          ))}
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
