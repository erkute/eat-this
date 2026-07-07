'use client'
import { useAuth } from '@/lib/auth'
import { useFavorites } from '@/lib/map/useFavorites'
import { HeartIcon } from '@/app/components/map/icons'
import styles from './HeartButton.module.css'

interface HeartButtonProps {
  restaurantId: string
  name: string
  slug?: string
  photo?: string
  district?: string
  locale: string
}

// Personal "heart this spot" toggle for the SEO restaurant page (a client
// island on an otherwise-static page). A heart IS a saved spot — reuses
// useFavorites, so the same toggle drives the map detail too, and hearting here
// bumps the public count shown as a badge on the hero photo (see HeartCount).
// The public count is deliberately kept separate from this personal control
// (Airbnb-style: wishlist heart ≠ social-proof badge). Anon tap opens the
// shared login modal (handled inside useFavorites).
// See docs/specs/2026-06-09-hearts-design.md.
export default function HeartButton({ restaurantId, name, slug, photo, district, locale }: HeartButtonProps) {
  const de = locale !== 'en'
  const { favoriteIds, toggle } = useFavorites(useAuth().user?.uid ?? null)
  const hearted = favoriteIds.has(restaurantId)

  return (
    <div className={styles.row}>
      <button
        type="button"
        className={hearted ? `${styles.btn} ${styles.btnActive}` : styles.btn}
        aria-pressed={hearted}
        aria-label={
          hearted
            ? (de ? 'Herz entfernen' : 'Remove heart')
            : (de ? 'Spot herzen' : 'Heart this spot')
        }
        onClick={() => { void toggle({ _id: restaurantId, name, slug, photo, district }) }}
      >
        <HeartIcon filled={hearted} />
      </button>
    </div>
  )
}
