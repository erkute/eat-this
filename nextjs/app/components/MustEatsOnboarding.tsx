'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '@/lib/i18n'
import { resolveUnlockedMustEatIds } from '@/lib/map'
import { pickOnboardingDemoCard } from '@/lib/home/mustEatsGallery'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'
import styles from './MustEatsOnboarding.module.css'

const CARD_BACK = '/pics/card-back.webp?v=6'
// Slide 3 replaces the demo card with the pack art — the thing that brings new spots.
const BOOSTER_ART = '/pics/booster/booster.webp'
export const ONBOARDING_SEEN_KEY = 'mustEatsOnboardingSeen'

// Dwell on the card back in slide 2 before it auto-flips open — the live
// demo of the on-site reveal. Keep shorter than the user's reading time.
const STEP2_FLIP_DELAY_MS = 800

// Three casual slides: what a Must Eat is, how revealing works, then where new
// spots come from (Booster Packs). Each slide is kicker + display headline +
// short body (section-head style).
const SLIDES = [
  { kicker: 'mustEats.onb1Kicker', title: 'mustEats.onb1Title', body: 'mustEats.onb1Body' },
  { kicker: 'mustEats.onb2Kicker', title: 'mustEats.onb2Title', body: 'mustEats.onb2Body' },
  { kicker: 'mustEats.onb3Kicker', title: 'mustEats.onb3Title', body: 'mustEats.onb3Body' },
] as const

interface Props {
  initialMapData: InitialMapData
}

// First-visit onboarding for the Must-Eats page: 3 steps around a demo card
// that flips like the on-site reveal. Opens once (localStorage flag, set on
// dismiss), re-openable any time via the "how does it work?" trigger link
// this component renders inline. SSR renders only the trigger — `open` flips
// in an effect, so there is no hydration mismatch and no portal on the server.
export default function MustEatsOnboarding({ initialMapData }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  // Same anon face-up set the gallery shows — the demo card is one the
  // visitor can actually see face-up in the grid below.
  const demo = useMemo(
    () =>
      pickOnboardingDemoCard(
        initialMapData.mustEats,
        resolveUnlockedMustEatIds({
          uid: null,
          storedUnlockedIds: new Set<string>(),
          revealedMustEatIds: new Set<string>(initialMapData.revealedMustEatIds),
        }),
      ),
    [initialMapData],
  )

  useEffect(() => {
    let seen: string | null = null
    try {
      seen = window.localStorage.getItem(ONBOARDING_SEEN_KEY)
    } catch {
      /* storage blocked → show once per pageload */
    }
    if (!seen) setOpen(true)
  }, [])

  const close = useCallback(() => {
    try {
      window.localStorage.setItem(ONBOARDING_SEEN_KEY, '1')
    } catch {
      /* ignore */
    }
    setOpen(false)
    setStep(0)
  }, [])

  const reopen = () => {
    setStep(0)
    setOpen(true)
  }

  // Slide 2 choreography: card turns face-down on entry, then auto-flips
  // open after a short dwell — demonstrating the on-site reveal.
  const [showBack, setShowBack] = useState(false)
  useEffect(() => {
    if (!open || step !== 1) {
      setShowBack(false)
      return
    }
    setShowBack(true)
    const timer = window.setTimeout(() => setShowBack(false), STEP2_FLIP_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [open, step])

  // Body scroll lock while open (same pattern as MustEatImageLightbox).
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    const prevTouchAction = document.body.style.touchAction
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.touchAction = prevTouchAction
    }
  }, [open])

  // Escape closes.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  const last = step === SLIDES.length - 1
  const slide = SLIDES[step]

  return (
    <>
      <button type="button" className={styles.how} onClick={reopen}>
        <span className={styles.howBadge} aria-hidden="true">?</span>
        {t('mustEats.howItWorks')}
      </button>

      {open &&
        createPortal(
          <div className={styles.backdrop} onClick={close}>
            <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="must-eats-onb-title" onClick={(e) => e.stopPropagation()}>
              <button type="button" className={styles.x} aria-label={t('mustEats.onbClose')} onClick={close}>
                ×
              </button>

              <div className={styles.cardBox}>
                {last ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img data-testid="onb-pack" className={styles.packHero} src={BOOSTER_ART} alt="Booster Pack" />
                ) : (
                  <div data-testid="onb-flipper" className={showBack ? `${styles.flipper} ${styles.flipped}` : styles.flipper}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className={styles.face} src={demo?.image ?? CARD_BACK} alt={demo?.dish ?? ''} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className={`${styles.face} ${styles.back}`} src={CARD_BACK} alt="" aria-hidden="true" />
                  </div>
                )}
              </div>

              <p className={styles.kicker}>{t(slide.kicker)}</p>
              <h2 className={styles.title} id="must-eats-onb-title">{t(slide.title)}</h2>
              <p className={styles.text}>{t(slide.body)}</p>

              <div className={styles.dots} aria-hidden="true">
                {SLIDES.map((s, i) => (
                  <span key={s.title} className={i === step ? `${styles.dot} ${styles.dotOn}` : styles.dot} />
                ))}
              </div>

              {last ? (
                <button type="button" className={styles.next} onClick={close}>
                  {t('mustEats.onbStart')}
                </button>
              ) : (
                <button type="button" className={styles.next} onClick={() => setStep(step + 1)}>
                  {t('mustEats.onbNext')}
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
