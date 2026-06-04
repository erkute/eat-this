'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useAuth } from '@/lib/auth'
import { useOwnedEntitlements } from '@/lib/firebase/useOwnedEntitlements'
import { useMapData } from '@/lib/map'
import { useUserLocationContext } from '@/lib/map/UserLocationContext'
import { freshInBezirk } from '@/lib/home/freshInBezirk'
import { getPack } from '@/lib/stripe-catalog'
import { categoryArt } from '@/lib/categoryArt'
import { normalizeName } from '@/lib/normalizeName'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'
import styles from './HubDeineWelt.module.css'

const CARD_BACK = '/pics/card-back.webp'

interface Props {
  initialMapData: InitialMapData
}

export default function HubDeineWelt({ initialMapData }: Props) {
  const t = useTranslations('hub.deineWelt')
  const { user, loading } = useAuth()
  const uid = user?.uid ?? null
  const owned = useOwnedEntitlements(uid)
  const { restaurants } = useMapData({ uid, authLoading: loading, initialMapData })
  const { location } = useUserLocationContext()

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
  const fresh = freshInBezirk(restaurants, bezirk, 2)

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
                      {r.photo && <Image src={r.photo} alt="" fill sizes="200px" />}
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

      <div className={styles.div} />

      <Link
        href="/profile#gesammelte-must-eats"
        className={styles.teaser}
        rel="nofollow"
        aria-label={t('coveredAria')}
      >
        <div className={styles.cards} aria-hidden="true">
          <span className={styles.card} style={{ backgroundImage: `url(${CARD_BACK})` }} />
          <span className={styles.card} style={{ backgroundImage: `url(${CARD_BACK})` }} />
          <span className={styles.card} style={{ backgroundImage: `url(${CARD_BACK})` }} />
        </div>
        <p className={styles.cap}>{t('mustEatsWaiting')}</p>
      </Link>

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
