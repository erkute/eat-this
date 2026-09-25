'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Image from '@/app/components/SiteImage';
import { safeHttpUrl } from '@/lib/safeHttpUrl';
import type { RestaurantGalleryImage } from '@/lib/map/useRestaurantDetail';
import styles from './SpotGallery.module.css';

// Erst mit dem ersten Tippen laden: der Viewer bringt framer-motion mit, und
// die meisten Besucher öffnen die Galerie nie.
const RestaurantGalleryLightbox = dynamic(() => import('./map/RestaurantGalleryLightbox'), {
  ssr: false,
});

interface Props {
  images: RestaurantGalleryImage[];
  /** Normalisierter Anzeigename — für Alt-Texte und den Viewer. */
  name: string;
  locale: 'de' | 'en';
  /** Klasse für den Foto-Nachweis, damit er dem unter dem Titelfoto gleicht. */
  creditClassName: string;
}

/**
 * Die Bildstrecke der Spot-Seite: stille Kacheln, ein Tipp öffnet das Foto im
 * Vollbild — derselbe Viewer wie im Map-Sheet, mit Wischen, Pfeiltasten und
 * Zwei-Finger-Zoom.
 *
 * Bis 25.09.2026 war die Strecke auf dem Telefon ein wischbares Rail mit
 * `scroll-snap-type: mandatory` („bewegen sich so komisch beim wischen … die
 * sollen still sein") und ließ sich nirgends vergrößern. Jetzt steht sie als
 * Raster still; bewegt wird nur im Viewer.
 */
export default function SpotGallery({ images, name, locale, creditClassName }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const de = locale === 'de';

  return (
    <section
      className={styles.gallery}
      data-count={images.length}
      aria-label={de ? 'Bilder' : 'Photos'}
    >
      {images.map((img, i) => {
        const alt = img.alt || `${name} ${de ? 'Foto' : 'photo'} ${i + 1}`;
        const creditHref = safeHttpUrl(img.creditUrl);
        return (
          <figure key={img._key} className={styles.item}>
            <button
              type="button"
              className={styles.frame}
              onClick={() => setOpenIndex(i)}
              aria-label={de ? `${alt} vergrößern` : `Enlarge ${alt}`}
            >
              <Image
                /* `thumb` ist der 400x300-Streifen des Map-Sheets — zu grob
                   für Retina. `full` kommt in derselben Projektion mit; die
                   Kachel lädt über `sizes` nur die passende Stufe, die volle
                   Größe erst der Viewer. */
                src={img.full}
                alt={alt}
                fill
                /* Telefon: zwei Spalten (allein volle Breite). Ab Tablet vier,
                   ab 1100px fünf feste Spuren in der 1240er-Spalte — eine
                   Kachel ist dort höchstens 232px breit. */
                sizes="(max-width: 699px) 50vw, (max-width: 1099px) 25vw, 240px"
                quality={85}
                className={styles.img}
              />
            </button>
            {img.credit && (
              <figcaption className={creditClassName}>
                {creditHref ? (
                  <a href={creditHref} target="_blank" rel="noopener noreferrer">
                    {img.credit}
                  </a>
                ) : (
                  img.credit
                )}
              </figcaption>
            )}
          </figure>
        );
      })}
      {openIndex !== null && (
        <RestaurantGalleryLightbox
          images={images}
          startIndex={openIndex}
          onClose={() => setOpenIndex(null)}
          restaurantName={name}
        />
      )}
    </section>
  );
}
