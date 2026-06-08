'use client'
import { useState } from 'react'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import BuddyAvatar from './BuddyAvatar'
import { useBuddyChat } from './useBuddyChat'
import type { Locale, SpotCandidate } from '@/lib/buddy/types'
import styles from './BuddyWidget.module.css'

// Minimal inline markdown: **bold** only (Claude's main inline marker).
function inlineBold(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part) ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  )
}

// Render Claude's plain-text answer as light markdown: paragraphs, bullet
// lists and bold — so it doesn't read as one flat wall with raw ** markers.
function FormattedText({ text }: { text: string }) {
  const blocks: React.ReactNode[] = []
  let bullets: string[] = []
  let key = 0
  const flush = () => {
    if (bullets.length) {
      const items = bullets
      blocks.push(
        <ul key={`ul${key++}`} className={styles.botList}>
          {items.map((b, i) => (
            <li key={i}>{inlineBold(b)}</li>
          ))}
        </ul>,
      )
      bullets = []
    }
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    const bullet = line.match(/^[-*]\s+(.*)/)
    if (bullet) {
      bullets.push(bullet[1])
      continue
    }
    flush()
    if (!line) continue
    const heading = line.match(/^#{1,4}\s+(.*)/)
    blocks.push(
      <p key={`p${key++}`} className={styles.botP}>
        {heading ? <strong>{inlineBold(heading[1])}</strong> : inlineBold(line)}
      </p>,
    )
  }
  flush()
  return <>{blocks}</>
}

function SpotCard({ spot, locale, onSelect }: { spot: SpotCandidate; locale: Locale; onSelect: () => void }) {
  const meta = [spot.cuisineType, spot.bezirk, spot.priceRange].filter(Boolean).join(' · ')
  const cta = locale === 'en' ? 'Show on map' : 'Auf der Karte ansehen'
  return (
    <Link className={styles.spotCard} href={`/map?r=${spot.slug}`} onClick={onSelect}>
      {spot.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.spotImg} src={spot.image} alt="" width={56} height={56} loading="lazy" />
      )}
      <span className={styles.spotBody}>
        <span className={styles.spotName}>{spot.name}</span>
        {meta && <span className={styles.spotMeta}>{meta}</span>}
        {spot.shortDescription && <span className={styles.spotDesc}>{spot.shortDescription}</span>}
        <span className={styles.spotCta}>{cta} →</span>
      </span>
    </Link>
  )
}

const GREETING: Record<Locale, string> = {
  de: 'Hey! Was willst du heute essen? Pizza, Ramen, Brunch, Date Night oder etwas ganz anderes? Ich finde die passenden Spots in Berlin.',
  en: 'Hey! What are you in the mood for today? Pizza, ramen, brunch, date night or something else entirely? I’ll find the right spots in Berlin.',
}

const SUGGESTIONS: Record<Locale, string[]> = {
  de: [
    'Ich hab Bock auf richtig gute Pizza',
    'Wo gibt’s guten Ramen?',
    'Ein schöner Brunch-Spot',
    'Date Night – wo hin?',
  ],
  en: [
    'I’m craving really good pizza',
    'Where’s good ramen?',
    'A nice brunch spot',
    'Date night – where to go?',
  ],
}

export default function BuddyWidget() {
  const locale = useLocale() as Locale
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const { messages, isStreaming, send } = useBuddyChat()

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const text = draft
    setDraft('')
    void send(text)
  }

  const ask = (text: string) => {
    if (isStreaming) return
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
            {messages.length === 0 && (
              <div className={styles.intro}>
                <div className={styles.msgBot}>
                  <FormattedText text={GREETING[locale]} />
                </div>
                <div className={styles.chips}>
                  {SUGGESTIONS[locale].map((s) => (
                    <button key={s} type="button" className={styles.chip} onClick={() => ask(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className={styles.msgUser}>
                  {m.content}
                </div>
              ) : (
                <div key={i} className={styles.msgBot}>
                  <FormattedText text={m.content} />
                  {m.spots && m.spots.length > 0 && (
                    <div className={styles.spots}>
                      {m.spots.slice(0, 4).map((s) => (
                        <SpotCard key={s.slug} spot={s} locale={locale} onSelect={() => setOpen(false)} />
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
