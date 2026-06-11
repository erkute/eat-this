'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useAuth } from '@/lib/auth'
import { useOwnedEntitlements } from '@/lib/firebase/useOwnedEntitlements'
import { useMapData, useUnlockedMustEats, resolveUnlockedMustEatIds } from '@/lib/map'
import { useUserLocationContext } from '@/lib/map/UserLocationContext'
import { freshInBezirk } from '@/lib/home/freshInBezirk'
import { getPack } from '@/lib/stripe-catalog'
import { categoryArt } from '@/lib/categoryArt'
import { normalizeName } from '@/lib/normalizeName'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'
import styles from './HubDeineWelt.module.css'

const CARD_BACK = '/pics/card-back.webp?v=6'

interface Props {
  initialMapData: InitialMapData
}

export default function HubDeineWelt({ initialMapData }: Props) {
  const t = useTranslations('hub.deineWelt')
  const { user, loading } = useAuth()
  const uid = user?.uid ?? null
  const owned = useOwnedEntitlements(uid)
  const { restaurants, mustEats, revealedMustEatIds } = useMapData({ uid, authLoading: loading, initialMapData })
  const { unlockedIds } = useUnlockedMustEats(uid)
  const { location } = useUserLocationContext()

  // The live face-up set depends on the per-uid localStorage cache + the live
  // /api/map-data payload, so it's client-only — until mount, fall back to the
  // SSR anon payload so the shell and first client paint match (no hydration
  // mismatch); after mount it switches to the signed-in data.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Real reverse-geocode of the granted location → exact Berlin Ortsteil via
  // point-in-polygon (/api/bezirk). Falls back to "Mitte" until a location is
  // granted (or if the point is outside Berlin).
  const [geoBezirk, setGeoBezirk] = useState<string | null>(null)
  useEffect(() => {
    if (!location) return
    let cancelled = false
    fetch(`/api/bezirk?lat=${location.lat}&lng=${location.lng}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d && typeof d.bezirk === 'string') setGeoBezirk(d.bezirk)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [location])

  // Resolved logged-out → render nothing (the hero stays the first block).
  // While auth is still loading (SSR + pre-hydration) the static shell is
  // rendered for everyone, and globals.css hides it unless the pre-paint
  // data-auth flag (CRITICAL_BOOTSTRAP ← _authHint) marks a signed-in visitor.
  // That way returning users see the section from the first frame instead of
  // it popping in (and shifting the hub) once Firebase auth resolves — only
  // the first name swaps into the kicker, which doesn't move the layout.
  if (!loading && !user) return null

  const firstName = user
    ? (user.displayName ?? '').split(' ')[0] || (user.email ?? '').split('@')[0] || null
    : null

  const bezirk = geoBezirk ?? 'Mitte'
  const fresh = freshInBezirk(restaurants, bezirk, 4)

  // Collection progress = how many Must-Eats are face-up for this visitor vs the
  // total on the map. "Aufgedeckt" must mean the SAME face-up set the map/teaser
  // show: the user's stored unlocks + live proximity/server reveals + the public
  // curated face-up cards (≈10). Counting only the personal unlock cache would
  // wrongly read 0 for someone who already sees the public cards face-up.
  const effUid = mounted ? uid : null
  const dataMustEats = mounted ? mustEats : initialMapData.mustEats
  const liveRevealed = mounted ? revealedMustEatIds : new Set<string>(initialMapData.revealedMustEatIds)
  const storedUnlocked = mounted ? unlockedIds : new Set<string>()
  const publicFaceUpIds = new Set<string>(initialMapData.revealedMustEatIds)
  const faceUp = resolveUnlockedMustEatIds({
    uid: effUid,
    storedUnlockedIds: storedUnlocked,
    revealedMustEatIds: liveRevealed,
    publicFaceUpIds,
  })
  // Only count ids that exist in the current dataset (face-up may carry stale
  // ids from other datasets — they're inert but shouldn't inflate the count).
  const mustEatIdSet = new Set(dataMustEats.map((m) => m._id))
  const collected = [...faceUp].filter((id) => mustEatIdSet.has(id)).length
  const totalMustEats = dataMustEats.length
  const collectPct =
    totalMustEats > 0 ? Math.min(100, Math.round((collected / totalMustEats) * 100)) : 0

  // First owned CATEGORY pack → resolve its real category slug via the catalog
  // (packId 'category-fastfood' maps to slug 'fast-food', not 'fastfood').
  const ownedPackId = owned ? ([...owned].find((id) => id.startsWith('category-')) ?? null) : null
  const ownedPack = ownedPackId ? getPack(ownedPackId) : null
  const ownedSlug = ownedPack?.slug ?? null
  const packArt = ownedSlug ? categoryArt(ownedSlug) : null

  return (
    <section className={styles.section} data-hub-deinewelt="" data-auth-only="">
      <header className={styles.hi}>
        <p className={styles.kicker}>{firstName ? t('helloName', { name: firstName }) : t('hello')}</p>
        <h2 className={styles.name}>
          {t.rich('today', { em: (chunks) => <span className={styles.em}>{chunks}</span> })}
        </h2>
        {bezirk && (
          <p className={styles.here}>
            {t.rich('yourBezirk', { bezirk, b: (chunks) => <strong>{chunks}</strong> })}
          </p>
        )}
      </header>

      <div className={styles.div} />

      {/* Collection-progress panel — the dashboard's primary stat: how many
          Must-Eats this user has flipped face-up, with a progress bar, linking
          into the profile's collected cards. */}
      <Link
        href="/profile#gesammelte-must-eats"
        className={styles.collect}
        rel="nofollow"
        aria-label={t('coveredAria')}
      >
        <div className={styles.collectCards} aria-hidden="true">
          <span className={styles.card} style={{ backgroundImage: `url(${CARD_BACK})` }} />
          <span className={styles.card} style={{ backgroundImage: `url(${CARD_BACK})` }} />
          <span className={styles.card} style={{ backgroundImage: `url(${CARD_BACK})` }} />
        </div>
        <div className={styles.collectStat}>
          <p className={styles.collectK}>{t('collectionKicker')}</p>
          <p className={styles.collectNum}>
            <strong>{mounted ? collected : '–'}</strong>
            <span className={styles.collectTotal}>/ {mounted ? totalMustEats : '–'}</span>
          </p>
          <p className={styles.collectUnit}>{t('collectionUnit')}</p>
          <span className={styles.bar} aria-hidden="true">
            <span className={styles.barFill} style={{ width: `${collectPct}%` }} />
          </span>
          <span className={styles.collectCta}>
            {collected > 0 ? t('collectionCta') : t('mustEatsWaiting')}
          </span>
        </div>
      </Link>

      {fresh.length > 0 && bezirk && (
        <>
          <div className={styles.div} />
          <div className={styles.fresh}>
            <p className={styles.freshK}>{t('freshIn', { bezirk })}</p>
            <div className={styles.freshRow}>
              {fresh.map((r) => {
                const tag = r.cuisineType ?? r.categories?.[0]?.name ?? null
                return (
                  <Link
                    key={r._id}
                    href={`/map?r=${r.slug}`}
                    rel="nofollow"
                    className={styles.freshCard}
                  >
                    <span className={styles.freshPill}>{t('newPill')}</span>
                    <span className={styles.freshImg}>
                      {r.photo && <Image src={r.photo} alt={normalizeName(r.name)} fill sizes="(max-width: 720px) 50vw, 260px" />}
                    </span>
                    <h4 className={styles.freshName}>{normalizeName(r.name)}</h4>
                    <span className={styles.freshMeta}>{tag ? t('newMetaTag', { tag }) : t('newMeta')}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}

      {packArt && ownedSlug && ownedPack && (
        <div className={styles.pack}>
          <Image src={packArt} alt="" width={84} height={130} className={styles.packArt} />
          <div className={styles.packBody}>
            <h3 className={styles.packName}>{ownedPack.displayName}</h3>
            <p className={styles.packProgress}>{t('packProgress')}</p>
            <Link href={`/map?cat=${ownedSlug}`} rel="nofollow" className={styles.packCta}>
              {t('toMap')}
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
