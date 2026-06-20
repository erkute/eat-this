'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { trackEvent } from '@/lib/analytics'
import { formatDistance } from '@/lib/map/distance'
import { useUserLocationContext } from '@/lib/map/UserLocationContext'
import { normalizeName } from '@/lib/normalizeName'
import { pickTodayRestaurants, type TodayBudget, type TodayMood, type TodayRadius } from '@/lib/home/todayPicker'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'
import MapIntentLink from './MapIntentLink'
import styles from './HubTodayPicker.module.css'

const MITTE = { lat: 52.52, lng: 13.405 }
const MOODS: TodayMood[] = ['any', 'quick', 'cozy', 'special']
const BUDGETS: TodayBudget[] = ['any', 'cheap', 'medium']
const RADII: TodayRadius[] = [1500, 3000, 8000]

export default function HubTodayPicker({ initialMapData }: { initialMapData: InitialMapData }) {
  const t = useTranslations('hub.todayPicker')
  const { location } = useUserLocationContext()
  const [mood, setMood] = useState<TodayMood>('any')
  const [budget, setBudget] = useState<TodayBudget>('any')
  const [radius, setRadius] = useState<TodayRadius>(3000)
  const [seed, setSeed] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const activeLocation = location ?? MITTE
  const picks = useMemo(
    () => pickTodayRestaurants(initialMapData.restaurants, { mood, budget, radius }, activeLocation, new Date(), seed),
    [initialMapData.restaurants, mood, budget, radius, activeLocation, seed],
  )

  function reveal(nextSeed = seed) {
    setSeed(nextSeed)
    setShowResults(true)
    trackEvent('today_picker_results', {
      mood,
      budget,
      radius_m: radius,
      result_count: picks.length,
      location: location ? 'user' : 'mitte',
    })
  }

  return (
    <section className={styles.section} data-hub-today-picker="">
      <div className={styles.inner}>
        <div className={styles.intro}>
          <p className={styles.kicker}>{t('kicker')}</p>
          <h2 className={styles.heading}>{t('title')}</h2>
          <p className={styles.sub}>{t('sub')}</p>
        </div>

        <div className={styles.controls}>
          <ChoiceRow label={t('moodLabel')}>
            {MOODS.map((value) => (
              <Choice key={value} active={mood === value} onClick={() => { setMood(value); setShowResults(false) }}>
                {t(`mood.${value}`)}
              </Choice>
            ))}
          </ChoiceRow>
          <ChoiceRow label={t('budgetLabel')}>
            {BUDGETS.map((value) => (
              <Choice key={value} active={budget === value} onClick={() => { setBudget(value); setShowResults(false) }}>
                {t(`budget.${value}`)}
              </Choice>
            ))}
          </ChoiceRow>
          <ChoiceRow label={t('distanceLabel')}>
            {RADII.map((value) => (
              <Choice key={value} active={radius === value} onClick={() => { setRadius(value); setShowResults(false) }}>
                {t(`radius.${value}`)}
              </Choice>
            ))}
          </ChoiceRow>
        </div>

        <div className={styles.primaryRow}>
          <button type="button" className={styles.primary} onClick={() => reveal()}>
            {t('go')}
          </button>
        </div>

        {showResults && (
          <div className={styles.results} aria-live="polite">
            <div className={styles.resultsHead}>
              <div>
                <p className={styles.resultsKicker}>{t('resultsKicker')}</p>
                <h3 className={styles.resultsTitle}>{t('resultsTitle')}</h3>
              </div>
              <button type="button" className={styles.reroll} onClick={() => reveal(seed + 1)}>
                {t('reroll')}
              </button>
            </div>
            {picks.length > 0 ? (
              <ol className={styles.cards}>
                {picks.map((pick, index) => {
                  const r = pick.restaurant
                  const meta = [r.cuisineType, r.district].filter(Boolean).join(' · ')
                  return (
                    <li key={r._id} className={styles.cardItem}>
                      <MapIntentLink
                        href={`/map?r=${r.slug}`}
                        rel="nofollow"
                        className={styles.card}
                        onClick={() => trackEvent('today_picker_opened', { restaurant_id: r._id, rank: index + 1 })}
                      >
                        <div className={styles.photo}>
                          {r.photo && <Image src={r.photo} alt="" fill sizes="(min-width: 720px) 340px, 88vw" />}
                          <span className={styles.rank}>{index === 0 ? t('topPick') : `0${index + 1}`}</span>
                        </div>
                        <div className={styles.cardBody}>
                          <h4>{normalizeName(r.name)}</h4>
                          {meta && <p>{meta}</p>}
                          <div className={styles.facts}>
                            <span>{formatDistance(pick.distanceM)}</span>
                            <span>{pick.opening === 'open' ? t('openNow') : t('checkHours')}</span>
                          </div>
                        </div>
                      </MapIntentLink>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className={styles.empty}>{t('empty')}</p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function ChoiceRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className={styles.choiceRow}>
      <legend>{label}</legend>
      <div>{children}</div>
    </fieldset>
  )
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={active} className={active ? `${styles.choice} ${styles.choiceActive}` : styles.choice} onClick={onClick}>
      {children}
    </button>
  )
}
