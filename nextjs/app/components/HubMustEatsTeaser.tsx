'use client'

import { useEffect, useMemo, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useAuth } from '@/lib/auth'
import { useMapData, useUnlockedMustEats, resolveUnlockedMustEatIds } from '@/lib/map'
import { useTranslation } from '@/lib/i18n'
import { normalizeName } from '@/lib/normalizeName'
import { splitMustEats } from '@/lib/home/mustEatsGallery'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'
import styles from './HubMustEatsTeaser.module.css'

const CARD_BACK = '/pics/card-back.webp?v=5'
const TEASER_COUNT = 6

interface Props {
  initialMapData: InitialMapData
}

export default function HubMustEatsTeaser({ initialMapData }: Props) {
  const { user, loading: authLoading } = useAuth()
  const uid = user?.uid ?? null
  const live = useMapData({ uid, authLoading, initialMapData })
  const { unlockedIds: storedUnlockedIds } = useUnlockedMustEats(uid)
  const { t } = useTranslation()

  // The first client render must match SSR exactly: SSR renders the anonymous
  // view (uid=null) from `initialMapData`, so the pre-mount render here mirrors
  // it — uid=null + initialMapData fed through the shared face-up helper. That
  // yields the deterministic anon view (10 curated cards + spot-of-day) face-up,
  // identical on server and first client paint. After mount, swap to the live
  // dataset + the real uid so signed-in stored unlocks + proximity reveals show
  // too — exactly like the map.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const effUid = mounted ? uid : null
  const mustEats = mounted ? live.mustEats : initialMapData.mustEats
  const revealedMustEatIds = mounted
    ? live.revealedMustEatIds
    : new Set<string>(initialMapData.revealedMustEatIds)
  const storedSet = mounted ? storedUnlockedIds : new Set<string>()
  // Public anon face-up set — folded in for signed-in users too so the teaser
  // matches the map/profile ("publicly face-up means face-up everywhere"; the
  // signed-in /api/map-data ships revealedMustEatIds: []).
  const publicFaceUpIds = useMemo(
    () => new Set<string>(initialMapData.revealedMustEatIds),
    [initialMapData],
  )
  const faceUp = useMemo(
    () =>
      resolveUnlockedMustEatIds({
        uid: effUid,
        storedUnlockedIds: storedSet,
        revealedMustEatIds,
        publicFaceUpIds,
      }),
    [effUid, storedSet, revealedMustEatIds, publicFaceUpIds],
  )

  // Mix: up to 3 revealed dishes face-up, the rest face-down — communicates the
  // reveal game without leaking dish names on the locked cards.
  const teaser = useMemo(() => {
    const { open, locked } = splitMustEats(mustEats, faceUp)
    return [...open.slice(0, 3), ...locked].slice(0, TEASER_COUNT)
  }, [mustEats, faceUp])

  if (teaser.length === 0) return null

  return (
    <section className={styles.section} data-hub-must-eats="">
      <h2 className={styles.title}>{t('mustEats.teaserTitle')}</h2>
      <p className={styles.sub}>{t('mustEats.teaserSub')}</p>

      <ul className={styles.row} role="list">
        {teaser.map((m) => {
          const open = faceUp.has(m._id)
          return (
            <li key={m._id} className={styles.item}>
              {/* Deep-link into the map: ?me= opens the must-eat detail (locked
                  ones open in their locked state — same handler as in-app taps). */}
              <Link
                href={`/map?me=${m._id}`}
                className={styles.cardLink}
                aria-label={open ? undefined : t('mustEats.teaserCardLocked')}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.card}
                  src={open ? m.image : CARD_BACK}
                  alt={open ? normalizeName(m.dish) : ''}
                  loading="lazy"
                />
              </Link>
            </li>
          )
        })}
      </ul>

      <p className={styles.foot}>
        <Link href="/must-eats" className={styles.cta}>
          {t('mustEats.teaserCta')}
        </Link>
      </p>
    </section>
  )
}
