'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import type {
  BuddyStreamEvent,
  ChatMessage,
  SpotCandidate,
  ArticleResult,
  PackTeaser,
  Locale,
} from '@/lib/buddy/types';
import { sanitizeLinks } from '@/lib/buddy/stream';
import {
  revealStep,
  newRevealPace,
  skipMarker,
  snapToWord,
  closeOpenEmphasis,
  prefersReducedMotion,
  FRAME_MS,
} from '@/lib/buddy/reveal';
import { loadThread, saveThread, clearThread } from '@/lib/buddy/thread';
import { auth } from '@/lib/firebase/config';

export function parseNdjsonLines(buffer: string, onEvent: (e: BuddyStreamEvent) => void): string {
  const parts = buffer.split('\n');
  const remainder = parts.pop() ?? '';
  for (const line of parts) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      onEvent(JSON.parse(trimmed) as BuddyStreamEvent);
    } catch {
      // ignore malformed line
    }
  }
  return remainder;
}

/**
 * Was Remy sagt, wenn /api/buddy ablehnt (429). Seit 23.09.2026 gibt es
 * Tagesgrenzen (10 pro Person, 50 für alle) — „frag gleich nochmal" wäre dort
 * gelogen, also je Grund ein eigener Satz.
 */
export function limitNotice(reason: string | undefined, locale: Locale): string {
  const en = locale === 'en';
  if (reason === 'global') {
    return en
      ? "I'm all booked up for today 😅 Back tomorrow."
      : 'Ich bin für heute ausgebucht 😅 Morgen bin ich wieder da.';
  }
  if (reason === 'per_day') {
    return en
      ? "That's enough from me for today 😅 Ask me again tomorrow."
      : 'Für heute hab ich dir genug erzählt 😅 Frag mich morgen wieder.';
  }
  return en
    ? 'Easy 😅 give me a moment and ask again.'
    : 'Sachte 😅 gib mir kurz und frag gleich nochmal.';
}

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  const KEY = 'buddySessionId';
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}

export interface BuddyDisplayMessage extends ChatMessage {
  spots?: SpotCandidate[];
  articles?: ArticleResult[];
  pack?: PackTeaser;
}

export interface BuddyChatOptions {
  /** Wire form of the page context: only the slug travels — the server
   *  resolves the display name itself (see /api/buddy resolvePageContext). */
  pageSlug?: string;
}

