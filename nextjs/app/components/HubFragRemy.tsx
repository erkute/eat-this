'use client'
// Home-hub stage for Remy, the KI buddy: he introduces himself with the same
// time-of-day greeting + starter chips the chat uses, so the section IS the
// chat entrance, not an ad for it. Chips and CTA hand off to the globally
// mounted BuddyWidget via window events (see lib/buddy/homeStage.ts); an
// IntersectionObserver reports when Remy is "on stage" so the widget hides its
// corner launcher and flies him into the corner once the section scrolls away.
import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { greetingFor } from '@/lib/buddy/greeting'
import { dispatchBuddyAsk, dispatchBuddyStage } from '@/lib/buddy/homeStage'
import type { Locale } from '@/lib/buddy/types'
import styles from './HubFragRemy.module.css'

export default function HubFragRemy() {
  const locale = useLocale() as Locale
  const t = useTranslations('hub.fragRemy')
  const stageRef = useRef<HTMLDivElement>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])

  // Daypart starter chips are client-only (the server's clock isn't the user's),
  // so they land after hydration; the rest of the section renders server-side.
  useEffect(() => {
    setSuggestions(greetingFor(new Date().getHours(), locale).suggestions)
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
        {/* Full cut-out Remy, bottom-aligned so he rises out of the yellow panel. */}
        <div className={styles.figureCol} ref={stageRef} data-fragremy-avatar="">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.figure} src="/buddy/buddy.webp" alt="Remy" width={220} height={220} />
        </div>
        <div className={styles.talk}>
          <h2 className={styles.heading}>{t('title')}</h2>
          <p className={styles.sub}>{t('sub')}</p>
          <div className={styles.chips} data-fragremy-chips="">
            {suggestions.map((s) => (
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
          {/* Sticker-styled chat input — invites typing, opens the panel. The
              placeholder avoids repeating the "Frag Remy" heading. */}
          <button type="button" className={styles.input} onClick={() => dispatchBuddyAsk()} aria-label={t('open')} data-fragremy-open="">
            <span className={styles.inputText}>{t('inputPlaceholder')}</span>
            <span className={styles.inputSend} aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  )
}
