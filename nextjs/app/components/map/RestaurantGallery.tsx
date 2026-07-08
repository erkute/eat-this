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
// Photo attribution is shown in the full-size viewer only.
export default function RestaurantGallery({ images, restaurantName }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  // Defensive: a broken asset ref yields null thumb/full from GROQ despite
  // the required-string type — drop those instead of rendering empty slots.
  const usable = images.filter((img) => img.thumb && img.full)
  if (!usable.length) return null
  return (
    <>
      <section className={styles.rdGalleryBlock} aria-label="Fotos">
        <div className={styles.rdGallery} role="list">
          {usable.map((img, index) => (
            <button
              key={img._key}
              type="button"
              role="listitem"
              className={styles.rdGalleryThumb}
              onClick={() => setOpenIndex(index)}
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
