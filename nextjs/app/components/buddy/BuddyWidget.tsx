'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import BuddyAvatar, { type BuddyMood } from './BuddyAvatar'
import { useBuddyChat, type BuddyDisplayMessage } from './useBuddyChat'
import { splitAnswerSegments, extractFollowups } from '@/lib/buddy/stream'
import { greetingFor } from '@/lib/buddy/greeting'
import { isNearbyIntent } from '@/lib/buddy/nearbyIntent'
import {
  BUDDY_ASK_EVENT,
  type BuddyAskDetail,
} from '@/lib/buddy/homeStage'
import { useAuth } from '@/lib/auth'
import { useFavorites } from '@/lib/map/useFavorites'
import { useUserLocationContext } from '@/lib/map/UserLocationContext'
import { useOwnedEntitlements } from '@/lib/firebase/useOwnedEntitlements'
import type { Locale, SpotCandidate, ArticleResult, PackTeaser } from '@/lib/buddy/types'
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
    <span className={styles.typing} role="status">
      {label}
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
        <span className={styles.spotCta}>{cta}</span>
      </span>
      {onSave && (
        <button
          type="button"
          className={styles.spotSave}
          data-saved={isSaved ? 'true' : 'false'}
          aria-pressed={isSaved}
          aria-label={
            isSaved
              ? locale === 'en' ? 'Remove heart' : 'Herz entfernen'
              : locale === 'en' ? 'Heart this spot' : 'Spot herzen'
          }
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onSave()
          }}
        >
          {isSaved
            ? locale === 'en' ? 'Saved' : 'Drin'
            : locale === 'en' ? 'Save' : 'Merken'}
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
        <span className={styles.spotCta}>{cta}</span>
      </span>
    </Link>
  )
}

const T = {
  de: {
    open: 'Remy öffnen',
    close: 'Schließen',
    thinking: 'Antwort wird geladen',
    placeholder: 'Schreib Remy…',
    send: 'Senden',
  },
  en: {
    open: 'Open Remy',
    close: 'Close',
    thinking: 'Answer loading',
    placeholder: 'Message Remy…',
    send: 'Send',
  },
} satisfies Record<Locale, Record<string, string>>

// A short line in Remy's voice that hands the pack card over, so it doesn't
// just appear unannounced. Canned (app-controlled, not LLM) so his streamed
// answer stays sales-free — this aside is clearly the app nudging, in his tone.
const PACK_INTRO: Record<Locale, (name: string) => string> = {
  de: (name) => `Ach, und falls dich ${name} öfter packt — dafür hätte ich was:`,
  en: (name) => `Oh, and if ${name} is your thing — I’ve got something for that:`,
}