export function useBuddyChat(options: BuddyChatOptions = {}) {
  const { pageSlug } = options;
  const locale = useLocale() as Locale;
  /* Der Faden dieses Besuchs, aus dem sessionStorage. Der Lazy-Initializer
     ist hier sicher: das Widget kommt über `dynamic(..., { ssr: false })`,
     rendert also nie auf dem Server — es gibt kein Markup, zu dem das
     abweichen könnte. */
  const [messages, setMessages] = useState<BuddyDisplayMessage[]>(loadThread);
  const [isStreaming, setIsStreaming] = useState(false);
  const allowedSlugs = useRef<Set<string>>(new Set());
  // User location (once granted) — sent with each request so spots can be
  // distance-sorted. Held in a ref so it doesn't re-create `send`.
  const geoRef = useRef<{ lat: number; lng: number } | null>(null);
  const setGeo = useCallback((g: { lat: number; lng: number } | null) => {
    geoRef.current = g;
  }, []);

  /* Abbruch der laufenden Antwort. Remy schreibt bis zu 2048 Token; wer nach
     dem zweiten Satz merkt, dass er die falsche Frage gestellt hat, musste
     vorher zusehen. Der Abbruch beendet den Lesestrom, das bereits Gesagte
     bleibt stehen — die Route bricht ihrerseits den Anthropic-Stream ab
     (cancel() im ReadableStream), es laeuft also nichts weiter. */
  const abortRef = useRef<AbortController | null>(null);
  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  /* Faden sichern — aber NICHT während des Streams: der Aufdeck-Takt ändert
     `messages` sechzigmal pro Sekunde, das wäre sechzigmal JSON.stringify über
     die ganze Unterhaltung pro Sekunde. Am Ende jeder Antwort reicht; bricht
     der Tab vorher weg, fehlt genau die eine halbe Antwort. */
  useEffect(() => {
    if (isStreaming) return;
    saveThread(messages);
  }, [messages, isStreaming]);

  /** Neu anfangen — Faden im Speicher und auf dem Schirm weg. */
  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    allowedSlugs.current = new Set();
    clearThread();
    setMessages([]);
  }, []);

  // Laufender Aufdeck-Takt (siehe lib/buddy/reveal.ts). Beim Abräumen des
  // Widgets abbestellen, damit kein Bild mehr in eine tote Komponente malt.
  const rafRef = useRef(0);
  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const history: BuddyDisplayMessage[] = [...messages, { role: 'user', content: trimmed }];
      setMessages([...history, { role: 'assistant', content: '' }]);
      setIsStreaming(true);
      allowedSlugs.current = new Set();

      const updateAssistant = (mut: (m: BuddyDisplayMessage) => void) =>
        setMessages((prev) => {
          const next = [...prev];
          const last = { ...next[next.length - 1] };
          mut(last);
          next[next.length - 1] = last;
          return next;
        });

      const controller = new AbortController();
      abortRef.current = controller;

      /* Der Aufdecker. `raw` ist alles, was angekommen ist, `revealed` die
         Grenze, die ein rAF-Takt gleichmäßig nachschiebt (lib/buddy/reveal.ts),
         `shown` wie viel davon wirklich dasteht: die Grenze, auf das letzte
         ganze Wort zurückgezogen. Marker kosten keine Tippzeit — die Grenze
         springt über sie hinweg. `drained` hält das Ende des Sendens auf,
         bis der Puffer leer ist — sonst erschienen Folge-Chips, Pack-Karte und
         Sammelausgabe (alle an `!streaming` gebunden) über einem Text, der
         noch tippt. */
      const instant = prefersReducedMotion();
      let raw = '';
      let revealed = 0;
      let shown = 0;
      let ended = false;
      let flush = false;
      let settle: () => void = () => {};
      const drained = new Promise<void>((resolve) => {
        settle = resolve;
      });
      const paint = () =>
        updateAssistant((m) => {
          const visible = raw.slice(0, shown);
          // Am Ziel steht der Text, wie er kam; unterwegs wird eine offene
          // Hervorhebung geschlossen, damit keine Sternchen roh dastehen.
          m.content = sanitizeLinks(
            shown < raw.length ? closeOpenEmphasis(visible) : visible,
            allowedSlugs.current
          );
        });
      /** Für alles, was nicht getippt wird: Hinweis, Fehler. */
      const showAll = (text: string) => {
        raw = text;
        revealed = shown = raw.length;
        paint();
      };
      /* `lastTs` ist die Uhr des Takts. Der Schritt hängt an der verstrichenen
         Zeit (lib/buddy/reveal.ts), damit ein Gerät mit 20 fps genauso schnell
         aufdeckt wie eines mit 60. Beim (Neu-)Start des Takts steht sie auf 0
         und der erste Schritt zählt als ein Bild — sonst würde nach einer
         Pause zwischen zwei Schüben der ganze neue Schub auf einmal erscheinen,
         weil „seit dem letzten Takt" dann Sekunden wären. */
      let lastTs = 0;
      const pace = newRevealPace();
      const tick = (ts: number) => {
        rafRef.current = 0;
        const dt = lastTs > 0 ? ts - lastTs : FRAME_MS;
        lastTs = ts;
        const step = revealStep(
          raw.length - revealed,
          dt,
          pace,
          instant || flush ? 'instant' : ended ? 'ended' : 'flow'
        );
        // `|| ended`: das letzte Wort galt bis eben als unfertig — ist der
        // Strom zu, kommt es auch ohne neuen Schritt noch auf den Schirm.
        if (step > 0 || ended) {
          revealed = skipMarker(raw, revealed + step, ended);
          const next = Math.max(shown, snapToWord(raw, revealed, ended));
          // Nur malen, wenn ein Wort dazukam — nicht bei jedem Zeichen.
          if (next !== shown) {
            shown = next;
            paint();
          }
        }
        if (ended && shown >= raw.length) {
          settle();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      const nudge = () => {
        if (rafRef.current) return;
        lastTs = 0;
        rafRef.current = requestAnimationFrame(tick);
      };
      const endReveal = () => {
        ended = true;
        if (rafRef.current) return; // der laufende Takt räumt selbst ab
        if (shown >= raw.length) settle();
        else nudge();
      };

      try {
        /* Das Token sagt der Route, was dieses Konto schon hat — sie schickt
           dann kein Pack, das ihm offensteht. Ohne Konto fragt ein Gast. */
        const headers: Record<string, string> = { 'content-type': 'application/json' };
        if (auth.currentUser) {
          headers.authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
        }
        const res = await fetch('/api/buddy', {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            sessionId: getSessionId(),
            locale,
            geo: geoRef.current ?? undefined,
            page: pageSlug ? { type: 'restaurant', slug: pageSlug } : undefined,
            messages: history.map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        if (res.status === 429) {
          // Ein Hinweis, kein Vortrag: der steht sofort da, nicht getippt.
          const body = (await res.json().catch(() => null)) as { reason?: string } | null;
          showAll(limitNotice(body?.reason, locale));
          return;
        }
        if (!res.ok || !res.body) throw new Error('request_failed');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          buffer = parseNdjsonLines(buffer, (e) => {
            if (e.type === 'text') {
              // Nur in den Puffer — auf den Schirm kommt es der Takt.
              raw += e.value;
              nudge();
            } else if (e.type === 'spots') {
              for (const s of e.value) allowedSlugs.current.add(s.slug);
              updateAssistant((m) => {
                m.spots = e.value;
              });
              // Der Wächter kennt jetzt mehr Slugs: das schon Sichtbare neu
              // durchlassen, sonst bliebe ein eben entschärfter Link Text.
              paint();
            } else if (e.type === 'articles') {
              updateAssistant((m) => {
                m.articles = e.value;
              });
            } else if (e.type === 'pack') {
              updateAssistant((m) => {
                m.pack = e.value;
              });
            } else if (e.type === 'error') {
              showAll(
                locale === 'en'
                  ? 'Sorry — something went wrong. Try again?'
                  : 'Sorry — da ist was schiefgelaufen. Nochmal?'
              );
            }
          });
        }
      } catch (error) {
        // Ein Abbruch ist kein Fehler: das bereits Gesagte bleibt stehen,
        // ohne die Entschuldigung darüber zu schreiben. Was schon im Puffer
        // liegt, kommt beim Abbruch sofort — nicht noch zwei Sekunden getippt.
        if ((error as Error)?.name === 'AbortError') {
          flush = true;
          return;
        }
        showAll(
          locale === 'en'
            ? 'Sorry — something went wrong. Try again?'
            : 'Sorry — da ist was schiefgelaufen. Nochmal?'
        );
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        endReveal();
        await drained;
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, locale, pageSlug]
  );

  return { messages, isStreaming, send, stop, reset, setGeo };
}
