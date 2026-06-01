'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { useAuth } from '@/lib/auth'
import { useMapData } from '@/lib/map'
import { useUserLocationContext } from '@/lib/map/UserLocationContext'
import { haversineDistance, formatWalkingTime } from '@/lib/map/distance'
import { normalizeName } from '@/lib/normalizeName'
import { nearestRestaurants, nearbyMustEats } from '@/lib/home/nearby'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'
import styles from './HubNearby.module.css'

const MITTE = { lat: 52.52, lng: 13.405 }

interface Props {
  initialMapData: InitialMapData
}

export default function HubNearby({ initialMapData }: Props) {
  const { user, loading: authLoading } = useAuth()
  const uid = user?.uid ?? null
  const { restaurants, mustEats } = useMapData({ uid, authLoading, initialMapData })
  const { location, request } = useUserLocationContext()
  // The first client render must match SSR, which has no geolocation. The
  // location context can already hold a cached grant on mount, which would
  // reorder the cards and change distances → hydration mismatch. So default to
  // Mitte until mounted, then switch to the resolved location.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const activeLocation = mounted ? location : null
  const loc = activeLocation ?? MITTE

  const cards = nearestRestaurants(restaurants, loc, 4)
  const me = nearbyMustEats(mustEats, loc, 1000, 4)
  if (cards.length === 0) return null

  return (
    <section className={styles.section} data-hub-nearby="">
      <div className={styles.head}>
        <h2 className={styles.heading}>In deiner Nähe</h2>
        <button
          type="button"
          className={styles.locBtn}
          onClick={() => request()}
          aria-label="Mein Standort verwenden"
        >
          <span>Standort</span>
        </button>
      </div>
      <p className={styles.sub}>
        {activeLocation
          ? 'Restaurants und Must Eats um dich herum'
          : 'Mitte · Restaurants und Must Eats um dich herum'}
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
          <h3 className={styles.meHeading}>Must Eats in deiner Nähe</h3>
          <p className={styles.meSub}>Das eine Gericht pro Spot · unser klarer Pick</p>
          <ul className={styles.meRow} role="list">
            {me.map((m) => (
              <li key={m._id} className={styles.meItem}>
                <Link href="/map" rel="nofollow" className={styles.meCard}>
                  {m.image && (
                    <Image
                      src={m.image}
                      alt={m.dish}
                      fill
                      sizes="168px"
                      className={styles.meImg}
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>
          <p className={styles.foot}>
            <Link href="/map" rel="nofollow" className={styles.footLink}>
              Mehr Must Eats →
            </Link>
          </p>
        </>
      )}
    </section>
  )
}
