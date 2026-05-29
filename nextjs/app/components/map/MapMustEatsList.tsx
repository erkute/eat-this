'use client'
import { type Ref } from 'react'
import type { MapMustEat } from '@/lib/types'
import {
  haversineDistance,
  formatWalkingTime,
  abbreviateBezirk,
  type UserLocation,
  type UserTier,
} from '@/lib/map'
import BoosterOfferInline from './BoosterOfferInline'
import MapListEmpty from './MapListEmpty'
import { normalizeName } from '@/lib/normalizeName'
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

// Booster slot — inserts the inline booster card at this position in the
// row sequence so a free user sees the "Karten freischalten"-pitch about
// 10 entries deep, matching the restaurant list rhythm.
const BOOSTER_AT = 10

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
    <div ref={contentRef} className={`${styles.listScroll} ${styles.listScrollMustEats}`}>
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

function MustEatRows({
  displayedMustEats,
  unlockedIds,
  selectedMustEat,
  location,
  uid,
  userTier,
  onSelect,
}: RowsProps) {
  const showBooster = userTier === 'starter'
  const nodes: React.ReactNode[] = []
  let pos = 0

  for (const m of displayedMustEats) {
    const isUnlocked = unlockedIds.has(m._id)
    const district = abbreviateBezirk(m.restaurant.district ?? null)
    const meters = location
      ? haversineDistance(location.lat, location.lng, m.restaurant.lat, m.restaurant.lng)
      : null
    const walkingTime = meters !== null ? formatWalkingTime(meters) : null

    // Title: dish name when aufgedeckt; "Verdeckt" placeholder otherwise so
    // the dish stays a surprise until the user is on-site.
    const title = isUnlocked ? m.dish : 'Verdeckt'

    nodes.push(
      <button
        key={m._id}
        type="button"
        className={`${styles.rrow} ${selectedMustEat?._id === m._id ? styles.rrowActive : ''}`}
        onClick={() => onSelect(m)}
      >
        <div className={styles.rrowCoral}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={isUnlocked && m.image ? m.image : '/pics/card-back.webp?v=4'}
            alt=""
            className={styles.musteatRowBack}
            aria-hidden="true"
            draggable={false}
          />
        </div>

        <div className={styles.rrowMeta}>
          <p className={styles.rrowEye}>
            <span className={styles.rrowBezirk}>{normalizeName(m.restaurant.name)}</span>
            {district && (
              <span className={`${styles.rrowCat} ${styles.rrowCatBelow}`}>{district}</span>
            )}
          </p>
          <h3 className={styles.rrowTitle}>{normalizeName(title)}</h3>
          {walkingTime && (
            <p className={styles.rrowInfo}>
              <span>
                <svg className={styles.walkIco} viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7" />
                </svg>
                {walkingTime}
              </span>
            </p>
          )}
        </div>
      </button>
    )

    pos++

    if (showBooster && pos === BOOSTER_AT) {
      nodes.push(
        <BoosterOfferInline key="booster" uid={uid} variant="list" />
      )
    }
  }

  return <>{nodes}</>
}
