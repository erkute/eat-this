'use client'
import { useState } from 'react'
import MustEatImageLightbox from './MustEatImageLightbox'
import type { RestaurantGalleryImage } from '@/lib/map/useRestaurantDetail'
import styles from './map.module.css'

interface Props {
  images: RestaurantGalleryImage[]
  restaurantName: string
}

// Horizontal swipe strip of curated Places photos under the detail hero.
// Tapping a thumb flies it into the existing MustEatImageLightbox; per-photo
// credit shows as a thumb overlay and full-size in the lightbox (Places
// attribution requirement).
export default function RestaurantGallery({ images, restaurantName }: Props) {
  const [open, setOpen] = useState<{ img: RestaurantGalleryImage; rect: DOMRect } | null>(null)
  // Defensive: a broken asset ref yields null thumb/full from GROQ despite
  // the required-string type — drop those instead of rendering empty slots.
  const usable = images.filter((img) => img.thumb && img.full)
  if (!usable.length) return null
  return (
    <>
      <div className={styles.rdGallery} role="list" aria-label="Fotos">
        {usable.map((img) => (
          <button
            key={img._key}
            type="button"
            role="listitem"
            className={styles.rdGalleryThumb}
            onClick={(e) => setOpen({ img, rect: e.currentTarget.getBoundingClientRect() })}
          >
            <img src={img.thumb} alt={img.alt ?? restaurantName} loading="lazy" decoding="async" />
            {img.credit && <span className={styles.rdGalleryCredit} aria-hidden="true">{img.credit}</span>}
          </button>
        ))}
      </div>
      <MustEatImageLightbox
        imageUrl={open?.img.full ?? ''}
        alt={open?.img.alt ?? restaurantName}
        credit={open?.img.credit}
        creditUrl={open?.img.creditUrl}
        originRect={open?.rect ?? null}
        onClose={() => setOpen(null)}
      />
    </>
  )
}
