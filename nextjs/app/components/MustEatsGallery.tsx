'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { resolveUnlockedMustEatIds } from '@/lib/map'
import { useTranslation } from '@/lib/i18n'
import { filterMustEats, type MustEatFilter } from '@/lib/home/mustEatsGallery'
import LazyMustEatImageLightbox from '@/app/components/map/LazyMustEatImageLightbox'
import type { InitialMustEatsData } from '@/lib/map/initial-surface-data'
import styles from './MustEatsSection.module.css'

const CARD_BACK = '/pics/card-back.webp?v=6'

interface Props {
  initialMapData: InitialMustEatsData
}

const FILTERS: MustEatFilter[] = ['all', 'open', 'locked']
const FILTER_LABEL: Record<MustEatFilter, string> = {
  all: 'mustEats.filterAll',
  open: 'mustEats.filterOpen',
  locked: 'mustEats.filterLocked',
}

export default function MustEatsGallery({ initialMapData }: Props) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<MustEatFilter>('all')

  // Deterministic public catalog: every visitor — guest or signed-in — sees
  // the same anon view (10 curated cards + spot-of-day face-up, rest covered).
  // The personal collection lives in the profile; this page never
  // personalizes. Pure function of `initialMapData` → identical on server and
  // client, no hydration risk.
  const faceUp = useMemo(
    () =>
      resolveUnlockedMustEatIds({
        uid: null,
        storedUnlockedIds: new Set<string>(),
        revealedMustEatIds: new Set<string>(initialMapData.revealedMustEatIds),
      }),
    [initialMapData],
  )
  const visible = filterMustEats(initialMapData.mustEats, faceUp, filter)

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
  const handleOpenReady = useCallback(() => {
    const current = expandedRef.current
    if (current) setHiddenId(current.id)
  }, [])
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
          const imageUrl = (open && m.image) || CARD_BACK
          const alt = (open ? m.dish : undefined) ?? t('mustEats.covered')
          return (
            <button
              key={m._id}
              type="button"
              className={open ? styles.medish : `${styles.medish} ${styles.locked}`}
              style={{ visibility: hiddenId === m._id ? 'hidden' : undefined }}
              onClick={(e) => {
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

      <LazyMustEatImageLightbox
        active={Boolean(expanded || hiddenId)}
        imageUrl={expanded?.imageUrl ?? ''}
        alt={expanded?.alt ?? ''}
        originRect={expanded?.rect ?? null}
        onClose={closeExpanded}
        onOpenReady={handleOpenReady}
        onExitComplete={handleExitComplete}
      />
    </>
  )
}
