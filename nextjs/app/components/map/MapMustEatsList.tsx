'use client'
import { type Ref } from 'react'
import type { MapMustEat } from '@/lib/types'
import { haversineDistance, formatDistance, type UserLocation, type UserTier } from '@/lib/map'
import { useTranslation } from '@/lib/i18n'
import BoosterOfferInline from './BoosterOfferInline'
import MapListEmpty from './MapListEmpty'
import styles from './map.module.css'

interface Props {
  displayedMustEats: MapMustEat[]
  unlockedIds: Set<string>
  selectedMustEat: MapMustEat | null
  location: UserLocation | null
  uid: string | null
  userTier: UserTier
  contentRef: Ref<HTMLDivElement | null>
  onSelect: (mustEat: MapMustEat) => void
}

export default function MapMustEatsList({
  displayedMustEats,
  unlockedIds,
  selectedMustEat,
  location,
  uid,
  userTier,
  contentRef,
  onSelect,
}: Props) {
  return (
    <div ref={contentRef} className={styles.listScroll}>
      {displayedMustEats.length === 0 ? (
        <MapListEmpty />
      ) : (
        <MustEatRows
          displayedMustEats={displayedMustEats}
          unlockedIds={unlockedIds}
          selectedMustEat={selectedMustEat}
          location={location}
          uid={uid}
          userTier={userTier}
          onSelect={onSelect}
        />
      )}
    </div>
  )
}

interface RowsProps {
  displayedMustEats: MapMustEat[]
  unlockedIds: Set<string>
  selectedMustEat: MapMustEat | null
  location: UserLocation | null
  uid: string | null
  userTier: UserTier
  onSelect: (mustEat: MapMustEat) => void
}

// Splits the list into unlocked → locked sections. Booster CTA only shows
// for the starter tier — All-Berlin already owns everything, and anon
// users get the lighter AnonHintBar instead (rendered by MapSectionBody).
function MustEatRows({
  displayedMustEats,
  unlockedIds,
  selectedMustEat,
  location,
  uid,
  userTier,
  onSelect,
}: RowsProps) {
  const { t } = useTranslation()
  const unlocked = displayedMustEats.filter(m => unlockedIds.has(m._id))
  const locked = displayedMustEats.filter(m => !unlockedIds.has(m._id))
  const showBooster = userTier === 'starter'
  const insertAt = Math.min(10, unlocked.length + locked.length)

  const nodes: React.ReactNode[] = []
  let pos = 0
  const maybeInsertBooster = () => {
    if (showBooster && pos === insertAt) {
      nodes.push(<BoosterOfferInline key="booster" uid={uid} variant="list" />)
    }
  }

  if (unlocked.length > 0) {
    nodes.push(<div key="lbl-u" className={styles.mustDeckSectionLabel}>{t('map.sectionUnlocked')}</div>)
  }
  for (const m of unlocked) {
    nodes.push(
      <button
        key={m._id}
        className={`${styles.row} ${selectedMustEat?._id === m._id ? styles.rowActive : ''}`}
        onClick={() => onSelect(m)}
      >
        <img src={m.image} alt="" className={styles.mustDeckThumb} loading="lazy" />
        <div className={styles.rowMain}>
          <div className={styles.rowName}>{m.dish}</div>
          <div className={styles.mustDeckRestaurant}>{m.restaurant.name}</div>
          <div className={styles.rowMeta}>
            <span>{[m.restaurant.district, m.price].filter(Boolean).join(' · ')}</span>
          </div>
        </div>
        <div className={styles.rowSide} />
      </button>
    )
    pos++
    maybeInsertBooster()
  }

  if (locked.length > 0) {
    nodes.push(<div key="lbl-l" className={styles.mustDeckSectionLabel}>{t('map.sectionLocked')}</div>)
  }
  for (const m of locked) {
    const dist = location
      ? haversineDistance(location.lat, location.lng, m.restaurant.lat, m.restaurant.lng)
      : null
    nodes.push(
      <button
        key={m._id}
        className={`${styles.row} ${selectedMustEat?._id === m._id ? styles.rowActive : ''}`}
        onClick={() => onSelect(m)}
      >
        <div className={styles.mustDeckThumbWrap}>
          <img src="/pics/card-back.webp" alt="" className={styles.mustDeckThumbCard} loading="lazy" />
        </div>
        <div className={styles.rowMain}>
          <div className={styles.rowName}>{m.restaurant.name}</div>
          <div className={styles.mustDeckRestaurant}>{m.restaurant.district}</div>
          <div className={styles.mustDeckLockedTag}>
            <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/>
            </svg>
            {t('map.lockedBadge')}
          </div>
        </div>
        {dist !== null && (
          <div className={styles.mustDeckDist}>{formatDistance(dist)}</div>
        )}
        <div className={styles.rowSide} />
      </button>
    )
    pos++
    maybeInsertBooster()
  }

  return <>{nodes}</>
}
