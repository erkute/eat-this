'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import BuddyAvatar, { type BuddyMood } from './BuddyAvatar';
import { useBuddyChat, type BuddyDisplayMessage } from './useBuddyChat';
import { splitAnswerSegments, extractFollowups } from '@/lib/buddy/stream';
import { greetingFor } from '@/lib/buddy/greeting';
import { localizedCuisine } from '@/lib/cuisineLabels';
import { isNearbyIntent } from '@/lib/buddy/nearbyIntent';
import {
  BUDDY_ASK_EVENT,
  consumePendingBuddyAsk,
  type BuddyAskDetail,
} from '@/lib/buddy/homeStage';
import { useAuth } from '@/lib/auth';
import { useFavorites } from '@/lib/map/useFavorites';
import { useUserLocationContext } from '@/lib/map/UserLocationContext';
import { HeartIcon } from '@/app/components/map/icons';
import type { Locale, SpotCandidate, ArticleResult, PackTeaser } from '@/lib/buddy/types';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import styles from './BuddyWidget.module.css';

/* Inline-Markdown, wie Claude es tatsächlich setzt: `**fett**` und `*kursiv*`.
   Kursiv fehlte — er betont damit gern ein einzelnes Wort („eigentlich *die*
   Pizza-Referenz"), und die Sternchen standen roh im Text. */
function inlineMarkup(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*\n]+\*$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

// Render Claude's plain-text answer as light markdown: paragraphs, bullet
// lists, bold and italic — so it doesn't read as one flat wall with raw
// ** and * markers.
function FormattedText({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;
  const flush = () => {
    if (bullets.length) {
      const items = bullets;
      blocks.push(
        <ul key={`ul${key++}`} className={styles.botList}>
          {items.map((b, i) => (
            <li key={i}>{inlineMarkup(b)}</li>
          ))}
        </ul>
      );
      bullets = [];
    }
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const bullet = line.match(/^[-*]\s+(.*)/);
    if (bullet) {
      bullets.push(bullet[1]);
      continue;
    }
    flush();
    if (!line) continue;
    const heading = line.match(/^#{1,4}\s+(.*)/);
    blocks.push(
      <p key={`p${key++}`} className={styles.botP}>
        {heading ? <strong>{inlineMarkup(heading[1])}</strong> : inlineMarkup(line)}
      </p>
    );
  }
  flush();
  return <>{blocks}</>;
}

function TypingDots({ label }: { label: string }) {
  return (
    <span className={styles.typing}>
      {label}
      <span className={styles.typingDots} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </span>
  );
}

// Das gelbe 9px-Quadrat vor jedem Kicker — dasselbe Zeichen wie `hv-mk` auf
// der Startseite und vor jedem Insider-Tipp.
function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className={styles.kicker}>
      <span className={styles.mk} aria-hidden="true" />
      {children}
    </span>
  );
}

/**
 * Ein Spot als kleine Fakten-Tafel: Foto, Name, die harten Angaben, der
 * Offen-Zustand. KEINE Beschreibung, solange Remy den Spot im Text vorstellt —
 * er formuliert seinen Absatz aus genau diesem Feld, die Karte sagte darunter
 * also dasselbe ein zweites Mal ("Erste Berliner Pizzeria mit original
 * Stefano-Ferrara-Holzofen …" stand am 08.09.2026 wörtlich zweimal
 * untereinander). In der Sammelausgabe am Ende (`showDesc`) hat er über die
 * Spots nichts geschrieben — dort ist die Beschreibung die einzige Auskunft.
 *
 * Die Fläche selbst ist der Weg zur Map. Kein „Auf der Map ansehen"-Balken
 * mehr: Pfeil, Verb und Ring sind an dieser Stelle der Site alle drei
 * abgelehnt worden, und vier schwarze Balken unter einer Antwort waren vier
 * Verben unter vier Flächen, die schon Knöpfe sind.
 */
