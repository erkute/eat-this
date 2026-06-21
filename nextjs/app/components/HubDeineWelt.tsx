'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useAuth } from '@/lib/auth'
import { defaultAvatarFromUid, useUserProfile } from '@/lib/firebase/useUserProfile'
import { useMapData, useUnlockedMustEats, resolveUnlockedMustEatIds } from '@/lib/map'
import { useUserLocationContext } from '@/lib/map/UserLocationContext'
import { haversineDistance, formatWalkingTime } from '@/lib/map/distance'
import { nearestRestaurants, nearbyMustEats } from '@/lib/home/nearby'
import { normalizeName } from '@/lib/normalizeName'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'
import MapIntentLink from './MapIntentLink'
import styles from './HubDeineWelt.module.css'

const MITTE = { lat: 52.52, lng: 13.405 }
const CARD_BACK = '/pics/card-back.webp?v=6'

interface Props {
  initialMapData: InitialMapData
}

export default function HubDeineWelt({ initialMapData }: Props) {
  const t = useTranslations('hub.deineWelt')
  const { user, loading } = useAuth()
  const uid = user?.uid ?? null
  const { profile } = useUserProfile(uid)
  const { restaurants, mustEats, revealedMustEatIds } = useMapData({ uid, authLoading: loading, initialMapData })
  const { unlockedIds } = useUnlockedMustEats(uid)
  const { location } = useUserLocationContext()

  // The live face-up set depends on the per-uid localStorage cache + the live
  // /api/map-data payload, so it's client-only — until mount, fall back to the
  // SSR anon payload so the shell and first client paint match (no hydration
  // mismatch); after mount it switches to the signed-in data.
  const [mounted, setMounted] = useState(false)
  const [authHintName, setAuthHintName] = useState<string | null>(null)
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [districtOpen, setDistrictOpen] = useState(false)
  const districtMenuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setMounted(true)
    try {
      const hint = JSON.parse(window.localStorage.getItem('_authHint') || 'null') as { n?: string } | null
      if (hint?.n) setAuthHintName(hint.n)
    } catch {}
  }, [])
  useEffect(() => {
    if (!districtOpen) return
    function onPointerDown(e: PointerEvent) {
      if (!districtMenuRef.current?.contains(e.target as Node)) setDistrictOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setDistrictOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [districtOpen])

  const dataMustEats = mounted ? mustEats : initialMapData.mustEats
  const dataRestaurants = mounted ? restaurants : initialMapData.restaurants
  const districtOptions = useMemo(
    () => Array.from(new Set(dataRestaurants.map((r) => r.district).filter((d): d is string => Boolean(d)))).sort((a, b) => a.localeCompare(b, 'de')),
    [dataRestaurants],
  )
  const selectedDistrictCenter = useMemo(() => {
    if (!selectedDistrict) return null
    const inDistrict = dataRestaurants.filter((r) => r.district === selectedDistrict && Number.isFinite(r.lat) && Number.isFinite(r.lng))
    if (inDistrict.length === 0) return null
    return {
      lat: inDistrict.reduce((sum, r) => sum + r.lat, 0) / inDistrict.length,
      lng: inDistrict.reduce((sum, r) => sum + r.lng, 0) / inDistrict.length,
    }
  }, [dataRestaurants, selectedDistrict])

  const firstName = user
    ? (user.displayName ?? '').split(' ')[0] || (user.email ?? '').split('@')[0] || null
    : authHintName

  // Resolved logged-out → render nothing (the hero stays the first block).
  // While auth is still loading (SSR + pre-hydration) the static shell is
  // rendered for everyone, and globals.css hides it unless the pre-paint
  // data-auth flag (CRITICAL_BOOTSTRAP ← _authHint) marks a signed-in visitor.
  // That way returning users see the section from the first frame instead of
  // it popping in (and shifting the hub) once Firebase auth resolves — only
  // the first name swaps into the kicker, which doesn't move the layout.
  if (!loading && !user) return null

  // Collection progress = how many Must-Eats are face-up for this visitor vs the
  // total on the map. "Aufgedeckt" must mean the SAME face-up set the map/teaser
  // show: the user's stored unlocks + live proximity/server reveals + the public
  // curated face-up cards (≈10). Counting only the personal unlock cache would
  // wrongly read 0 for someone who already sees the public cards face-up.
  const effUid = mounted ? uid : null
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
  const hiddenCount = Math.max(totalMustEats - collected, 0)
  const avatarIdx = user ? (profile.avatar ?? defaultAvatarFromUid(user.uid)) : 1
  const loc = selectedDistrictCenter ?? (mounted && location ? location : MITTE)
  const openedCards = dataMustEats
    .filter((m) => faceUp.has(m._id) && m.image)
    .slice(0, 3)
  const hiddenNearby = nearbyMustEats(
    dataMustEats.filter((m) => !faceUp.has(m._id)),
    loc,
    4200,
    3,
  )
  const restaurantNearby = nearestRestaurants(dataRestaurants, loc, 3)
  const nearbyLabel = selectedDistrict || (mounted && location ? t('nearbyLive') : t('nearbyFallback'))
  const cardSlots: Array<{ key: string; src?: string; label: string; href: string; meta?: string }> = openedCards.map((m) => ({
    key: m._id,
    src: m.image,
    label: normalizeName(m.dish ?? t('cardFallback')),
    href: `/map?me=${m._id}`,
    meta: normalizeName(m.restaurant.name),
  }))
  for (const m of hiddenNearby) {
    if (cardSlots.length >= 3) break
    cardSlots.push({
      key: m._id,
      label: normalizeName(m.restaurant.name),
      href: `/map?me=${m._id}`,
    })
  }
  while (cardSlots.length < 3) {
    cardSlots.push({
      key: `locked-${cardSlots.length}`,
      label: t('lockedCardLabel'),
      href: '/map',
    })
  }

  return (
    <section className={styles.section} data-hub-deinewelt="" data-auth-only="">
      <div className={styles.inner}>
        <header className={styles.copy}>
          <div>
            <p className={styles.kicker}>{firstName ? t('helloName', { name: firstName }) : t('hello')}</p>
            <h2 className={styles.title}>
              {t.rich('today', { em: (chunks) => <span>{chunks}</span> })}
            </h2>
            <p className={styles.lead}>{t('lead')}</p>
            <div className={styles.insightBar} aria-label={t('profileStatsLabel')}>
              <span>
                <strong>{collected}</strong>
                {t('insightRevealed')}
              </span>
              <span>
                <strong>{hiddenCount}</strong>
                {t('insightHidden')}
              </span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <Link href="/profile" rel="nofollow" className={styles.profileLink}>
              <span className={styles.profileAvatar} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/pics/avatar/${avatarIdx}.webp`} alt="" />
              </span>
              <span className={styles.profileText}>
                <span className={styles.actionLabel}>{firstName || t('profileAction')}</span>
                {firstName && <small>{t('profileAction')}</small>}
              </span>
            </Link>
            <div className={styles.locationControl}>
              <div className={styles.districtPicker} ref={districtMenuRef}>
                <button
                  type="button"
                  className={`${styles.districtSelect} homeCta homeCtaFull`}
                  aria-haspopup="listbox"
                  aria-expanded={districtOpen}
                  onClick={() => setDistrictOpen((open) => !open)}
                >
                  <span className={styles.actionLabel}>{selectedDistrict || t('districtTitle')}</span>
                </button>
                {districtOpen && (
                  <div className={styles.districtMenu} role="listbox" aria-label={t('districtTitle')}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={!selectedDistrict}
                      className={styles.districtOption}
                      onClick={() => {
                        setSelectedDistrict('')
                        setDistrictOpen(false)
                      }}
                    >
                      {t('districtTitle')}
                    </button>
                    {districtOptions.map((district) => (
                      <button
                        key={district}
                        type="button"
                        role="option"
                        aria-selected={selectedDistrict === district}
                        className={styles.districtOption}
                        onClick={() => {
                          setSelectedDistrict(district)
                          setDistrictOpen(false)
                        }}
                      >
                        {district}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className={styles.board}>
          <section className={`${styles.panel} ${styles.cardsPanel}`} aria-label={t('cardsTitle')}>
            <div className={styles.panelHead}>
              <p>{t('cardsKicker')}</p>
              <h3>{t('cardsTitle')}</h3>
            </div>
            <ul className={styles.cardFan} role="list">
              {cardSlots.map((card, index) => (
                <li key={card.key} style={{ '--tilt': `${index === 1 ? 1.5 : index === 2 ? 7 : -6}deg` } as CSSProperties}>
                  <MapIntentLink href={card.href} rel="nofollow" className={styles.foodCard}>
                    <span className={styles.foodCardImage} data-locked={card.src ? 'false' : 'true'}>
                      {card.src ? (
                        <Image src={card.src} alt="" fill sizes="150px" className={styles.foodCardImg} />
                      ) : (
                        <span style={{ backgroundImage: `url(${CARD_BACK})` }} />
                      )}
                    </span>
                    <strong>{card.label}</strong>
                    {card.meta && <small>{card.meta}</small>}
                  </MapIntentLink>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.panel} aria-label={t('nearMustEatsTitle')}>
            <div className={styles.panelHead}>
              <p>{nearbyLabel}</p>
              <h3>{t('nearMustEatsTitle')}</h3>
            </div>
            <ul className={styles.nearCards} role="list">
              {hiddenNearby.length > 0 ? hiddenNearby.map((m) => (
                <li key={m._id}>
                  <MapIntentLink href={`/map?me=${m._id}`} rel="nofollow" className={styles.lockedCard}>
                    <span style={{ backgroundImage: `url(${CARD_BACK})` }} aria-hidden="true" />
                    <strong>{normalizeName(m.restaurant.name)}</strong>
                  </MapIntentLink>
                </li>
              )) : (
                <li className={styles.empty}>{t('nearMustEatsEmpty', { count: hiddenCount })}</li>
              )}
            </ul>
          </section>

          <section className={styles.panel} aria-label={t('nearRestaurantsTitle')}>
            <div className={styles.panelHead}>
              <p>{nearbyLabel}</p>
              <h3>{t('nearRestaurantsTitle')}</h3>
            </div>
            <ul className={styles.restaurantGrid} role="list">
              {restaurantNearby.map((r) => {
                const walk = formatWalkingTime(haversineDistance(loc.lat, loc.lng, r.lat, r.lng))
                return (
                  <li key={r._id}>
                    <MapIntentLink href={`/map?r=${r.slug}`} rel="nofollow" className={styles.restaurantCard}>
                      <span className={styles.restaurantPhoto}>
                        {r.photo && <Image src={r.photo} alt="" fill sizes="180px" className={styles.restaurantImg} />}
                        {walk && <em>{walk}</em>}
                      </span>
                      <strong>{normalizeName(r.name)}</strong>
                      <small>{r.district ?? t('nearRestaurantMeta')}</small>
                    </MapIntentLink>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </div>
    </section>
  )
}
