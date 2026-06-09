'use client'
import { useLocale } from 'next-intl'
import { useHeartCount } from '@/lib/map/useHeartCount'
import { heartLabel } from '@/lib/map/heartLabel'
import styles from './HeartCount.module.css'

// Read-only "geherzt von N Leuten" line. Renders nothing until a count of at
// least 1 is known (heartLabel returns null below 1), so no layout jump and no
// "loved by 0". See docs/specs/2026-06-09-hearts-design.md.
export default function HeartCount({ restaurantId, className }: { restaurantId: string; className?: string }) {
  const locale = useLocale()
  const { count } = useHeartCount(restaurantId)
  const label = heartLabel(count, locale)
  if (!label) return null
  return <span className={className ? `${styles.heartCount} ${className}` : styles.heartCount}>{label}</span>
}
