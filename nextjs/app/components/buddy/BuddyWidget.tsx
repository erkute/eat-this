'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import BuddyAvatar, { type BuddyMood } from './BuddyAvatar'
import { useBuddyChat, type BuddyDisplayMessage } from './useBuddyChat'
import { splitAnswerSegments, extractFollowups } from '@/lib/buddy/stream'
import { greetingFor } from '@/lib/buddy/greeting'
import {
  BUDDY_ASK_EVENT,
  BUDDY_STAGE_EVENT,
  type BuddyAskDetail,
  type BuddyStageDetail,
  type BuddyStageRect,
} from '@/lib/buddy/homeStage'
import { useAuth } from '@/lib/auth'
import { useFavorites } from '@/lib/map/useFavorites'
import type { Locale, SpotCandidate, ArticleResult } from '@/lib/buddy/types'
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

function SpotCard({
  spot,
  locale,
  onSelect,
  isSaved,
  onSave,
}: {
  spot: SpotCandidate
  locale: Locale
  onSelect: () => void
  isSaved?: boolean
  onSave?: () => void
}) {
  const meta = [spot.cuisineType, spot.bezirk, spot.priceRange, spot.distanceLabel].filter(Boolean).join(' · ')
  const cta = locale === 'en' ? 'Show on map' : 'Auf der Karte ansehen'
  return (
    <Link className={styles.spotCard} href={`/map?r=${spot.slug}`} prefetch onClick={onSelect}>
      {spot.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.spotImg} src={spot.image} alt="" width={56} height={56} loading="lazy" />
      )}
      <span className={styles.spotBody}>
        <span className={styles.spotName}>{spot.name}</span>
        {meta && <span className={styles.spotMeta}>{meta}</span>}
        {spot.openLabel && (
          <span className={styles.spotStatus} data-open={spot.openNow ? 'true' : 'false'}>
            {spot.openLabel}
          </span>
        )}
        {spot.shortDescription && <span className={styles.spotDesc}>{spot.shortDescription}</span>}
        <span className={styles.spotCta}>{cta} →</span>
      </span>
      {onSave && (
        <button
          type="button"
          className={styles.spotSave}
          data-saved={isSaved ? 'true' : 'false'}
          aria-pressed={isSaved}
          aria-label={
            isSaved
              ? locale === 'en' ? 'Remove from my map' : 'Von meiner Map entfernen'
              : locale === 'en' ? 'Save to my map' : 'Auf meine Map'
          }
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onSave()
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}
    </Link>
  )
}

function ArticleCard({ article, locale, onSelect }: { article: ArticleResult; locale: Locale; onSelect: () => void }) {
  const cta = locale === 'en' ? 'Read' : 'Lesen'
  return (
    <Link className={styles.articleCard} href={`/news/${article.slug}`} prefetch onClick={onSelect}>
      <span className={styles.spotBody}>
        <span className={styles.articleKicker}>{locale === 'en' ? 'From the magazine' : 'Aus dem Magazin'}</span>
        <span className={styles.spotName}>{article.title}</span>
        {article.excerpt && <span className={styles.spotDesc}>{article.excerpt}</span>}
        <span className={styles.spotCta}>{cta} →</span>
      </span>
    </Link>
  )
}

const T = {
  de: { open: 'Remy öffnen', close: 'Schließen', thinking: 'Remy denkt nach', placeholder: 'Schreib Remy…' },
  en: { open: 'Open Remy', close: 'Close', thinking: 'Remy is thinking', placeholder: 'Message Remy…' },
} satisfies Record<Locale, Record<string, string>>

