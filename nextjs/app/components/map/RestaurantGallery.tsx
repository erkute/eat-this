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

/* Blättern wie bei Instagram und Google Maps: der Finger bewegt einen echten
   Scroll-Container, `scroll-snap-stop: always` rastet pro Wisch genau ein Bild
   weiter, Schwung und Achsensperre kommen vom Browser. Die Vorgängerin zog
   `scrollLeft` per pointermove selbst nach, auf `touch-action: pan-y` —
   dadurch hing das Bild auf iOS einen Frame hinter dem Finger, ein schneller
   kurzer Wisch blätterte nicht, und sobald ein Wisch leicht schräg lief,
   übernahm iOS ihn als vertikalen Scroll, schickte pointercancel, und das Bild
   sprang ohne Bewegung zurück. Ziehen per JS bleibt nur für die Maus, die
   keinen nativen Wisch hat. Der Parent setzt `key` pro Restaurant, damit jeder
   Spot bei Foto 1 beginnt. */
export default function RestaurantGallery({ images, restaurantName }: Props) {
  const { t } = useTranslation();
  const railRef = useRef<HTMLDivElement>(null);
  const mouseDrag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [page, setPage] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const usable = images.filter((img) => img.thumb && img.full);
  if (!usable.length) return null;

  const clampPage = (n: number) => Math.max(0, Math.min(usable.length - 1, n));
  const scrollToPage = (rail: HTMLElement, n: number) =>
    rail.scrollTo({
      left: clampPage(n) * rail.clientWidth,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });

  return (
    <>
      <div
        ref={railRef}
        className={styles.rdHeroPhotos}
        data-h-scroll
        role="region"
        aria-label={`${restaurantName}: ${t('map.photos')}`}
        onPointerDown={(event) => {
          if (event.pointerType !== 'mouse' || event.button !== 0) return;
          suppressClick.current = false;
          mouseDrag.current = {
            x: event.clientX,
            left: event.currentTarget.scrollLeft,
            moved: false,
          };
        }}
        onPointerMove={(event) => {
          const drag = mouseDrag.current;
          if (!drag) return;
          const dx = event.clientX - drag.x;
          if (!drag.moved) {
            if (Math.abs(dx) < 6) return;
            drag.moved = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            // Snap würde jeden Zwischenstand sofort zurückziehen.
            event.currentTarget.style.scrollSnapType = 'none';
          }
          event.currentTarget.scrollLeft = drag.left - dx;
        }}
        onPointerUp={(event) => {
          const drag = mouseDrag.current;
          mouseDrag.current = null;
          if (!drag?.moved) return;
          suppressClick.current = true;
          const rail = event.currentTarget;
          const dx = event.clientX - drag.x;
          const from = Math.round(drag.left / rail.clientWidth);
          rail.style.removeProperty('scroll-snap-type');
          scrollToPage(rail, from + (Math.abs(dx) > 40 ? (dx < 0 ? 1 : -1) : 0));
        }}
        onPointerCancel={(event) => {
          if (!mouseDrag.current) return;
          mouseDrag.current = null;
          event.currentTarget.style.removeProperty('scroll-snap-type');
        }}
        onClickCapture={(event) => {
          if (!suppressClick.current) return;
          suppressClick.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
        onScroll={(event) => {
          const rail = event.currentTarget;
          if (rail.clientWidth) setPage(clampPage(Math.round(rail.scrollLeft / rail.clientWidth)));
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          const next = clampPage(page + (event.key === 'ArrowRight' ? 1 : -1));
          const rail = railRef.current;
          if (!rail) return;
          scrollToPage(rail, next);
          rail.querySelectorAll<HTMLButtonElement>('button')[next]?.focus({ preventScroll: true });
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
              /* Die Nachbarbilder müssen schon da sein, wenn der Finger sie
                 hereinzieht — `lazy` lädt in einem Querscroller erst, wenn
                 das Bild sichtbar wird, und man wischt in eine leere Fläche.
                 Der Wechsel lazy → eager stößt das Laden sofort an. */
              loading={Math.abs(index - page) <= 1 ? 'eager' : 'lazy'}
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
