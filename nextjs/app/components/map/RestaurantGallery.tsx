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
  const preview = usable[0]
  if (!usable.length) return null
  return (
    <>
      <section className={styles.rdGalleryBlock} aria-label="Fotos">
        <div className={styles.rdGallery} role="list">
          <button
            key={preview._key}
            type="button"
            role="listitem"
            className={styles.rdGalleryThumb}
            onClick={() => setOpenIndex(0)}
          >
            <img src={preview.thumb} alt={preview.alt ?? restaurantName} loading="lazy" decoding="async" />
          </button>
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
