// nextjs/lib/buddy/thread.ts
// Der Gesprächsfaden über einen Seitenwechsel hinweg.
//
// Das Widget hängt am Layout und wird beim Navigieren neu gebaut — die
// Unterhaltung lag nur im React-State und war damit weg. Genau dann, wenn man
// einem seiner Tipps folgt: Tap auf eine Spot-Karte → /map → Faden gerissen,
// und die nächste Frage beginnt wieder bei „Hey, ich bin Remy".
//
// sessionStorage, nicht localStorage: der Faden gehört zu diesem Besuch, nicht
// zu diesem Gerät. Ein neuer Tab fängt neu an, das Schließen räumt auf.
import type { ChatMessage, SpotCandidate, ArticleResult, PackTeaser } from './types';

export interface StoredMessage extends ChatMessage {
  spots?: SpotCandidate[];
  articles?: ArticleResult[];
  pack?: PackTeaser;
}

export const THREAD_KEY = 'buddyThread';
const THREAD_VERSION = 1;

/** Mehr als das schickt die Route ohnehin nicht ans Modell (MAX_MESSAGES). */
export const MAX_STORED_MESSAGES = 20;

interface StoredThread {
  v: number;
  messages: StoredMessage[];
}

function isMessage(value: unknown): value is StoredMessage {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as Record<string, unknown>;
  return (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string';
}

/** Liest den Faden dieses Besuchs. Alles Unerwartete gilt als „kein Faden". */
export function loadThread(): StoredMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(THREAD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredThread;
    if (parsed?.v !== THREAD_VERSION || !Array.isArray(parsed.messages)) return [];
    return parsed.messages.filter(isMessage).slice(-MAX_STORED_MESSAGES);
  } catch {
    // Privates Fenster, gesperrter Speicher, halbe Zeile — der Chat läuft auch
    // ohne Gedächtnis weiter.
    return [];
  }
}

export function saveThread(messages: StoredMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    if (messages.length === 0) {
      window.sessionStorage.removeItem(THREAD_KEY);
      return;
    }
    const payload: StoredThread = {
      v: THREAD_VERSION,
      messages: messages.slice(-MAX_STORED_MESSAGES),
    };
    window.sessionStorage.setItem(THREAD_KEY, JSON.stringify(payload));
  } catch {
    // Voll oder gesperrt: dann eben ohne Gedächtnis, aber nie mit Absturz.
  }
}

export function clearThread(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(THREAD_KEY);
  } catch {
    /* s.o. */
  }
}