function SpotCard({
  spot,
  locale,
  onSelect,
  isSaved,
  onSave,
  showDesc,
}: {
  spot: SpotCandidate;
  locale: Locale;
  onSelect: () => void;
  isSaved?: boolean;
  onSave?: () => void;
  /** Beschreibung mitzeigen — nur wo kein Absatz von Remy darüber steht. */
  showDesc?: boolean;
}) {
  const facts = [
    spot.cuisineType ? localizedCuisine(spot.cuisineType, locale === 'en' ? 'en' : 'de') : null,
    spot.bezirk,
    spot.priceRange,
  ].filter(Boolean) as string[];
  const openLabel = locale === 'en' ? `Show ${spot.name} on the map` : `${spot.name} auf der Map`;
  return (
    <article className={styles.spotCard}>
      <Link
        className={styles.spotCardLink}
        href={`/map?r=${spot.slug}`}
        prefetch
        aria-label={openLabel}
        onClick={onSelect}
      >
        {spot.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.spotImg}
            src={spot.image}
            srcSet={sanitySrcSet(spot.image, [320, 480, 640, 800], 82)}
            sizes="(max-width: 480px) calc(94vw - 48px), 360px"
            alt=""
            width={640}
            height={400}
            loading="lazy"
          />
        )}
        <span className={styles.spotBody}>
          <span className={styles.spotName}>{spot.name}</span>
          {(facts.length > 0 || spot.distanceLabel) && (
            <span className={styles.spotMeta}>
              {facts.join(' · ')}
              {/* Die Entfernung gelb: die einzige Angabe der Zeile, die vom
                  Nutzer selbst abhängt. */}
              {spot.distanceLabel && (
                <span className={styles.spotDist}>
                  {facts.length > 0 ? '· ' : ''}
                  {spot.distanceLabel}
                </span>
              )}
            </span>
          )}
          {spot.openLabel && (
            <span className={styles.spotStatus} data-open={spot.openNow ? 'true' : 'false'}>
              {spot.openLabel}
            </span>
          )}
          {showDesc && spot.shortDescription && (
            <span className={styles.spotDesc}>{spot.shortDescription}</span>
          )}
        </span>
      </Link>
      {onSave && (
        <button
          type="button"
          className={styles.spotSave}
          data-saved={isSaved ? 'true' : 'false'}
          aria-pressed={isSaved}
          aria-label={
            isSaved
              ? locale === 'en'
                ? 'Remove heart'
                : 'Herz entfernen'
              : locale === 'en'
                ? 'Heart this spot'
                : 'Spot herzen'
          }
          onClick={onSave}
        >
          <HeartIcon filled={!!isSaved} />
        </button>
      )}
    </article>
  );
}

function ArticleCard({
  article,
  locale,
  onSelect,
}: {
  article: ArticleResult;
  locale: Locale;
  onSelect: () => void;
}) {
  return (
    <Link className={styles.articleCard} href={`/news/${article.slug}`} prefetch onClick={onSelect}>
      <span className={styles.spotBody}>
        <Kicker>{locale === 'en' ? 'From the magazine' : 'Aus dem Magazin'}</Kicker>
        <span className={styles.spotName}>{article.title}</span>
        {article.excerpt && <span className={styles.spotDesc}>{article.excerpt}</span>}
      </span>
    </Link>
  );
}

const T = {
  de: {
    open: 'Remy öffnen',
    close: 'Schließen',
    thinking: 'Remy denkt nach …',
    placeholder: 'Schreib Remy…',
    send: 'Senden',
    stop: 'Stopp',
    reset: 'Neu',
    resetAria: 'Gespräch neu anfangen',
    answered: 'Remy hat geantwortet.',
  },
  en: {
    open: 'Open Remy',
    close: 'Close',
    thinking: 'Remy is thinking …',
    placeholder: 'Message Remy…',
    send: 'Send',
    stop: 'Stop',
    reset: 'New',
    resetAria: 'Start a new conversation',
    answered: 'Remy has answered.',
  },
} satisfies Record<Locale, Record<string, string>>;

// A short line in Remy's voice that hands the pack card over, so it doesn't
// just appear unannounced. Canned (app-controlled, not LLM) so his streamed
// answer stays sales-free — this aside is clearly the app nudging, in his tone.
const PACK_INTRO: Record<Locale, (name: string) => string> = {
  de: (name) => `Ach, und falls dich ${name} öfter packt — dafür hätte ich was:`,
  en: (name) => `Oh, and if ${name} is your thing — I’ve got something for that:`,
};

