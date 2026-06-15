'use client'
import { useAuth } from '@/lib/auth'
import { useFavorites } from '@/lib/map/useFavorites'
import { useHeartCount } from '@/lib/map/useHeartCount'
import { HeartIcon } from '@/app/components/map/icons'
import HeartCount from '@/app/components/HeartCount'
import styles from './HeartButton.module.css'

interface HeartButtonProps {
  restaurantId: string
  name: string
  slug?: string
  photo?: string
  district?: string
  locale: string
}

// Heart toggle + count for the SEO restaurant page (which is statically
// generated and had no favorite control before). A heart IS a saved spot:
// reuses useFavorites, so the same toggle drives the map detail too, and the
// public count shows here. The count is live (useHeartCount/onSnapshot), so it
// updates the moment the /api/heart transaction lands — no optimistic offset
// needed. Anon tap → /login (handled inside useFavorites).
// See docs/specs/2026-06-09-hearts-design.md.
export default function HeartButton({ restaurantId, name, slug, photo, district, locale }: HeartButtonProps) {
  const de = locale !== 'en'
  const { favoriteIds, toggle } = useFavorites(useAuth().user?.uid ?? null)
  const { count } = useHeartCount(restaurantId)

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
      {count >= 1 ? (
        <HeartCount restaurantId={restaurantId} />
      ) : (
        <span className={`${styles.label} ${styles.labelMuted}`}>
          {de ? 'Sei der/die Erste, die diesen Spot herzt' : 'Be the first to heart this spot'}
        </span>
      )}
    </div>
  )
}
