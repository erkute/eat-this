'use client'
// Home-hub hero for Remy, the KI buddy. Left: kicker + headline + lede + the
// chat-input CTA + quick-reply chips. Right: big cut-out Remy with a compact
// speech bubble (short daypart hook) over his head. Chips and CTA hand off to
// the globally mounted BuddyWidget via window events (see lib/buddy/homeStage);
// an IntersectionObserver reports when Remy is "on stage" so the widget hides
// its corner launcher and flies him into the corner once the section leaves.
import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { bubbleHookFor, bubbleHookDefault } from '@/lib/buddy/greeting'
import { dispatchBuddyAsk, dispatchBuddyStage } from '@/lib/buddy/homeStage'
import type { Locale } from '@/lib/buddy/types'
import styles from './HubFragRemy.module.css'

export default function HubFragRemy() {
  const locale = useLocale() as Locale
  const t = useTranslations('hub.fragRemy')
  const stageRef = useRef<HTMLDivElement>(null)
  const [hook, setHook] = useState<string>(() => bubbleHookDefault(locale))
  const [popped, setPopped] = useState(false)
  const spoke = useRef(false)

  // The daypart bubble hook is client-only (the server's clock isn't the
  // user's), so it settles after hydration; SSR shows the neutral hook.
  useEffect(() => {
    setHook(bubbleHookFor(new Date().getHours(), locale))
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
        if (entry.isIntersecting && !spoke.current) {
          spoke.current = true
          setPopped(true)
        }
      },
      { threshold: 0.3 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      // Section gone (e.g. soft-nav away): release the launcher, no flight.
      dispatchBuddyStage({ visible: false })
    }
  }, [])

  return (
    <section className={styles.section} data-hub-fragremy="">
      <div className={styles.stage}>
        {/* Order — mobile: copy → Remy → actions. desktop (grid): copy+actions
            left, Remy right. */}
        <div className={styles.copy}>
          <span className={styles.kicker}>{t('kicker')}</span>
          <h2 className={styles.heading}>{t('title')}</h2>
          <p className={styles.lede}>{t('sub')}</p>
        </div>

        {/* Big Remy with a compact speech bubble (short daypart hook) over his head. */}
        <div className={styles.hero}>
          <div className={styles.bubble} data-pop={popped ? '' : undefined}>
            <p className={styles.bubbleText}>{hook}</p>
          </div>
          <div className={styles.figureCol} ref={stageRef} data-fragremy-avatar="">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.figure} src="/buddy/buddy.webp" alt="Remy" width={320} height={320} />
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.input} onClick={() => dispatchBuddyAsk()} aria-label={t('open')} data-fragremy-open="">
            <span className={styles.inputText}>{t('inputPlaceholder')}</span>
            <span className={styles.inputSend} aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  )
}
