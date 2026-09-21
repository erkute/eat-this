'use client';
import { useRef, useState } from 'react';
import RestaurantGalleryLightbox from './RestaurantGalleryLightbox';
import type { RestaurantGalleryImage } from '@/lib/map/useRestaurantDetail';
import { useTranslation } from '@/lib/i18n';
import styles from './MapDetails.module.css';

interface Props {
  images: RestaurantGalleryImage[];
  restaurantName: string;
}

// The sheet reserves native touch scrolling for the vertical axis.
// Move only this photo rail on horizontal drags; never page restaurants.
// The parent keys this component by restaurant so each spot starts at photo 1.
export default function RestaurantGallery({ images, restaurantName }: Props) {
  const { t } = useTranslation();
  const railRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; page: number; horizontal: boolean } | null>(null);
  const dragged = useRef(false);
  const [page, setPage] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const usable = images.filter((img) => img.thumb && img.full);
  if (!usable.length) return null;

  return (
    <>
      <div
        ref={railRef}
        className={styles.rdHeroPhotos}
        data-h-scroll
        role="region"
        aria-label={`${restaurantName}: ${t('map.photos')}`}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          dragged.current = false;
          gesture.current = { x: event.clientX, y: event.clientY, page, horizontal: false };
        }}
        onPointerMove={(event) => {
          const start = gesture.current;
          if (!start) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (!start.horizontal) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            if (Math.abs(dx) <= Math.abs(dy)) {
              gesture.current = null;
              return;
            }
            start.horizontal = true;
            dragged.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.style.scrollSnapType = 'none';
          }
          event.preventDefault();
          event.currentTarget.scrollLeft = start.page * event.currentTarget.clientWidth - dx;
        }}
        onPointerUp={(event) => {
          const start = gesture.current;
          gesture.current = null;
          if (!start?.horizontal) return;
          const dx = event.clientX - start.x;
          const next = Math.max(
            0,
            Math.min(usable.length - 1, start.page + (Math.abs(dx) > 50 ? (dx < 0 ? 1 : -1) : 0))
          );
          event.currentTarget.style.removeProperty('scroll-snap-type');
          event.currentTarget.scrollTo({
            left: next * event.currentTarget.clientWidth,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'instant'
              : 'smooth',
          });
        }}
        onPointerCancel={(event) => {
          const start = gesture.current;
          gesture.current = null;
          event.currentTarget.style.removeProperty('scroll-snap-type');
          if (start)
            event.currentTarget.scrollTo({
              left: start.page * event.currentTarget.clientWidth,
              behavior: 'instant',
            });
        }}
        onClickCapture={(event) => {
          if (dragged.current) {
            event.preventDefault();
            event.stopPropagation();
            dragged.current = false;
          }
        }}
        onScroll={(event) => {
          const rail = event.currentTarget;
          if (rail.clientWidth) setPage(Math.round(rail.scrollLeft / rail.clientWidth));
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          const next = Math.max(
            0,
            Math.min(usable.length - 1, page + (event.key === 'ArrowRight' ? 1 : -1))
          );
          const rail = railRef.current;
          rail?.scrollTo({ left: next * rail.clientWidth, behavior: 'instant' });
          rail?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus({ preventScroll: true });
        }}
      >
        {usable.map((img, index) => (
          <button
            key={img._key}
            type="button"
            className={styles.rdHeroPhoto}
            onClick={() => setOpenIndex(index)}
            aria-label={`${restaurantName}: ${t('map.photos')} ${index + 1}/${usable.length}`}
          >
            <img
              src={img.full}
              alt={img.alt ?? restaurantName}
              draggable={false}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
            />
          </button>
        ))}
      </div>
      {usable.length > 1 && (
        <span className={styles.rdHeroPhotoCount} aria-live="polite" aria-atomic="true">
          {page + 1}/{usable.length}
        </span>
      )}
      <RestaurantGalleryLightbox
        images={usable}
        startIndex={openIndex}
        onClose={() => setOpenIndex(null)}
        restaurantName={restaurantName}
      />
    </>
  );
}
