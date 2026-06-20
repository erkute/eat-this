'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/auth'
import { useMapData } from '@/lib/map'
import { useUserLocationContext } from '@/lib/map/UserLocationContext'
import { haversineDistance, formatWalkingTime } from '@/lib/map/distance'
import { normalizeName } from '@/lib/normalizeName'
import { nearestRestaurants } from '@/lib/home/nearby'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'
import MapIntentLink from './MapIntentLink'
import styles from './HubNearby.module.css'

const MITTE = { lat: 52.52, lng: 13.405 }

interface Props {
  initialMapData: InitialMapData
}

export default function HubNearby({ initialMapData }: Props) {
  const t = useTranslations('hub.nearby')
  const { user, loading: authLoading } = useAuth()
  const uid = user?.uid ?? null
  const live = useMapData({ uid, authLoading, initialMapData })
  const { location, loading: locating, error: locError, request } = useUserLocationContext()
  // The first client render must match SSR (anon initialMapData + Mitte). Only
  // after mount switch to live data (which may be the cached signed-in payload)
  // + the resolved geolocation — otherwise the nearby list/distances mismatch
  // on hydrate.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const restaurants = mounted ? live.restaurants : initialMapData.restaurants
  const activeLocation = mounted ? location : null
  const loc = activeLocation ?? MITTE

  const cards = nearestRestaurants(restaurants, loc, 4)
  if (mounted && user) return null
  if (cards.length === 0) return null

  return (
    <section className={styles.section} data-hub-nearby="" data-guest-only="">
      <div className={styles.head}>
        <h2 className={styles.heading}>{t('title')}</h2>
        <button
          type="button"
          className={`${styles.locBtn} homeCta homeCtaSmall`}
          onClick={() => request()}
          disabled={locating}
          aria-label={t('locationAria')}
        >
          <svg className={styles.locIcon} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8" />
            <line x1="12" y1="2" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="2" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="22" y2="12" />
            <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
          </svg>
          <span>{locating ? t('locating') : t('location')}</span>
        </button>
      </div>
      {/* Geolocation failed → tell the user instead of silently staying on the
          Mitte fallback (denied permission no-ops on every further click). */}
      {mounted && locError && !activeLocation ? (
        <p className={`${styles.sub} ${styles.subError}`} role="status">
          {locError === 'denied' ? t('errDenied') : t('errRetry')}
        </p>
      ) : (
        <p className={styles.sub}>
          {activeLocation ? t('sub') : t('subFallback')}
        </p>
      )}

      <ul className={styles.row} role="list">
        {cards.map((r) => {
          const walk = formatWalkingTime(haversineDistance(loc.lat, loc.lng, r.lat, r.lng))
          return (
            <li key={r._id} className={styles.cardItem}>
              <MapIntentLink href={`/map?r=${r.slug}`} rel="nofollow" className={styles.card}>
                <div className={styles.cardImage}>
                  {r.photo && <Image src={r.photo} alt={normalizeName(r.name)} fill sizes="168px" />}
                  {walk && <span className={styles.dist}>{walk}</span>}
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.name}>{normalizeName(r.name)}</h3>
                  {r.district && <p className={styles.meta}>{r.district}</p>}
                </div>
              </MapIntentLink>
            </li>
          )
        })}
        </ul>
    </section>
  )
}
