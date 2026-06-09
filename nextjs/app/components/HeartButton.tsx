'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useFavorites } from '@/lib/map/useFavorites'
import { useHeartCount } from '@/lib/map/useHeartCount'
import { heartLabel } from '@/lib/map/heartLabel'
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

// Heart toggle + count for the SEO restaurant page (which is statically
// generated and had no favorite control before). A heart IS a saved spot:
// reuses useFavorites, so the same toggle drives the map detail too, and the
// public count (server-maintained) shows here. Anon tap → /login (handled
// inside useFavorites). See docs/specs/2026-06-09-hearts-design.md.
export default function HeartButton({ restaurantId, name, slug, photo, district, locale }: HeartButtonProps) {
  const de = locale !== 'en'
  const { user } = useAuth()
  const { favoriteIds, toggle } = useFavorites(user?.uid ?? null)
  const { count } = useHeartCount(restaurantId)
  // Optimistic offset so the count reacts immediately (the server counter is
  // updated a beat later by the /api/heart transaction; useHeartCount re-reads
  // it on the next mount).
  const [delta, setDelta] = useState(0)

  const hearted = favoriteIds.has(restaurantId)
  const displayCount = Math.max(0, count + delta)
  const label =
    heartLabel(displayCount, locale) ?? (de ? 'Herz diesen Spot' : 'Be the first to love it')

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
        onClick={() => {
          // Only nudge the optimistic count when the user is logged in — an
          // anon click is redirected to /login by toggle() and nothing is
          // written, so the count must not move.
          if (user?.uid) setDelta(d => d + (hearted ? -1 : 1))
          void toggle({ _id: restaurantId, name, slug, photo, district })
        }}
      >
        <HeartIcon filled={hearted} />
      </button>
      <span className={heartLabel(displayCount, locale) ? styles.label : `${styles.label} ${styles.labelMuted}`}>
        {label}
      </span>
    </div>
  )
}
