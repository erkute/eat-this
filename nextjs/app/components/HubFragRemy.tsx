'use client'
// Home-hub stage for Remy, the KI buddy: he introduces himself with the same
// time-of-day greeting + starter chips the chat uses, so the section IS the
// chat entrance, not an ad for it. Chips and CTA hand off to the globally
// mounted BuddyWidget via window events (see lib/buddy/homeStage.ts); an
// IntersectionObserver reports when Remy is "on stage" so the widget hides its
// corner launcher and flies him into the corner once the section scrolls away.
import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import BuddyAvatar, { type BuddyMood } from './buddy/BuddyAvatar'
import { greetingFor, introFor } from '@/lib/buddy/greeting'
import { dispatchBuddyAsk, dispatchBuddyStage } from '@/lib/buddy/homeStage'
import type { Locale } from '@/lib/buddy/types'
import styles from './HubFragRemy.module.css'

export default function HubFragRemy() {
  const locale = useLocale() as Locale
  const t = useTranslations('hub.fragRemy')
  const stageRef = useRef<HTMLDivElement>(null)
  const [intro, setIntro] = useState<{ greeting: string; suggestions: string[] } | null>(null)
  const [mood, setMood] = useState<BuddyMood>('idle')
  const [popped, setPopped] = useState(false)
  const spoke = useRef(false)
  const moodTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Daypart greeting is client-only (the server's clock isn't the user's):
  // SSR shows Remy's static intro line, the hook + chips land after hydration.
  useEffect(() => {
    setIntro(greetingFor(new Date().getHours(), locale))
  }, [locale])

  useEffect(() => {
    const el = stageRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1]
        const r = entry.boundingClientRect
        dispatchBuddyStage({
          visible: entry.isIntersecting,
          rect: { left: r.left, top: r.top, width: r.width, height: r.height },
        })
        // First appearance: the bubble pops in and Remy's mouth flaps briefly,
        // as if he speaks the greeting right at you.
        if (entry.isIntersecting && !spoke.current) {
          spoke.current = true
          setPopped(true)
          setMood('talking')
          moodTimer.current = setTimeout(() => setMood('idle'), 2500)
        }
      },
      { threshold: 0.3 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      clearTimeout(moodTimer.current)
      // Section gone (e.g. soft-nav away): release the launcher, no flight.
      dispatchBuddyStage({ visible: false })
    }
  }, [])

  return (
    <section className={styles.section} data-hub-fragremy="">
      <h2 className={styles.heading}>{t('title')}</h2>
      <p className={styles.sub}>{t('sub')}</p>
      <div className={styles.stage}>
        {/* Comic strip: bubble hangs over Remy's head, tail points down at him. */}
        <div className={styles.bubble} data-pop={popped ? '' : undefined}>
          <p className={styles.bubbleText}>{intro ? intro.greeting : introFor(locale)}</p>
        </div>
        <div className={styles.row}>
          <div className={styles.avatar} ref={stageRef} data-fragremy-avatar="">
            <BuddyAvatar mood={mood} size={132} />
          </div>
          <div className={styles.talk}>
            <div className={styles.chips} data-fragremy-chips="">
              {(intro?.suggestions ?? []).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={styles.chip}
                  onClick={() => dispatchBuddyAsk({ question: s })}
                >
                  {s}
                </button>
              ))}
            </div>
            <button type="button" className={styles.cta} onClick={() => dispatchBuddyAsk()}>
              {t('cta')}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
