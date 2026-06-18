'use client'
// Home-hub hero for Remy, the KI buddy — bold editorial: oversized headline on
// a yellow band, a giant Remy bust bleeding off the corner, a time-of-day lead
// and two quick answers + a chat input that hand off to the globally mounted
// BuddyWidget via window events (see lib/buddy/homeStage.ts). An
// IntersectionObserver reports when Remy is "on stage" so the widget hides its
// corner launcher and flies him into the corner once the section scrolls away.
import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { stageFor } from '@/lib/buddy/greeting'
import { dispatchBuddyAsk, dispatchBuddyStage } from '@/lib/buddy/homeStage'
import type { Locale } from '@/lib/buddy/types'
import styles from './HubFragRemy.module.css'

export default function HubFragRemy() {
  const locale = useLocale() as Locale
  const t = useTranslations('hub.fragRemy')
  const stageRef = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState<{ line: string; lead: string; answers: [string, string] } | null>(null)
  const [talking, setTalking] = useState(false)
  const [draft, setDraft] = useState('')
  const spoke = useRef(false)
  const moodTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Daypart copy is client-only (the server's clock isn't the user's): SSR shows
  // the generic sub, the daypart lead + answers land after hydration.
  useEffect(() => {
    setStage(stageFor(new Date().getHours(), locale))
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
        // First appearance: Remy's mouth flaps briefly, as if he greets you.
        if (entry.isIntersecting && !spoke.current) {
          spoke.current = true
          setTalking(true)
          moodTimer.current = setTimeout(() => setTalking(false), 2500)
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

  const lead = stage ? stage.lead : t('sub')
  const fallbackAnswers: [string, string] =
    locale === 'de'
      ? ['Richtig gute Pizza', 'Schönes Dinner für zwei']
      : ['Really good pizza', 'A nice dinner for two']
  const answers = stage?.answers ?? fallbackAnswers

  function submitDraft() {
    const q = draft.trim()
    if (!q) return
    dispatchBuddyAsk({ question: q })
    setDraft('')
  }

  return (
    <section className={styles.section} id="hub-fragremy" data-hub-fragremy="">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.kicker}>{t('title')} · Dein Food-Insider</p>
          <h2 className={styles.headline}>{t('headline')}</h2>
          <p className={styles.lead} data-fragremy-lead="">
            {lead}
          </p>

          <div className={styles.actions}>
            <div className={styles.chips} data-fragremy-chips="">
              {answers.map((a) => (
                <button key={a} type="button" className={`${styles.chip} homeCta homeCtaSmall`} onClick={() => dispatchBuddyAsk({ question: a })}>
                  {a}
                </button>
              ))}
            </div>
            <form
              className={styles.chatin}
              onSubmit={(e) => {
                e.preventDefault()
                submitDraft()
              }}
            >
              <input
                className={styles.input}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('inputPlaceholder')}
                aria-label={t('inputPlaceholder')}
              />
              <button className={`${styles.send} homeCta homeCtaPrimary homeCtaSmall`} type="submit" aria-label={t('sendAria')}>
                <span aria-hidden="true">{t('sendAria')}</span>
              </button>
            </form>
          </div>
        </div>

        <div className={styles.avatarWrap} ref={stageRef} data-fragremy-avatar="">
          <div className={styles.avatar} data-talking={talking ? '' : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.face} src="/buddy/buddy.webp" alt="Remy" width={460} height={460} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.faceOpen} src="/buddy/buddy-open.webp" alt="" width={460} height={460} aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  )
}
