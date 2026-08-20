'use client';
import { useState } from 'react';
import RestaurantGalleryLightbox from './RestaurantGalleryLightbox';
import type { RestaurantGalleryImage } from '@/lib/map/useRestaurantDetail';
import { useTranslation } from '@/lib/i18n';
import styles from './MapDetails.module.css';

interface Props {
  images: RestaurantGalleryImage[];
  restaurantName: string;
}

// Horizontal swipe strip of curated Places photos under the detail hero.
// Tapping a thumb opens the flat, swipeable gallery viewer at that index.
// Photo attribution is shown in the full-size viewer only.
export default function RestaurantGallery({ images, restaurantName }: Props) {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // Defensive: a broken asset ref yields null thumb/full from GROQ despite
  // the required-string type — drop those instead of rendering empty slots.
  const usable = images.filter((img) => img.thumb && img.full);
  if (!usable.length) return null;
  const heading = t('map.photos');
  return (
    <>
      {/* Titled like Must Eats, and each print numbered "01/05": the strip used
          to start mid-sheet with no label and a blank white band under every
          photo, which read as leftover chrome rather than a set of prints. The
          count also tells you the row keeps going past the edge. */}
      <section className={styles.rdGalleryBlock} aria-label={heading}>
        <div className={styles.rdGalleryHead}>
          <h2 className={styles.rdSecH}>{heading}</h2>
        </div>
        <div className={styles.rdGallery} data-h-scroll>
          {usable.map((img, index) => (
            <button
              key={img._key}
              type="button"
              className={styles.rdGalleryThumb}
              onClick={() => setOpenIndex(index)}
              aria-label={`${restaurantName}: ${heading} ${index + 1}/${usable.length}`}
            >
              <img
                src={img.thumb}
                alt={img.alt ?? restaurantName}
                loading="lazy"
                decoding="async"
              />
              <span className={styles.rdGalleryNum} aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
                <i className={styles.rdGalleryNumTotal}>
                  /{String(usable.length).padStart(2, '0')}
                </i>
              </span>
            </button>
          ))}
        </div>
      </section>
      <RestaurantGalleryLightbox
        images={usable}
        startIndex={openIndex}
        onClose={() => setOpenIndex(null)}
        restaurantName={restaurantName}
      />
    </>
  );
}