// Renders one assistant message: prose with spot cards interleaved at their
// `[[spot:<slug>]]` markers. Spots Remy didn't place inline fall back to a block
// at the end — but only when he placed NONE (else we'd re-introduce the noise of
// dumping unrelated candidates) and only once streaming for this message ended.
function BotMessage({
  m,
  locale,
  streaming,
  isLast,
  onSpotSelect,
  onFollowup,
  savedIds,
  onSaveSpot,
  thinkingLabel,
}: {
  m: BuddyDisplayMessage
  locale: Locale
  streaming: boolean
  isLast: boolean
  onSpotSelect: () => void
  onFollowup: (text: string) => void
  savedIds: Set<string>
  onSaveSpot: (spot: SpotCandidate) => void
  thinkingLabel: string
}) {
  if (!m.content) {
    return streaming ? <TypingDots label={thinkingLabel} /> : null
  }
  const spots = m.spots ?? []
  const allowed = new Set(spots.map((s) => s.slug))
  const bySlug = new Map(spots.map((s) => [s.slug, s]))
  // Pull the follow-up chips off the end first, then split the rest into
  // text + spot-card segments.
  const { chips, rest } = extractFollowups(m.content)
  const { segments, placedSlugs } = splitAnswerSegments(rest, allowed)
  const showFallback = !streaming && placedSlugs.length === 0 && spots.length > 0
  // Linked magazine articles Remy pulled via search_articles.
  const articles = m.articles ?? []
  const showArticles = !streaming && articles.length > 0
  // Follow-up chips only on the newest answer, once it finished streaming.
  const showChips = isLast && !streaming && chips.length > 0

  return (
    <>
      {segments.map((seg, si) =>
        seg.type === 'text' ? (
          <FormattedText key={si} text={seg.text} />
        ) : bySlug.has(seg.slug) ? (
          <div key={si} className={styles.spots}>
            <SpotCard
              spot={bySlug.get(seg.slug)!}
              locale={locale}
              onSelect={onSpotSelect}
              isSaved={savedIds.has(bySlug.get(seg.slug)!._id)}
              onSave={() => onSaveSpot(bySlug.get(seg.slug)!)}
            />
          </div>
        ) : null,
      )}
      {showFallback && (
        <div className={styles.spots}>
          {spots.slice(0, 4).map((s) => (
            <SpotCard
              key={s.slug}
              spot={s}
              locale={locale}
              onSelect={onSpotSelect}
              isSaved={savedIds.has(s._id)}
              onSave={() => onSaveSpot(s)}
            />
          ))}
        </div>
      )}
      {showArticles && (
        <div className={styles.spots}>
          {articles.slice(0, 2).map((a) => (
            <ArticleCard key={a.slug} article={a} locale={locale} onSelect={onSpotSelect} />
          ))}
        </div>
      )}
      {showChips && (
        <div className={styles.chips}>
          {chips.map((c) => (
            <button key={c} type="button" className={styles.chip} onClick={() => onFollowup(c)}>
              {c}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

export default function BuddyWidget() {
  const locale = useLocale() as Locale
  const t = T[locale]
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const { messages, isStreaming, send, setGeo } = useBuddyChat()
  const launcherRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Save a spot to the user's map (Firestore favourites). Anonymous users are
  // sent to /login by toggle() — same behaviour as the map's save button.
  const { user } = useAuth()
  const { favoriteIds, toggle: toggleFav } = useFavorites(user?.uid ?? null)
  const onSaveSpot = useCallback(
    (s: SpotCandidate) => {
      void toggleFav({
        _id: s._id,
        name: s.name,
        slug: s.slug,
        photo: s.image ?? undefined,
        district: s.bezirk ?? undefined,
      })
    },
    [toggleFav],
  )

  const [scrolling, setScrolling] = useState(false)
  const [happyBeat, setHappyBeat] = useState(false)
  const [greetingBeat, setGreetingBeat] = useState(false)
  const [locating, setLocating] = useState(false)
  const wasStreaming = useRef(false)
  const [onStage, setOnStage] = useState(false)
  const [arrivalBeat, setArrivalBeat] = useState(false)
  const stageRect = useRef<BuddyStageRect | null>(null)

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

  // When the panel opens on an empty chat the greeting text is already there,
  // so Remy "speaks" it: a brief mouth flap, then settle.
  useEffect(() => {
    if (!(open && messages.length === 0)) {
      setGreetingBeat(false)
      return
    }
    setGreetingBeat(true)
    const t = setTimeout(() => setGreetingBeat(false), 2500)
    return () => clearTimeout(t)
  }, [open, messages.length])

  // Move focus into the dialog when it opens (keyboard/screen-reader users).
  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  // Lock background scroll while the panel is open so the page doesn't scroll
  // behind the chat. Desktop scrolls an inner `.app-pages` container; mobile
  // scrolls the document — lock both and restore on close.
  useEffect(() => {
    if (!open) return
    const ap = document.querySelector('.app-pages') as HTMLElement | null
    const prevAp = ap?.style.overflow ?? ''
    const prevBody = document.body.style.overflow
    if (ap) ap.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      if (ap) ap.style.overflow = prevAp
      document.body.style.overflow = prevBody
    }
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

  // ── Home-stage protocol ──
  // While the hub's "Frag Remy" section is on screen there is only ONE Remy —
  // the stage one — so the corner launcher hides. When the stage scrolls away,
  // the launcher flies in from where the stage avatar last stood (FLIP) and
  // smiles briefly on arrival. See lib/buddy/homeStage.ts.
  useEffect(() => {
    const onStageEvent = (e: Event) => {
      const { visible, rect } = (e as CustomEvent<BuddyStageDetail>).detail
      stageRect.current = rect ?? null
      setOnStage(visible)
    }
    window.addEventListener(BUDDY_STAGE_EVENT, onStageEvent)
    return () => window.removeEventListener(BUDDY_STAGE_EVENT, onStageEvent)
  }, [])

  const wasOnStage = useRef(false)
  useEffect(() => {
    const was = wasOnStage.current
    wasOnStage.current = onStage
    if (!was || onStage) return
    const btn = launcherRef.current
    const from = stageRect.current
    // No rect (section unmounted) or no WAAPI (jsdom): just appear in place.
    if (!btn || !from || typeof btn.animate !== 'function') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const to = btn.getBoundingClientRect()
    if (to.width === 0) return
    const dx = from.left + from.width / 2 - (to.left + to.width / 2)
    const dy = from.top + from.height / 2 - (to.top + to.height / 2)
    btn.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width})`, opacity: 0.85 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 480, easing: 'cubic-bezier(0.22, 0.8, 0.3, 1)' },
    )
    setArrivalBeat(true)
  }, [onStage])

  useEffect(() => {
    if (!arrivalBeat) return
    const t = setTimeout(() => setArrivalBeat(false), 1600)
    return () => clearTimeout(t)
  }, [arrivalBeat])

  // Stage chips / CTA hand-off: open the panel and (optionally) ask right away.
  // `send` self-guards against empty text and concurrent streams.
  useEffect(() => {
    const onAsk = (e: Event) => {
      const { question } = (e as CustomEvent<BuddyAskDetail>).detail ?? {}
      setOpen(true)
      if (question) void send(question)
    }
    window.addEventListener(BUDDY_ASK_EVENT, onAsk)
    return () => window.removeEventListener(BUDDY_ASK_EVENT, onAsk)
  }, [send])

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

  // "Near me": locate the user (with visible feedback), then ask. On failure we
  // tell the user what happened instead of silently searching city-wide.
  const askNearby = () => {
    if (isStreaming || locating) return
    const q = locale === 'en' ? "What's good near me right now?" : 'Was Gutes in meiner Nähe?'
    const notify = (msg: string) =>
      typeof window !== 'undefined' && window.showNotification?.(msg)
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      notify(locale === 'en' ? 'Location not available on this device.' : 'Standort auf diesem Gerät nicht verfügbar.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        ask(q)
      },
      (err) => {
        setLocating(false)
        const denied = err.code === err.PERMISSION_DENIED
        notify(
          denied
            ? locale === 'en'
              ? 'Location access is blocked — allow it, or tell me your district.'
              : 'Standortzugriff ist blockiert — erlaub ihn oder sag mir deinen Bezirk.'
            : locale === 'en'
              ? "Couldn't get your location — tell me your district instead."
              : 'Standort ließ sich nicht ermitteln — sag mir einfach deinen Bezirk.',
        )
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    )
  }

  const title = 'Remy'

  // Expression policy: while Remy is still "thinking" (streaming, but no
  // answer text yet — the typing-dots phase) he ponders with the O-mouth
  // still. The mouth flap only runs once answer text is actually appearing,
  // or when he "speaks" the already-visible greeting. Smile (greeting) and
  // laugh (happy) stay brief stills.
  const lastMsg = messages[messages.length - 1]
  const answerStarted = lastMsg?.role === 'assistant' && lastMsg.content.length > 0
  const panelMood: BuddyMood = happyBeat
    ? 'happy'
    : isStreaming
      ? answerStarted
        ? 'talking'
        : 'thinking'
      : greetingBeat
        ? 'talking'
        : 'idle'
  const launcherMood: BuddyMood = open
    ? panelMood
    : arrivalBeat
      ? 'greeting'
      : scrolling
        ? 'talking'
        : 'idle'

  // No buddy on the map page — it would cover the map.
  const pathname = usePathname()
  if ((pathname ?? '').startsWith('/map')) return null

  return (
    <>
      <button
        ref={launcherRef}
        className={styles.launcher}
        data-buddy-launcher
        data-stage={onStage ? 'true' : undefined}
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
            <BuddyAvatar mood={panelMood} size={72} />
            <strong>{title}</strong>
            <button className={styles.close} type="button" aria-label={t.close} onClick={closePanel}>
              ×
            </button>
          </div>
          <div className={styles.log} aria-live="polite">
            {messages.length === 0 &&
              (() => {
                // Time-of-day opener + starter chips (computed client-side; the
                // intro only renders after the user opens the panel).
                const intro = greetingFor(new Date().getHours(), locale)
                return (
                  <div className={styles.intro}>
                    <div className={styles.msgBot}>
                      <FormattedText text={intro.greeting} />
                    </div>
                    <div className={styles.chips}>
                      <button type="button" className={styles.chipNear} onClick={askNearby} disabled={locating} aria-busy={locating}>
                        {locating ? (
                          <span className={styles.nearSpinner} aria-hidden="true" />
                        ) : (
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                        )}
                        {locating
                          ? locale === 'en' ? 'Locating…' : 'Standort…'
                          : locale === 'en' ? 'Near me' : 'In meiner Nähe'}
                      </button>
                      {intro.suggestions.map((s) => (
                        <button key={s} type="button" className={styles.chip} onClick={() => ask(s)}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })()}
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className={styles.msgUser}>
                  {m.content}
                </div>
              ) : (
                <div key={i} className={styles.msgBot}>
                  <BotMessage
                    m={m}
                    locale={locale}
                    streaming={isStreaming && i === messages.length - 1}
                    isLast={i === messages.length - 1}
                    onSpotSelect={() => setOpen(false)}
                    onFollowup={ask}
                    savedIds={favoriteIds}
                    onSaveSpot={onSaveSpot}
                    thinkingLabel={t.thinking}
                  />
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
