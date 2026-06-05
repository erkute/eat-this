'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useAuth } from '@/lib/auth'
import { useMapData, useUnlockedMustEats, resolveUnlockedMustEatIds } from '@/lib/map'
import { useUserLocationContext } from '@/lib/map/UserLocationContext'
import { haversineDistance, formatWalkingTime } from '@/lib/map/distance'
import { normalizeName } from '@/lib/normalizeName'
import { nearestRestaurants, nearbyMustEats } from '@/lib/home/nearby'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'
import styles from './HubNearby.module.css'

const MITTE = { lat: 52.52, lng: 13.405 }
const CARD_BACK = '/pics/card-back.webp?v=5'

interface Props {
  initialMapData: InitialMapData
}

export default function HubNearby({ initialMapData }: Props) {
  const t = useTranslations('hub.nearby')
  const { user, loading: authLoading } = useAuth()
  const uid = user?.uid ?? null
  const live = useMapData({ uid, authLoading, initialMapData })
  const { unlockedIds: storedUnlockedIds } = useUnlockedMustEats(uid)
  const { location, request } = useUserLocationContext()
  // The first client render must match SSR (anon initialMapData + Mitte). Only
  // after mount switch to live data (which may be the cached signed-in payload)
  // + the resolved geolocation — otherwise the nearby list/distances mismatch
  // on hydrate.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const restaurants = mounted ? live.restaurants : initialMapData.restaurants
  const mustEats = mounted ? live.mustEats : initialMapData.mustEats
  const activeLocation = mounted ? location : null
  const loc = activeLocation ?? MITTE

  // Schatzkarte: nur VERDECKTE Karten in der Nähe — „geh hin und dreh sie
  // um". Face-up-Showcase ist der Job von HubMustEatsTeaser.
  const publicFaceUpIds = useMemo(
    () => new Set<string>(initialMapData.revealedMustEatIds),
    [initialMapData],
  )
  const faceUp = useMemo(
    () =>
      resolveUnlockedMustEatIds({
        uid: mounted ? uid : null,
        storedUnlockedIds: mounted ? storedUnlockedIds : new Set<string>(),
        revealedMustEatIds: mounted
          ? live.revealedMustEatIds
          : new Set<string>(initialMapData.revealedMustEatIds),
        publicFaceUpIds,
      }),
    [mounted, uid, storedUnlockedIds, live.revealedMustEatIds, initialMapData, publicFaceUpIds],
  )
  const faceDown = useMemo(
    () => mustEats.filter((m) => !faceUp.has(m._id)),
    [mustEats, faceUp],
  )

  const cards = nearestRestaurants(restaurants, loc, 4)
  const me = nearbyMustEats(faceDown, loc, 1000, 4)
  if (cards.length === 0) return null

  return (
    <section className={styles.section} data-hub-nearby="">
      <div className={styles.head}>
        <h2 className={styles.heading}>{t('title')}</h2>
        <button
          type="button"
          className={styles.locBtn}
          onClick={() => request()}
          aria-label={t('locationAria')}
        >
          <span>{t('location')}</span>
        </button>
      </div>
      <p className={styles.sub}>
        {activeLocation ? t('sub') : t('subFallback')}
      </p>

      <ul className={styles.row} role="list">
        {cards.map((r) => {
          const walk = formatWalkingTime(haversineDistance(loc.lat, loc.lng, r.lat, r.lng))
          return (
            <li key={r._id} className={styles.cardItem}>
              <Link href={`/map?r=${r.slug}`} rel="nofollow" className={styles.card}>
                <div className={styles.cardImage}>
                  {r.photo && <Image src={r.photo} alt="" fill sizes="168px" />}
                  {walk && <span className={styles.dist}>{walk}</span>}
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.name}>{normalizeName(r.name)}</h3>
                  {r.district && <p className={styles.meta}>{r.district}</p>}
                </div>
              </Link>
            </li>
          )
        })}
      </ul>

      {me.length > 0 && (
        <>
          <h3 className={styles.meHeading}>{t('mustEatsTitle')}</h3>
          <p className={styles.meSub}>{t('mustEatsSub')}</p>
          <ul className={styles.meRow} role="list">
            {me.map((m) => (
              <li key={m._id} className={styles.meItem}>
                <Link href={`/map?me=${m._id}`} rel="nofollow" className={styles.meCard}>
                  {/* ?me= öffnet das Must-Eat-Detail auf der Map — locked öffnet
                      locked (Card-Back + 50m-Reveal). */}
                  <Image
                    src={CARD_BACK}
                    alt=""
                    fill
                    sizes="168px"
                    className={styles.meImg}
                  />
                </Link>
              </li>
            ))}
          </ul>
          <p className={styles.foot}>
            <Link href="/map" rel="nofollow" className={styles.footLink}>
              {t('more')}
            </Link>
          </p>
        </>
      )}
    </section>
  )
}
