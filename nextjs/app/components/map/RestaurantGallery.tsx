'use client'
import { useState } from 'react'
import RestaurantGalleryLightbox from './RestaurantGalleryLightbox'
import type { RestaurantGalleryImage } from '@/lib/map/useRestaurantDetail'
import styles from './map.module.css'

interface Props {
  images: RestaurantGalleryImage[]
  restaurantName: string
}

// Horizontal swipe strip of curated Places photos under the detail hero.
// Tapping a thumb opens the flat, swipeable gallery viewer at that index.
// Photo attribution stays out of the compact detail strip and appears with
// the full-size image in the viewer.
export default function RestaurantGallery({ images, restaurantName }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  // Defensive: a broken asset ref yields null thumb/full from GROQ despite
  // the required-string type — drop those instead of rendering empty slots.
  const usable = images.filter((img) => img.thumb && img.full)
  if (!usable.length) return null
  return (
    <>
      {/* data-h-scroll: tells useSwipePager to leave horizontal gestures that
          start here to the carousel's native scroll instead of paging. */}
      <section className={styles.rdGalleryBlock} aria-label="Fotos">
        <div className={styles.rdGallery} role="list" data-h-scroll>
          {usable.map((img, i) => (
            <button
              key={img._key}
              type="button"
              role="listitem"
              className={styles.rdGalleryThumb}
              onClick={() => setOpenIndex(i)}
            >
              <img src={img.thumb} alt={img.alt ?? restaurantName} loading="lazy" decoding="async" />
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
  )
}
