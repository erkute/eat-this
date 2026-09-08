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
import { revealStep, prefersReducedMotion } from '@/lib/buddy/reveal';
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
  const [messages, setMessages] = useState<BuddyDisplayMessage[]>([]);
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

      /* Der Aufdecker. `raw` ist alles, was angekommen ist, `revealed` wie
         viel davon schon dasteht; ein rAF-Takt schiebt die Grenze gleichmäßig
         nach (lib/buddy/reveal.ts). `drained` hält das Ende des Sendens auf,
         bis der Puffer leer ist — sonst erschienen Folge-Chips, Pack-Karte und
         Sammelausgabe (alle an `!streaming` gebunden) über einem Text, der
         noch tippt. */
      const instant = prefersReducedMotion();
      let raw = '';
      let revealed = 0;
      let ended = false;
      let flush = false;
      let settle: () => void = () => {};
      const drained = new Promise<void>((resolve) => {
        settle = resolve;
      });
      const paint = () =>
        updateAssistant((m) => {
          m.content = sanitizeLinks(raw.slice(0, revealed), allowedSlugs.current);
        });
      const tick = () => {
        rafRef.current = 0;
        const step = revealStep(raw.length - revealed, instant || flush);
        if (step > 0) {
          revealed += step;
          paint();
        }
        if (ended && revealed >= raw.length) {
          settle();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      const nudge = () => {
        if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
      };
      const endReveal = () => {
        ended = true;
        if (rafRef.current) return; // der laufende Takt räumt selbst ab
        if (revealed >= raw.length) settle();
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
          raw =
            locale === 'en'
              ? 'Easy 😅 give me a moment and ask again.'
              : 'Sachte 😅 gib mir kurz und frag gleich nochmal.';
          revealed = raw.length;
          paint();
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
              raw =
                locale === 'en'
                  ? 'Sorry — something went wrong. Try again?'
                  : 'Sorry — da ist was schiefgelaufen. Nochmal?';
              revealed = raw.length;
              paint();
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
        raw =
          locale === 'en'
            ? 'Sorry — something went wrong. Try again?'
            : 'Sorry — da ist was schiefgelaufen. Nochmal?';
        revealed = raw.length;
        paint();
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        endReveal();
        await drained;
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, locale, pageSlug]
  );

  return { messages, isStreaming, send, stop, setGeo };
}
