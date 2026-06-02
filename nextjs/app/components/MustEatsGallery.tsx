'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useAuth } from '@/lib/auth'
import { useMapData, useUnlockedMustEats } from '@/lib/map'
import { useTranslation } from '@/lib/i18n'
import { normalizeName } from '@/lib/normalizeName'
import { filterMustEats, type MustEatFilter } from '@/lib/home/mustEatsGallery'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'
import styles from './MustEatsSection.module.css'

const CARD_BACK = '/pics/card-back.webp?v=5'

interface Props {
  initialMapData: InitialMapData
}

const FILTERS: MustEatFilter[] = ['all', 'open', 'locked']
const FILTER_LABEL: Record<MustEatFilter, string> = {
  all: 'mustEats.filterAll',
  open: 'mustEats.filterOpen',
  locked: 'mustEats.filterLocked',
}

export default function MustEatsGallery({ initialMapData }: Props) {
  const { user, loading: authLoading } = useAuth()
  const uid = user?.uid ?? null
  const live = useMapData({ uid, authLoading, initialMapData })
  const { unlockedIds } = useUnlockedMustEats(uid)
  const { t } = useTranslation()
  const [filter, setFilter] = useState<MustEatFilter>('all')

  // The first client render must match SSR: anon initialMapData + an empty
  // unlocked set (so every card paints face-down, exactly like the server
  // output). Only after mount switch to the live dataset + the resolved
  // unlocked set — otherwise the grid mismatches on hydrate.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const mustEats = mounted ? live.mustEats : initialMapData.mustEats
  const activeUnlocked = mounted ? unlockedIds : new Set<string>()
  const visible = filterMustEats(mustEats, activeUnlocked, filter)

  return (
    <>
      <div className={styles.filters}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={f === filter ? `${styles.fchip} ${styles.fchipOn}` : styles.fchip}
            aria-pressed={f === filter}
            onClick={() => setFilter(f)}
          >
            {t(FILTER_LABEL[f])}
          </button>
        ))}
      </div>

      <div className={styles.grid}>
        {visible.map((m) => {
          const open = activeUnlocked.has(m._id)
          const href = m.restaurant.slug
            ? `/map?r=${m.restaurant.slug}`
            : `/map?me=${m._id}`
          return (
            <Link
              key={m._id}
              href={href}
              rel="nofollow"
              className={open ? styles.medish : `${styles.medish} ${styles.locked}`}
            >
              <div className={styles.ph}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={open ? m.image : CARD_BACK}
                  alt={open ? m.dish : t('mustEats.covered')}
                  loading="lazy"
                />
              </div>
              <div className={styles.lbl}>
                <h4 className={styles.nm}>{open ? m.dish : t('mustEats.covered')}</h4>
                <div className={styles.rest}>{normalizeName(m.restaurant.name)}</div>
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}
