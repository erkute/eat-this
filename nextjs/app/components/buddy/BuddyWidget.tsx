'use client'
import { useState } from 'react'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import BuddyAvatar from './BuddyAvatar'
import { useBuddyChat } from './useBuddyChat'
import type { Locale, SpotCandidate } from '@/lib/buddy/types'
import styles from './BuddyWidget.module.css'

function SpotCard({ spot }: { spot: SpotCandidate }) {
  return (
    <Link className={styles.spotCard} href={`/restaurant/${spot.slug}`}>
      <strong>{spot.name}</strong>
      {spot.cuisineType ? ` · ${spot.cuisineType}` : ''}
      {spot.bezirk ? ` · ${spot.bezirk}` : ''}
    </Link>
  )
}

export default function BuddyWidget() {
  const locale = useLocale() as Locale
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const { messages, isStreaming, send } = useBuddyChat()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = draft
    setDraft('')
    void send(text)
  }

  const placeholder = locale === 'en' ? 'Ask me about Berlin food…' : 'Frag mich über Berliner Food…'
  const title = 'Eat This Buddy'

  return (
    <>
      <button
        className={styles.launcher}
        data-buddy-launcher
        aria-label={title}
        onClick={() => setOpen((v) => !v)}
      >
        <BuddyAvatar isTalking={isStreaming && open} />
      </button>

      {open && (
        <div className={styles.panel} data-buddy-panel="open" role="dialog" aria-label={title}>
          <div className={styles.header}>
            <BuddyAvatar isTalking={isStreaming} />
            <strong>{title}</strong>
          </div>
          <div className={styles.log}>
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className={styles.msgUser}>{m.content}</div>
              ) : (
                <div key={i} className={styles.msgBot}>
                  {m.content}
                  {m.spots && m.spots.length > 0 && (
                    <div className={styles.spots}>
                      {m.spots.slice(0, 4).map((s) => (
                        <SpotCard key={s.slug} spot={s} />
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
          <form className={styles.form} onSubmit={onSubmit}>
            <input
              className={styles.input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              disabled={isStreaming}
            />
            <button className={styles.send} type="submit" disabled={isStreaming || !draft.trim()}>
              →
            </button>
          </form>
        </div>
      )}
    </>
  )
}
