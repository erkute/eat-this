'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useMapData, useUnlockedMustEats, resolveUnlockedMustEatIds } from '@/lib/map'
import { useTranslation } from '@/lib/i18n'
import { filterMustEats, type MustEatFilter } from '@/lib/home/mustEatsGallery'
import MustEatImageLightbox from '@/app/components/map/MustEatImageLightbox'
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
  const { unlockedIds: storedUnlockedIds } = useUnlockedMustEats(uid)
  const { t } = useTranslation()
  const [filter, setFilter] = useState<MustEatFilter>('all')

  // The first client render must match SSR exactly: SSR can only render the
  // anonymous view (uid=null) from `initialMapData`, so the pre-mount render
  // here mirrors that — uid=null + initialMapData fed through the shared
  // face-up helper. That yields the deterministic anon trial split (first-10
  // restaurants' must-eats + server reveals) face-up, identical on server and
  // first client paint. After mount, swap to the live dataset + the real uid
  // so signed-in stored unlocks + proximity reveals show too — exactly like
  // the map.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const effUid = mounted ? uid : null
  const restaurants = mounted ? live.restaurants : initialMapData.restaurants
  const mustEats = mounted ? live.mustEats : initialMapData.mustEats
  const revealedMustEatIds = mounted
    ? live.revealedMustEatIds
    : new Set<string>(initialMapData.revealedMustEatIds)
  const storedSet = mounted ? storedUnlockedIds : new Set<string>()
  const faceUp = useMemo(
    () =>
      resolveUnlockedMustEatIds({
        uid: effUid,
        storedUnlockedIds: storedSet,
        revealedMustEatIds,
        mustEats,
        restaurants,
      }),
    [effUid, storedSet, revealedMustEatIds, mustEats, restaurants],
  )
  const visible = filterMustEats(mustEats, faceUp, filter)

  // Tap a card → deck-style fly-out zoom (same lightbox the profile deck and
  // the map detail use). Works for open cards (the dish art) AND locked cards
  // (the card-back). Tapping the zoomed card flies it back to its slot.
  const [expanded, setExpanded] = useState<{ imageUrl: string; alt: string; rect: DOMRect; id: string } | null>(null)
  // The origin card is hidden while its zoomed clone is on screen so it doesn't
  // show twice; revealed again in onExitComplete — the same frame the fly-back
  // clone unmounts — so there's no blink between clone and origin.
  const [hiddenId, setHiddenId] = useState<string | null>(null)
  const expandedRef = useRef(expanded)
  expandedRef.current = expanded
  const closeExpanded = () => setExpanded(null)
  const handleExitComplete = () => {
    // If another card was opened mid fly-back, its origin must stay hidden.
    if (!expandedRef.current) setHiddenId(null)
  }

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
          const open = faceUp.has(m._id)
          const imageUrl = open ? m.image : CARD_BACK
          const alt = open ? m.dish : t('mustEats.covered')
          return (
            <button
              key={m._id}
              type="button"
              className={open ? styles.medish : `${styles.medish} ${styles.locked}`}
              style={{ visibility: hiddenId === m._id ? 'hidden' : undefined }}
              onClick={(e) => {
                setHiddenId(m._id)
                setExpanded({ imageUrl, alt, rect: e.currentTarget.getBoundingClientRect(), id: m._id })
              }}
            >
              <div className={styles.ph}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt={alt} loading="lazy" />
              </div>
            </button>
          )
        })}
      </div>

      <MustEatImageLightbox
        imageUrl={expanded?.imageUrl ?? ''}
        alt={expanded?.alt ?? ''}
        originRect={expanded?.rect ?? null}
        onClose={closeExpanded}
        onExitComplete={handleExitComplete}
      />
    </>
  )
}