// Booster-Pack teaser card — rendered by the APP under a matching answer (the
// server picks at most one per request, see lib/buddy/packTeaser.ts). Remy's
// streamed text never sells; this card does, with canonical catalog copy.
//
// Aufgebaut wie eine Kachel auf /packs: die Karte steht frei mit dem
// Sheet-Schatten, der Pack-NAME ist die Überschrift, die Spectrum-Zeile die
// Unterzeile. Vorher stand das Spectrum groß als Name da und der echte Name
// nur klein im Kicker — die Hierarchie war vertauscht, und ein „Ansehen"
// darunter war der zweite Ausgang einer Kachel, die als Ganzes der Weg ist.
function PackCard({ pack, onSelect }: { pack: PackTeaser; onSelect: () => void }) {
  return (
    <Link
      className={styles.packCard}
      href={`/pack/${pack.slug}`}
      prefetch
      onClick={onSelect}
      data-buddy-pack={pack.packId}
    >
      {pack.art && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.packArt}
          src={pack.art}
          alt=""
          width={420}
          height={656}
          loading="lazy"
        />
      )}
      <span className={styles.spotBody}>
        <Kicker>Booster Pack</Kicker>
        <span className={`${styles.spotName} ${styles.packName}`}>{pack.name}</span>
        <span className={styles.packSpectrum}>{pack.spectrum}</span>
        <span className={styles.packDesc}>{pack.description}</span>
      </span>
    </Link>
  );
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
  pageSlug,
}: {
  m: BuddyDisplayMessage;
  locale: Locale;
  streaming: boolean;
  isLast: boolean;
  onSpotSelect: () => void;
  onFollowup: (text: string) => void;
  savedIds: Set<string>;
  onSaveSpot: (spot: SpotCandidate) => void;
  thinkingLabel: string;
  /** Booster-Pack teaser — set only on the one message that may show it. */
  pack?: PackTeaser;
  /** Restaurant-Seite, auf der der Chat steht — dieser Spot fällt aus der
   *  Sammelausgabe. */
  pageSlug?: string;
}) {
  if (!m.content) {
    return streaming ? <TypingDots label={thinkingLabel} /> : null;
  }
  const spots = m.spots ?? [];
  const allowed = new Set(spots.map((s) => s.slug));
  const bySlug = new Map(spots.map((s) => [s.slug, s]));
  // Pull the follow-up chips off the end first, then split the rest into
  // text + spot-card segments.
  const { chips, rest } = extractFollowups(m.content);
  const { segments, placedSlugs } = splitAnswerSegments(rest, allowed);
  /* Die Sammelausgabe ohne den Spot, dessen Seite der Nutzer gerade liest:
     auf ZOLAs Seite beantwortete Remy „was bestell ich hier am besten?"
     richtig und setzte — der Regel folgend — keinen Marker für ZOLA. Die
     Sammelausgabe legte darunter trotzdem eine ZOLA-Karte, also den Weg zu
     der Seite, auf der man steht. */
  const fallbackSpots = pageSlug ? spots.filter((s) => s.slug !== pageSlug) : spots;
  const showFallback = !streaming && placedSlugs.length === 0 && fallbackSpots.length > 0;
  // Linked magazine articles Remy pulled via search_articles.
  const articles = m.articles ?? [];
  const showArticles = !streaming && articles.length > 0;
  // Follow-up chips only on the newest answer, once it finished streaming.
  const showChips = isLast && !streaming && chips.length > 0;

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
        ) : null
      )}
      {showFallback && (
        <div className={styles.spots}>
          {fallbackSpots.slice(0, 4).map((s) => (
            <SpotCard
              key={s.slug}
              spot={s}
              locale={locale}
              onSelect={onSpotSelect}
              isSaved={savedIds.has(s._id)}
              onSave={() => onSaveSpot(s)}
              // Hier steht kein Absatz von Remy über den Spots — die
              // Beschreibung ist die einzige Auskunft, die sie tragen.
              showDesc
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
          <PackCard pack={pack} onSelect={onSpotSelect} />
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
  );
}

export default function BuddyWidget({ pageSlug }: { pageSlug?: string } = {}) {
  const locale = useLocale() as Locale;
  const t = T[locale];
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const { messages, isStreaming, send, stop, reset, setGeo } = useBuddyChat({ pageSlug });
  const { location, loading: locating, request: requestLocation } = useUserLocationContext();
  const panelRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Wohin der Fokus zurückgeht, wenn das Panel schließt — sonst landet er beim
  // <body> und die nächste Tab-Taste beginnt oben auf der Seite.
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Save a spot to the user's map (Firestore favourites). Anonymous users get
  // the shared login modal from toggle() — same behaviour as the map's save button.
  const { user } = useAuth();
  const { favoriteIds, toggle: toggleFav } = useFavorites(user?.uid ?? null);

  // Booster-Pack teaser: at most ONE card per conversation. Ob das Konto das
  // Pack schon hat, entscheidet die Route am verifizierten Token — was hier
  // ankommt, darf gezeigt werden.
  const firstPackIdx = messages.findIndex((m) => m.role === 'assistant' && m.pack);
  const onSaveSpot = useCallback(
    (s: SpotCandidate) => {
      void toggleFav({
        _id: s._id,
        name: s.name,
        slug: s.slug,
        photo: s.image ?? undefined,
        district: s.bezirk ?? undefined,
      });
    },
    [toggleFav]
  );

  const [happyBeat, setHappyBeat] = useState(false);
  const [greetingBeat, setGreetingBeat] = useState(false);
  // Was der Vorleser hört: einmal die fertige Antwort, statt bei jedem Token
  // die ganze Unterhaltung neu.
  const [srStatus, setSrStatus] = useState('');
  const wasStreaming = useRef(false);

  const closePanel = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    setGeo(location);
  }, [location, setGeo]);

  const notifyLocationFailure = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.showNotification?.(
      locale === 'en'
        ? "Couldn't get your location — tell me your district instead."
        : 'Standort ließ sich nicht ermitteln — sag mir einfach deinen Bezirk.'
    );
  }, [locale]);

  const sendWithLocationIfNeeded = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming || locating) return;

      if (isNearbyIntent(trimmed, { pageBound: !!pageSlug }) && !location) {
        const loc = await requestLocation();
        if (!loc) {
          notifyLocationFailure();
          return;
        }
        setGeo(loc);
      }

      setDraft('');
      void send(trimmed);
    },
    [
      isStreaming,
      locating,
      location,
      notifyLocationFailure,
      requestLocation,
      send,
      setGeo,
      pageSlug,
    ]
  );

  // A short "happy" laugh beat the moment an answer with spot recommendations
  // finishes streaming.
  useEffect(() => {
    const prev = wasStreaming.current;
    wasStreaming.current = isStreaming;
    if (prev && !isStreaming) {
      const last = messages[messages.length - 1];
      if (last?.role === 'assistant' && last.spots && last.spots.length > 0) setHappyBeat(true);
      if (last?.role === 'assistant' && last.content) {
        // Ohne die Marker: `[[spot:…]]` und `[[chips:…]]` sind Anweisungen an
        // die App, kein Text zum Vorlesen.
        const { rest } = extractFollowups(last.content);
        setSrStatus(
          rest
            .replace(/\[\[spot:[A-Za-z0-9-]+\]\]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        );
      }
    } else if (isStreaming && !prev) {
      setSrStatus(t.thinking);
    }
  }, [isStreaming, messages, t.thinking]);
  useEffect(() => {
    if (!happyBeat) return;
    const t = setTimeout(() => setHappyBeat(false), 1600);
    return () => clearTimeout(t);
  }, [happyBeat]);

  // When the panel opens on an empty chat the greeting text is already there,
  // so Remy "speaks" it: a brief mouth flap, then settle.
  useEffect(() => {
    if (!(open && messages.length === 0)) {
      setGreetingBeat(false);
      return;
    }
    setGreetingBeat(true);
    const t = setTimeout(() => setGreetingBeat(false), 2500);
    return () => clearTimeout(t);
  }, [open, messages.length]);

  /* Der Log läuft mit, solange der Nutzer unten steht. Ohne das blieb die
     Ansicht beim ersten Satz stehen und Remy schrieb unsichtbar weiter — man
     musste zu jeder Antwort selbst hinterherscrollen. Wer nach oben gescrollt
     hat, um etwas nachzulesen, wird nicht wieder heruntergerissen: erst wenn
     er sich wieder in die unteren 80px begibt, klebt die Ansicht erneut. */
  const stickRef = useRef(true);
  const onLogScroll = useCallback(() => {
    const el = logRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);
  useEffect(() => {
    const el = logRef.current;
    if (!el || !stickRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming, open]);

  // Move focus into the dialog when it opens (keyboard/screen-reader users),
  // and hand it back to whatever opened it on close.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    returnFocusRef.current = opener instanceof HTMLElement ? opener : null;
    // Das Feld, nicht die Hülle: wer Remy öffnet, will schreiben.
    stickRef.current = true;
    (inputRef.current ?? panelRef.current)?.focus();
    return () => {
      const back = returnFocusRef.current;
      returnFocusRef.current = null;
      if (back?.isConnected) back.focus();
    };
  }, [open]);

  /* Tab bleibt im Dialog. `aria-modal` sagt es dem Vorleser, hält aber keine
     Taste auf — ohne das lief Tab hinter den Vorhang in die Seite darunter. */
  const onPanelKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = [
      ...panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ),
    ].filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  // Lock background scroll while the panel is open so the page doesn't scroll
  // behind the chat. Desktop scrolls an inner `.app-pages` container; mobile
  // scrolls the document — lock both and restore on close.
  //
  // Dieselbe Stelle setzt die Marke am <html>, an der der Anlege-Knopf
  // erkennt, dass er gerade nichts zu suchen hat (RemyLauncher.module.css).
  useEffect(() => {
    if (!open) return;
    const ap = document.querySelector('.app-pages') as HTMLElement | null;
    const prevAp = ap?.style.overflow ?? '';
    const prevBody = document.body.style.overflow;
    if (ap) ap.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.documentElement.dataset.buddyOpen = '';
    return () => {
      if (ap) ap.style.overflow = prevAp;
      document.body.style.overflow = prevBody;
      delete document.documentElement.dataset.buddyOpen;
    };
  }, [open]);

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closePanel]);

  /* Wegtippen schließt — das macht der Vorhang selbst, siehe `onClick` am
     `.scrim` im Markup. Er liegt `fixed; inset: 0` über der ganzen Seite, der
     Klick landet also auf ihm und ist damit verbraucht.

     Vorher hing das an einem `pointerdown` auf `document`, ohne jede Sicherung.
     Damit war das Panel weg, bevor der Klick kam, und der traf, was darunter
     lag — auf jeder Seite, denn Remy ist überall. Ein `click` auf dem Vorhang
     erfüllt nebenbei auch den Grund, aus dem hier `pointerdown` stand: eine
     Wischgeste, die innen beginnt und außen endet, erzeugt gar keinen Klick
     auf dem Vorhang und schließt deshalb nicht. */

  // Stage chips / CTA hand-off: open the panel and (optionally) ask right away.
  // `send` self-guards against empty text and concurrent streams.
  useEffect(() => {
    const handleAsk = ({ question }: BuddyAskDetail) => {
      setOpen(true);
      if (question) void sendWithLocationIfNeeded(question);
    };
    const onAsk = (e: Event) => {
      // dispatchBuddyAsk queued this event before dispatching it. Once the
      // widget listener exists the event itself is authoritative, so clear the
      // buffered copy to avoid handling it twice.
      consumePendingBuddyAsk();
      handleAsk((e as CustomEvent<BuddyAskDetail>).detail ?? {});
    };
    window.addEventListener(BUDDY_ASK_EVENT, onAsk);
    const pendingAsk = consumePendingBuddyAsk();
    if (pendingAsk) handleAsk(pendingAsk);
    return () => window.removeEventListener(BUDDY_ASK_EVENT, onAsk);
  }, [sendWithLocationIfNeeded]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void sendWithLocationIfNeeded(draft);
  };

  const ask = (text: string) => {
    void sendWithLocationIfNeeded(text);
  };

  // "Near me": locate the user (with visible feedback), then ask. On failure we
  // tell the user what happened instead of silently searching city-wide.
  const askNearby = () => {
    if (isStreaming || locating) return;
    const q = locale === 'en' ? "What's good near me right now?" : 'Was Gutes in meiner Nähe?';
    void sendWithLocationIfNeeded(q);
  };

  const title = 'Remy';

  // Expression policy: the mouth flap only runs once answer text is actually
  // appearing, or when he "speaks" the already-visible greeting. Smile
  // (greeting) and laugh (happy) stay brief stills.
  const lastMsg = messages[messages.length - 1];
  const answerStarted = lastMsg?.role === 'assistant' && lastMsg.content.length > 0;
  const panelMood: BuddyMood = happyBeat
    ? 'happy'
    : isStreaming
      ? answerStarted
        ? 'talking'
        : 'idle'
      : greetingBeat
        ? 'talking'
        : 'idle';
  return (
    <>
      {open && (
        <>
          <div className={styles.scrim} onClick={closePanel} aria-hidden="true" />
          <div
            ref={panelRef}
            id="buddy-panel"
            className={styles.panel}
            data-buddy-panel="open"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            onKeyDown={onPanelKeyDown}
          >
            <div className={styles.header}>
              <span className={styles.avatarFrame}>
                <BuddyAvatar mood={panelMood} size={58} />
              </span>
              <span className={styles.headerTitle}>
                <strong>{title}</strong>
              </span>
              {/* Der Faden überlebt den Seitenwechsel (lib/buddy/thread.ts) —
                  also braucht es einen Weg, ihn beiseitezulegen. Erst sichtbar,
                  wenn etwas dasteht, das man wegräumen könnte. */}
              {messages.length > 0 && (
                <button
                  className={styles.reset}
                  type="button"
                  aria-label={t.resetAria}
                  title={t.resetAria}
                  onClick={reset}
                >
                  <span aria-hidden="true">{t.reset}</span>
                </button>
              )}
              <button
                className={styles.close}
                type="button"
                aria-label={t.close}
                onClick={closePanel}
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            {/* Kein `aria-live` auf dem ganzen Log: der Vorleser hätte bei
                jedem Token die komplette Unterhaltung neu vorgelesen. Die
                fertige Antwort steht einmal in der Statuszeile unter dem
                Formular. */}
            <div className={styles.log} ref={logRef} onScroll={onLogScroll}>
              {messages.length === 0 &&
                (() => {
                  // Time-of-day opener + starter chips (computed client-side; the
                  // intro only renders after the user opens the panel).
                  const intro = greetingFor(new Date().getHours(), locale);
                  return (
                    <div className={styles.intro}>
                      <div className={styles.msgBot}>
                        <FormattedText text={intro.greeting} />
                      </div>
                      <div className={styles.chips}>
                        <button
                          type="button"
                          className={styles.chipNear}
                          onClick={askNearby}
                          disabled={locating}
                          aria-busy={locating}
                        >
                          {locating
                            ? locale === 'en'
                              ? 'Locating…'
                              : 'Standort…'
                            : locale === 'en'
                              ? 'Near me'
                              : 'In meiner Nähe'}
                        </button>
                        {intro.suggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={styles.chip}
                            onClick={() => ask(s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
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
                      pageSlug={pageSlug}
                    />
                  </div>
                )
              )}
            </div>
            <form className={styles.form} onSubmit={onSubmit}>
              {/* Das Feld bleibt schreibbar, solange Remy antwortet — vorher
                  war es gesperrt, der Fokus sprang heraus und die nächste
                  Frage musste warten, bis er fertig war. */}
              <input
                ref={inputRef}
                className={styles.input}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t.placeholder}
                aria-label={t.placeholder}
              />
              {/* Derselbe Knopf ist der Abbruch, solange er schreibt. */}
              {isStreaming ? (
                <button
                  className={`${styles.send} ${styles.stop}`}
                  type="button"
                  onClick={stop}
                  aria-label={t.stop}
                >
                  <span aria-hidden="true">{t.stop}</span>
                </button>
              ) : (
                <button
                  className={styles.send}
                  type="submit"
                  disabled={!draft.trim()}
                  aria-label={t.send}
                >
                  <span aria-hidden="true">{t.send}</span>
                </button>
              )}
            </form>
            <p className={styles.srOnly} role="status">
              {srStatus}
            </p>
          </div>
        </>
      )}
    </>
  );
}
