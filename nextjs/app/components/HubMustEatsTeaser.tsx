'use client'

import { useEffect, useMemo, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useAuth } from '@/lib/auth'
import { useMapData, useUnlockedMustEats } from '@/lib/map'
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
  const { unlockedIds } = useUnlockedMustEats(uid)
  const { t } = useTranslation()

  // The first client render must match SSR: anon initialMapData + an empty
  // unlocked set (so every card paints face-down, exactly like the server
  // output). Only after mount switch to the live dataset + the resolved
  // unlocked set — otherwise the row mismatches on hydrate.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const mustEats = mounted ? live.mustEats : initialMapData.mustEats
  const unlocked = mounted ? unlockedIds : new Set<string>()

  // Mix: up to 3 revealed dishes face-up, the rest face-down — communicates the
  // reveal game without leaking dish names on the locked cards.
  const teaser = useMemo(() => {
    const { open, locked } = splitMustEats(mustEats, unlocked)
    return [...open.slice(0, 3), ...locked].slice(0, TEASER_COUNT)
  }, [mustEats, unlocked])

  if (teaser.length === 0) return null

  return (
    <section className={styles.section} data-hub-must-eats="">
      <h2 className={styles.title}>{t('mustEats.teaserTitle')}</h2>
      <p className={styles.sub}>{t('mustEats.teaserSub')}</p>

      <ul className={styles.row} role="list">
        {teaser.map((m) => {
          const open = unlocked.has(m._id)
          return (
            <li key={m._id} className={styles.item}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.card}
                src={open ? m.image : CARD_BACK}
                alt={open ? normalizeName(m.dish) : ''}
                loading="lazy"
              />
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
