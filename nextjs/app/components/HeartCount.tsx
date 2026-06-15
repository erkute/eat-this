'use client'
import { useLocale } from 'next-intl'
import { useHeartCount } from '@/lib/map/useHeartCount'
import { heartLabel, heartCountShort } from '@/lib/map/heartLabel'
import styles from './HeartCount.module.css'

// Public heart count as a frosted-glass badge for a restaurant hero photo.
// Shows the compact number ("142", "1,2k") next to a coral heart glyph; the
// full phrase ("geherzt von 142 Leuten") rides along as the accessible label.
// Renders nothing below 1 — no "geherzt von 0", no layout jump. The host
// surface positions it via `className`. See docs/specs/2026-06-09-hearts-design.md.
export default function HeartCount({ restaurantId, className }: { restaurantId: string; className?: string }) {
  const locale = useLocale()
  const { count } = useHeartCount(restaurantId)
  const full = heartLabel(count, locale)
  if (!full) return null
  return (
    <span
      className={className ? `${styles.heartCount} ${className}` : styles.heartCount}
      aria-label={full}
      title={full}
    >
      {heartCountShort(count, locale)}
    </span>
  )
}
