'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import BuddyAvatar, { type BuddyMood } from './BuddyAvatar';
import RemyDesktop from './RemyDesktop';
import RemyStartMenu from './RemyStartMenu';
import { BotMessage, FormattedText, SPOT_IMG_SIZES, spotSrcSet } from './BuddyMessages';
import { useBuddyChat } from './useBuddyChat';
import { extractFollowups } from '@/lib/buddy/stream';
import { stickStep, prefersReducedMotion, FRAME_MS } from '@/lib/buddy/reveal';
import { greetingFor } from '@/lib/buddy/greeting';
import { animatePortraitHandoff } from '@/lib/buddy/portraitMotion';
import { isNearbyIntent } from '@/lib/buddy/nearbyIntent';
import {
  BUDDY_ASK_EVENT,
  consumePendingBuddyAsk,
  type BuddyAskDetail,
} from '@/lib/buddy/homeStage';
import { useAuth } from '@/lib/auth';
import { useDialogViewport } from '@/lib/useDialogViewport';
import { useFavorites } from '@/lib/map/useFavorites';
import { useUserLocationContext } from '@/lib/map/UserLocationContext';
import { notify } from '@/lib/notice';
import { PinIcon } from '@/app/components/map/icons';
import type { Locale, SpotCandidate } from '@/lib/buddy/types';
import styles from './BuddyWidget.module.css';

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
    geoOff: 'Standort teilen — dann sortiert Remy nach Entfernung',
    geoOn: 'Remy kennt deinen Standort',
    geoBusy: 'Standort wird ermittelt …',
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
    geoOff: 'Share your location — then Remy sorts by distance',
    geoOn: 'Remy knows where you are',
    geoBusy: 'Getting your location …',
    answered: 'Remy has answered.',
  },
} satisfies Record<Locale, Record<string, string>>;

