'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import BuddyAvatar, { type BuddyMood } from './BuddyAvatar'
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

function TypingDots({ label }: { label: string }) {
  return (
    <span className={styles.typing} role="status" aria-label={label}>
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </span>
  )
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
  de: 'Hey, ich bin Remy! Was willst du heute essen? Pizza, Ramen, Brunch, Date Night oder etwas ganz anderes? Ich finde die passenden Spots in Berlin.',
  en: 'Hey, I’m Remy! What are you in the mood for today? Pizza, ramen, brunch, date night or something else entirely? I’ll find the right spots in Berlin.',
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

const T = {
  de: { open: 'Remy öffnen', close: 'Schließen', thinking: 'Remy denkt nach', placeholder: 'Frag mich über Berliner Food…' },
  en: { open: 'Open Remy', close: 'Close', thinking: 'Remy is thinking', placeholder: 'Ask me about Berlin food…' },
} satisfies Record<Locale, Record<string, string>>

export default function BuddyWidget() {
  const locale = useLocale() as Locale
  const t = T[locale]
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const { messages, isStreaming, send } = useBuddyChat()
  const launcherRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const [scrolling, setScrolling] = useState(false)
  const [happyBeat, setHappyBeat] = useState(false)
  const wasStreaming = useRef(false)

  const closePanel = useCallback(() => {
    setOpen(false)
    launcherRef.current?.focus()
  }, [])

  // Make Remy "talk" while the page is scrolling — a little sign of life on the
  // launcher. Goes quiet ~400ms after scrolling stops.
  // NOTE: capture:true — on desktop the SPA scrolls an inner `.app-pages`
  // container, not the window. Scroll events don't bubble, but they DO trickle
  // in the capture phase, so this catches both the inner scroller (desktop) and
  // the document (mobile).
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const onScroll = () => {
      setScrolling(true)
      clearTimeout(t)
      t = setTimeout(() => setScrolling(false), 400)
    }
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true })
      clearTimeout(t)
    }
  }, [])

  // A short "happy" laugh beat the moment an answer with spot recommendations
  // finishes streaming.
  useEffect(() => {
    const prev = wasStreaming.current
    wasStreaming.current = isStreaming
    if (prev && !isStreaming) {
      const last = messages[messages.length - 1]
      if (last?.role === 'assistant' && last.spots && last.spots.length > 0) setHappyBeat(true)
    }
  }, [isStreaming, messages])
  useEffect(() => {
    if (!happyBeat) return
    const t = setTimeout(() => setHappyBeat(false), 1600)
    return () => clearTimeout(t)
  }, [happyBeat])

  // Move focus into the dialog when it opens (keyboard/screen-reader users).
  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  // Escape closes the panel and returns focus to the launcher.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closePanel])

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

  const title = 'Remy'

  // Map Remy's state to a facial expression.
  const last = messages[messages.length - 1]
  const waiting = isStreaming && last?.role === 'assistant' && !last.content
  const speaking = isStreaming && last?.role === 'assistant' && !!last.content
  const panelMood: BuddyMood = happyBeat
    ? 'happy'
    : waiting
      ? 'thinking'
      : speaking
        ? 'talking'
        : messages.length === 0
          ? 'greeting'
          : 'idle'
  // Launcher mirrors the panel when open; otherwise it flaps while scrolling.
  const launcherMood: BuddyMood = open ? panelMood : scrolling ? 'talking' : 'idle'

  // No buddy on the map page — it would cover the map.
  const pathname = usePathname()
  if ((pathname ?? '').startsWith('/map')) return null

  return (
    <>
      <button
        ref={launcherRef}
        className={styles.launcher}
        data-buddy-launcher
        aria-label={t.open}
        aria-expanded={open}
        aria-controls="buddy-panel"
        onClick={() => setOpen((v) => !v)}
      >
        <BuddyAvatar mood={launcherMood} />
      </button>

      {open && (
        <div
          ref={panelRef}
          id="buddy-panel"
          className={styles.panel}
          data-buddy-panel="open"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
        >
          <div className={styles.header}>
            <BuddyAvatar mood={panelMood} />
            <strong>{title}</strong>
            <button className={styles.close} type="button" aria-label={t.close} onClick={closePanel}>
              ×
            </button>
          </div>
          <div className={styles.log} aria-live="polite">
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
                  {m.content ? (
                    <FormattedText text={m.content} />
                  ) : isStreaming && i === messages.length - 1 ? (
                    <TypingDots label={t.thinking} />
                  ) : null}
                  {/* Spots arrive (tool result) before the answer text streams.
                      Hold the cards until streaming finishes so the text doesn't
                      render on top and shove the cards down. */}
                  {m.spots && m.spots.length > 0 && !(isStreaming && i === messages.length - 1) && (
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
              placeholder={t.placeholder}
              disabled={isStreaming}
              aria-label={t.placeholder}
            />
            <button className={styles.send} type="submit" disabled={isStreaming || !draft.trim()} aria-label="Senden">
              →
            </button>
          </form>
        </div>
      )}
    </>
  )
}