// Booster-Pack teaser card — rendered by the APP under a matching answer (the
// server picks at most one per request, see lib/buddy/packTeaser.ts). Remy's
// streamed text never sells; this card does, with canonical catalog copy.
function PackCard({
  pack,
  locale,
  onSelect,
}: {
  pack: PackTeaser
  locale: Locale
  onSelect: () => void
}) {
  return (
    <Link className={styles.packCard} href={`/pack/${pack.slug}`} prefetch onClick={onSelect} data-buddy-pack={pack.packId}>
      {pack.art && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.packArt} src={pack.art} alt="" width={52} height={70} loading="lazy" />
      )}
      <span className={styles.spotBody}>
        <span className={styles.articleKicker}>Booster Pack · {pack.name}</span>
        <span className={styles.spotName}>{pack.spectrum}</span>
        <span className={styles.packDesc}>{pack.description}</span>
        <span className={styles.spotCta}>{locale === 'en' ? 'View' : 'Ansehen'}</span>
      </span>
    </Link>
  )
}

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
  pack,
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
  /** Booster-Pack teaser — set only on the one message that may show it. */
  pack?: PackTeaser
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
      {pack && !streaming && (
        <div className={styles.packBlock}>
          <p className={styles.packIntro}>{PACK_INTRO[locale](pack.name)}</p>
          <PackCard pack={pack} locale={locale} onSelect={onSpotSelect} />
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
  const { location, loading: locating, request: requestLocation } = useUserLocationContext()
  const panelRef = useRef<HTMLDivElement>(null)

  // Save a spot to the user's map (Firestore favourites). Anonymous users get
  // the shared login modal from toggle() — same behaviour as the map's save button.
  const { user } = useAuth()
  const { favoriteIds, toggle: toggleFav } = useFavorites(user?.uid ?? null)

  // Booster-Pack teaser: at most ONE card per conversation, and never for a
  // pack the user already owns (or anything when they own All Berlin). For a
  // signed-in user we wait for the ownership snapshot (null = loading) instead
  // of flashing a card at a buyer and yanking it away.
  const ownedPacks = useOwnedEntitlements(user?.uid ?? null)
  const packVisible = (p: PackTeaser) =>
    user
      ? ownedPacks !== null && !ownedPacks.has(p.packId) && !ownedPacks.has('all-berlin')
      : true
  const firstPackIdx = messages.findIndex((m) => m.role === 'assistant' && m.pack && packVisible(m.pack))
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

  const [happyBeat, setHappyBeat] = useState(false)
  const [greetingBeat, setGreetingBeat] = useState(false)
  const wasStreaming = useRef(false)

  const closePanel = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    setGeo(location)
  }, [location, setGeo])

  const notifyLocationFailure = useCallback(() => {
    if (typeof window === 'undefined') return
    window.showNotification?.(
      locale === 'en'
        ? "Couldn't get your location — tell me your district instead."
        : 'Standort ließ sich nicht ermitteln — sag mir einfach deinen Bezirk.',
    )
  }, [locale])

  const sendWithLocationIfNeeded = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isStreaming || locating) return

      if (isNearbyIntent(trimmed) && !location) {
        const loc = await requestLocation()
        if (!loc) {
          notifyLocationFailure()
          return
        }
        setGeo(loc)
      }

      setDraft('')
      void send(trimmed)
    },
    [isStreaming, locating, location, notifyLocationFailure, requestLocation, send, setGeo],
  )

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

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closePanel])

  // Click/tap anywhere outside the panel closes it — standard overlay
  // behaviour, relevant on desktop where the page stays visible next to the
  // panel (mobile is near-fullscreen, so outside barely exists). pointerdown
  // (not click) so a drag that starts inside and ends outside doesn't close.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: Event) => {
      const panel = panelRef.current
      if (panel && e.target instanceof Node && !panel.contains(e.target)) closePanel()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, closePanel])

  // Stage chips / CTA hand-off: open the panel and (optionally) ask right away.
  // `send` self-guards against empty text and concurrent streams.
  useEffect(() => {
    const onAsk = (e: Event) => {
      const { question } = (e as CustomEvent<BuddyAskDetail>).detail ?? {}
      setOpen(true)
      if (question) void sendWithLocationIfNeeded(question)
    }
    window.addEventListener(BUDDY_ASK_EVENT, onAsk)
    return () => window.removeEventListener(BUDDY_ASK_EVENT, onAsk)
  }, [sendWithLocationIfNeeded])

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    void sendWithLocationIfNeeded(draft)
  }

  const ask = (text: string) => {
    void sendWithLocationIfNeeded(text)
  }

  // "Near me": locate the user (with visible feedback), then ask. On failure we
  // tell the user what happened instead of silently searching city-wide.
  const askNearby = () => {
    if (isStreaming || locating) return
    const q = locale === 'en' ? "What's good near me right now?" : 'Was Gutes in meiner Nähe?'
    void sendWithLocationIfNeeded(q)
  }

  const title = 'Remy'

  // Expression policy: the mouth flap only runs once answer text is actually
  // appearing, or when he "speaks" the already-visible greeting. Smile
  // (greeting) and laugh (happy) stay brief stills.
  const lastMsg = messages[messages.length - 1]
  const answerStarted = lastMsg?.role === 'assistant' && lastMsg.content.length > 0
  const panelMood: BuddyMood = happyBeat
    ? 'happy'
    : isStreaming
      ? answerStarted
        ? 'talking'
        : 'idle'
      : greetingBeat
        ? 'talking'
        : 'idle'
  // Remy lives ONLY on the home hub and opens from the "Frag Remy" section.
  // There is intentionally no fixed side launcher.
  const pathname = usePathname()
  if ((pathname ?? '/') !== '/') return null

  return (
    <>
      {open && (
        <>
          <div className={styles.scrim} aria-hidden="true" />
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
              <span className={styles.avatarFrame}>
                <BuddyAvatar mood={panelMood} size={58} />
              </span>
              <span className={styles.headerTitle}>
                <strong>{title}</strong>
              </span>
              <button className={styles.close} type="button" aria-label={t.close} onClick={closePanel}>
                <span aria-hidden="true">X</span>
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
                      pack={i === firstPackIdx ? m.pack : undefined}
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
              <button className={styles.send} type="submit" disabled={isStreaming || !draft.trim()} aria-label={t.send}>
                <span aria-hidden="true">{t.send}</span>
              </button>
            </form>
          </div>
        </>
      )}
    </>
  )
}