export default function BuddyWidget() {
  const locale = useLocale() as Locale;
  const t = T[locale];
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [compactKeyboard, setCompactKeyboard] = useState(false);
  useEffect(() => {
    const update = () => setCompactKeyboard(typeof window.matchMedia === 'function'
      && window.matchMedia('(pointer: coarse) and (orientation: landscape) and (max-height: 500px)').matches);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  // Capture the old position before React removes the greeting portrait.
  // Only the newly mounted header portrait moves; there is never a duplicate.
  const previousPortrait = useRef<{ rect: DOMRect; position: string | undefined } | null>(null);
  // React Strict Mode reattaches the same ref after a cleanup. Keep its
  // original source so the replacement GSAP timeline can restart correctly.
  const portraitOrigins = useRef(new WeakMap<HTMLElement, DOMRect>());
  const placePortrait = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const previous = previousPortrait.current;
    const origin = previous?.position === 'intro'
      ? previous.rect
      : portraitOrigins.current.get(node);
    if (node.dataset.buddyAvatar === 'header' && origin) portraitOrigins.current.set(node, origin);
    const stopMotion = node.dataset.buddyAvatar === 'header' && origin
      ? animatePortraitHandoff(node, origin)
      : undefined;
    return () => {
      previousPortrait.current = {
        rect: node.getBoundingClientRect(),
        position: node.dataset.buddyAvatar,
      };
      stopMotion?.();
    };
  }, []);
  useEffect(() => {
    if (!open) previousPortrait.current = null;
  }, [open]);
  const { messages, isStreaming, send, stop, reset, setGeo } = useBuddyChat();
  /* Die zuletzt gestellte Frage — aber nur eine aus dieser Sitzung: was beim
     Laden schon im Faden stand, wird nicht verankert (siehe das Scrollen
     unten). `null` heißt: nichts zu verankern. */
  const [restoredCount, setRestoredCount] = useState(() => messages.length);
  const startOver = useCallback(() => {
    setRestoredCount(0);
    reset();
  }, [reset]);
  let anchorIdx: number | null = null;
  for (let i = messages.length - 1; i >= restoredCount; i--) {
    if (messages[i].role === 'user') {
      anchorIdx = i;
      break;
    }
  }
  /* Fotos der Kandidaten vorladen, sobald sie eintreffen — das ist Sekunden,
     bevor Remy den ersten Spot nennt. Gleiches `srcset`/`sizes` wie die Karte,
     der Browser wählt also dieselbe Datei, und die Karte erscheint mit Foto. */
  const lastSpots = messages[messages.length - 1]?.spots;
  useEffect(() => {
    for (const s of (lastSpots ?? []).slice(0, 6)) {
      if (!s.image) continue;
      const im = new Image();
      im.sizes = SPOT_IMG_SIZES;
      im.srcset = spotSrcSet(s.image) ?? '';
      im.src = s.image;
    }
  }, [lastSpots]);
  const { location, loading: locating, request: requestLocation } = useUserLocationContext();
  const panelRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const logContentRef = useRef<HTMLDivElement>(null);
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
    notify('remyLocation', locale);
  }, [locale]);

  const sendWithLocationIfNeeded = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming || locating) return;

      if (isNearbyIntent(trimmed) && !location) {
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
    [isStreaming, locating, location, notifyLocationFailure, requestLocation, send, setGeo]
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

  /* Die Frage nach oben, die Antwort darunter, und dann steht die Ansicht.

     Der Log fährt dem Text nicht hinterher: Remy schreibt schneller, als man
     liest, und am Ende stünde man weit unter der ersten Empfehlung. Stehen
     bleiben darf die Ansicht auch nicht, sonst schriebe Remy unsichtbar unter
     der Kante. Deshalb gleitet die eben gestellte Frage an den oberen Rand
     (`stickStep`), danach scrollt nur der Leser. Damit das auch bei einer
     kurzen Antwort geht, hält die Antwort eine Mindesthöhe
     (`--buddy-anchor-min`). Beim Öffnen steht ein wiedergefundener Faden am
     Ende. */
  const lastTopRef = useRef(0);
  const glideRef = useRef(0);
  const userScrolledRef = useRef(false);
  const goToQuestionRef = useRef<(() => void) | null>(null);
  const onLogScroll = useCallback(() => {
    const el = logRef.current;
    if (!el) return;
    // Wer während des Gleitens selbst hochscrollt, behält das Steuer.
    if (el.scrollTop < lastTopRef.current - 2) userScrolledRef.current = true;
    lastTopRef.current = el.scrollTop;
  }, []);
  useEffect(() => {
    if (!open) return;
    const el = logRef.current;
    const content = logContentRef.current;
    if (!el || !content) return;
    const question = () => content.querySelector<HTMLElement>('[data-buddy-anchor]');
    const padding = () => {
      const cs = getComputedStyle(el);
      return { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 };
    };
    const measure = () => {
      const q = question();
      const pad = padding();
      const gap = parseFloat(getComputedStyle(content).rowGap) || 0;
      const room = q ? el.clientHeight - pad.top - pad.bottom - q.offsetHeight - gap : 0;
      content.style.setProperty('--buddy-anchor-min', `${Math.max(0, Math.floor(room))}px`);
    };
    const goal = () => {
      const q = question();
      const max = el.scrollHeight - el.clientHeight;
      if (!q) return content.querySelector('[data-buddy-intro]') ? 0 : max;
      const top = el.scrollTop + q.getBoundingClientRect().top - el.getBoundingClientRect().top;
      return Math.max(0, Math.min(max, top - padding().top));
    };
    let last = 0;
    let velocity = 0;
    let pos = 0;
    const tick = (ts: number) => {
      glideRef.current = 0;
      if (userScrolledRef.current) return;
      const dt = last > 0 ? ts - last : FRAME_MS;
      last = ts;
      const distance = goal() - pos;
      if (distance <= 0.5) return;
      const step = stickStep(velocity, distance, dt);
      velocity = step.velocity;
      pos += step.move;
      el.scrollTop = pos;
      lastTopRef.current = el.scrollTop;
      glideRef.current = requestAnimationFrame(tick);
    };
    goToQuestionRef.current = () => {
      measure();
      userScrolledRef.current = false;
      if (prefersReducedMotion()) {
        el.scrollTop = goal();
        lastTopRef.current = el.scrollTop;
        return;
      }
      if (glideRef.current) return;
      last = 0;
      velocity = 0;
      pos = el.scrollTop;
      glideRef.current = requestAnimationFrame(tick);
    };
    // A new conversation starts at its greeting; a restored thread at its end.
    measure();
    el.scrollTop = content.querySelector('[data-buddy-intro]') ? 0 : el.scrollHeight;
    lastTopRef.current = el.scrollTop;
    // Die Mindesthöhe hängt an der Fensterhöhe — Tastatur des Telefons, Drehen.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(el);
    return () => {
      observer?.disconnect();
      goToQuestionRef.current = null;
      if (glideRef.current) cancelAnimationFrame(glideRef.current);
      glideRef.current = 0;
    };
  }, [open]);
  // Eine neue Frage in dieser Sitzung: an den oberen Rand mit ihr.
  useEffect(() => {
    if (anchorIdx !== null) goToQuestionRef.current?.();
  }, [anchorIdx]);

  // Move focus into the dialog when it opens (keyboard/screen-reader users),
  // and hand it back to whatever opened it on close.
  useEffect(() => {
    if (!open) return;
    /* Auf Touch-Geräten holt ein Fokus im Feld sofort die Tastatur; sie führe
       schon beim Tipp auf den Remy-Knopf aus und deckte den halben Chat. Dort
       bekommt die Hülle den Fokus (Vorleser und Tab landen trotzdem im Dialog),
       die Tastatur kommt erst mit dem Tipp ins Feld. Mit Maus: das Feld, denn
       wer Remy öffnet, will schreiben. */
    const touch =
      typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const opener = document.activeElement;
    // Zurück in ein Textfeld (die Frage kam aus der Remy-Bühne) hieße auf dem
    // Telefon: Tastatur beim Schließen. Dann lieber nirgendwohin.
    const backToText =
      touch && (opener instanceof HTMLInputElement || opener instanceof HTMLTextAreaElement);
    returnFocusRef.current = opener instanceof HTMLElement && !backToText ? opener : null;
    if (touch) panelRef.current?.focus({ preventScroll: true });
    else (inputRef.current ?? panelRef.current)?.focus();
    return () => {
      const back = returnFocusRef.current;
      returnFocusRef.current = null;
      if (back?.isConnected) back.focus({ preventScroll: true });
    };
  }, [open]);

  /* Tab bleibt im Dialog. `aria-modal` sagt es dem Vorleser, hält aber keine
     Taste auf — ohne das lief Tab hinter den Vorhang in die Seite darunter. */
  const onPanelKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const panel = dialogRef.current ?? panelRef.current;
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
  // Dieselbe Stelle setzt `data-buddy-open` am <html>; daran räumen
  // globals.css und das Login-Modal am Telefon den Hintergrund weg.
  useEffect(() => {
    if (!open) return;
    const ap = document.querySelector('.app-pages') as HTMLElement | null;
    const prevAp = ap?.style.overflow ?? '';
    const prevBody = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const pageY = window.scrollY;
    if (ap) ap.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${pageY}px`;
    document.body.style.width = '100%';
    document.documentElement.dataset.buddyOpen = '';
    return () => {
      if (ap) ap.style.overflow = prevAp;
      document.body.style.overflow = prevBody;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.scrollTo({ top: pageY, behavior: 'instant' });
      delete document.documentElement.dataset.buddyOpen;
    };
  }, [open]);

  useDialogViewport(dialogRef, open);

  // Keep a conversation at its end while the keyboard resizes the log.
  useEffect(() => {
    const log = logRef.current;
    if (!open || !log || !window.visualViewport) return;
    let atEnd = log.scrollHeight - log.clientHeight - log.scrollTop < 4;
    const remember = () => { atEnd = log.scrollHeight - log.clientHeight - log.scrollTop < 4; };
    const observer = new ResizeObserver(() => {
      if (atEnd) log.scrollTop = log.scrollHeight;
    });
    observer.observe(log);
    log.addEventListener('scroll', remember);
    return () => { observer.disconnect(); log.removeEventListener('scroll', remember); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closePanel]);

  /* Wegtippen schließt über `onClick` am `.scrim` (fixed, inset 0), nicht über
     `pointerdown` auf `document`: sonst wäre das Panel weg, bevor der Klick
     kommt, und der träfe, was darunter liegt. Eine Wischgeste, die innen
     beginnt und außen endet, erzeugt keinen Klick auf dem Vorhang. */

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

  /* Standort aus der Eingabezeile heraus freigeben. Stünde „In meiner Nähe" nur
     im leeren Chat, käme man ab der ersten Frage nicht mehr an die Freigabe
     heran, und wer sie nicht erteilt hat, bekäme stillschweigend stadtweite
     Antworten, ohne zu sehen, woran es liegt. */
  const toggleGeo = useCallback(async () => {
    if (location || locating) return;
    const loc = await requestLocation();
    if (!loc) {
      notifyLocationFailure();
      return;
    }
    setGeo(loc);
  }, [location, locating, requestLocation, notifyLocationFailure, setGeo]);

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
        <div className={styles.session} ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} onKeyDown={onPanelKeyDown}>
          <div className={styles.scrim} onClick={closePanel} aria-hidden="true" />
          <div className={styles.screen}>
            <div className={styles.desktopBackdrop} aria-hidden="true"><RemyDesktop en={locale === 'en'} /></div>
          <div
            ref={panelRef}
            id="buddy-panel"
            className={styles.panel}
            data-buddy-panel="open"
            tabIndex={-1}
          >
            <div className={styles.header}>
              {messages.length > 0 && (
                <div className={styles.avatarFrame} ref={placePortrait} data-buddy-avatar="header" aria-hidden="true">
                  <BuddyAvatar mood={panelMood} size={24} breathe={false} />
                </div>
              )}
              <span className={styles.headerTitle}>
                <strong>{locale === 'en' ? 'Ask Remy' : 'Frag Remy'}</strong>
              </span>
              <button
                className={styles.close}
                type="button"
                aria-label={t.close}
                onClick={closePanel}
              >
                <svg viewBox="0 0 12 12" aria-hidden="true" shapeRendering="crispEdges">
                  <path fill="currentColor" d="M1 1h2v1h1v1h1v1h2V3h1V2h1V1h2v2h-1v1H9v1H8v2h1v1h1v1h1v2H9v-1H8V9H7V8H5v1H4v1H3v1H1V9h1V8h1V7h1V5H3V4H2V3H1z" />
                </svg>
              </button>
            </div>
            {/* Kein `aria-live` auf dem ganzen Log: der Vorleser hätte bei
                jedem Token die komplette Unterhaltung neu vorgelesen. Die
                fertige Antwort steht einmal in der Statuszeile unter dem
                Formular. */}
            <div className={styles.conversation}>
              <div className={styles.log} ref={logRef} onScroll={onLogScroll}>
                <div className={styles.logContent} ref={logContentRef}>
                  {messages.length === 0 &&
                    (() => {
                      // Time-of-day opener + starter chips (computed client-side; the
                      // intro only renders after the user opens the panel).
                      const intro = greetingFor(new Date().getHours(), locale);
                      return (
                        <div className={styles.intro} data-buddy-intro="">
                          <h2 className={styles.introTitle}>
                            {locale === 'en' ? 'What are you craving?' : 'Worauf hast du Lust?'}
                          </h2>
                          <div className={styles.introGreeting}>
                            <FormattedText text={intro.greeting} />
                          </div>
                          <div className={styles.introSuggestions}>
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
                      <div
                        key={i}
                        className={styles.msgUser}
                        data-buddy-anchor={i === anchorIdx ? '' : undefined}
                      >
                        {m.content}
                      </div>
                    ) : (
                      <div
                        key={i}
                        className={
                          anchorIdx !== null && i === anchorIdx + 1
                            ? `${styles.msgBot} ${styles.msgBotAnchored}`
                            : styles.msgBot
                        }
                      >
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
                    )
                  )}
                </div>
              </div>
              {messages.length === 0 && (
                <div className={styles.portraitRail}>
                  <div className={styles.introPortrait} aria-hidden="true">
                    <div className={styles.introFigure} ref={placePortrait} data-buddy-avatar="intro">
                      <BuddyAvatar mood={panelMood} size={300} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <form className={styles.form} onSubmit={onSubmit}>
              {/* The pin stays available throughout the conversation. Its
                  active state confirms that location has been shared. */}
              <button
                type="button"
                className={styles.geo}
                data-on={location ? 'true' : 'false'}
                aria-pressed={!!location}
                disabled={!!location || locating}
                aria-busy={locating}
                aria-label={locating ? t.geoBusy : location ? t.geoOn : t.geoOff}
                title={locating ? t.geoBusy : location ? t.geoOn : t.geoOff}
                onClick={() => void toggleGeo()}
              >
                <PinIcon />
              </button>
              {messages.length > 0 && (
                <button className={styles.reset} type="button" aria-label={t.resetAria}
                  title={t.resetAria} onClick={startOver}>
                  <span aria-hidden="true">{t.reset}</span>
                </button>
              )}
              {/* Das Feld bleibt schreibbar, solange Remy antwortet: Die
                  nächste Frage muss nicht warten, bis er fertig ist. */}
              <input
                ref={inputRef}
                className={styles.input}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t.placeholder}
                aria-label={t.placeholder}
                // Safari's prediction row can leave only 13px above the
                // landscape keyboard and tab bar. Keep this editor usable.
                autoCorrect={compactKeyboard ? 'off' : undefined}
                autoComplete="off"
                autoCapitalize={compactKeyboard ? 'none' : undefined}
                spellCheck={compactKeyboard ? false : undefined}
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
            <div className={styles.statusBar}>
              <span className={styles.statusLight} aria-hidden="true" />
              <span>{isStreaming ? t.thinking : locating ? t.geoBusy : locale === 'en' ? 'Remy is here for you.' : 'Remy ist für dich da.'}</span>
            </div>
            <p className={styles.srOnly} role="status">
              {srStatus}
            </p>
          </div>
            <RemyStartMenu en={locale === 'en'} onLeave={closePanel} onChat={() => inputRef.current?.focus()} />
          </div>
        </div>
      )}
    </>
  );
}
