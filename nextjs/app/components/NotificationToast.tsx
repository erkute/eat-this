'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';

/**
 * Die eine Infoflaeche der App.
 *
 * Jede kleine Rueckmeldung laeuft hier durch — Spot gespeichert, Spot
 * entfernt, Standort nicht gefunden, angemeldet, freigeschaltet. Sie steht
 * mittig und im Zuschnitt des Onboarding-Panels (Styles in globals.css);
 * vorher lagen zwei getrennte Leisten am unteren Rand, und auf dem Handy
 * verschwanden beide unter dem Sheet.
 *
 * Zwei Eingaenge:
 *   window.showNotification(text)  — der kurze Weg fuer eine fertige Zeile.
 *     Der Text wird hier in Augenbraue/Titel/Detail uebersetzt
 *     (buildToastCopy), damit die Aufrufer nichts ueber die Karte wissen
 *     muessen.
 *   window.showNotice(notice)      — die volle Karte mit Aktion und
 *     Wegklicken, fuer Meldungen, auf die man antworten koennen muss (die
 *     Standort-Meldungen der Karte). `null` nimmt sie wieder weg.
 */

export type NoticeTone = 'success' | 'warning' | 'error' | 'info';
export type NoticeIcon = 'heart' | 'pin' | 'alert' | 'check' | 'spark';

export interface Notice {
  tone: NoticeTone;
  icon: NoticeIcon;
  eyebrow: string;
  title: string;
  detail?: string;
  /** Ein Knopf, der die Meldung beantwortet — z. B. „Nochmal" nach einem
   *  fehlgeschlagenen Standort. */
  action?: { label: string; onClick: () => void };
  /** Wegklicken. Nur gesetzt, wenn der Aufrufer wissen will, dass es passiert
   *  ist — sonst geht die Karte von allein. */
  onDismiss?: () => void;
  /** Millisekunden bis zum Selbstabgang; 0 laesst sie stehen. */
  duration?: number;
  /** Als Layer ueber der Seite: ein Scrim legt sich unter die Karte, faengt
   *  jeden Tipp daneben ab und raeumt sie damit weg. Fuer Meldungen, die eine
   *  laufende Handlung begleiten (die Standort-Abfrage) — ein Tipp auf die
   *  Karte oder daneben darf dann nichts in der Seite ausloesen. Die kurzen
   *  Bestaetigungen (Spot gespeichert) bleiben ohne: die Seite darf unter
   *  ihnen weiterlaufen. */
  layer?: boolean;
}

declare global {
  interface Window {
    showNotification?: (msg: string, duration?: number) => void;
    /**
     * Zeigt eine Karte. Der Rueckgabewert nimmt GENAU DIESE Karte wieder weg
     * und laesst eine inzwischen nachgerueckte in Ruhe — sonst raeumte der
     * Selbstabgang einer Standort-Meldung die Bestaetigung ab, die kurz
     * vorher an ihre Stelle getreten ist. `null` raeumt bedingungslos.
     */
    showNotice?: (notice: Notice | null) => (() => void) | void;
  }
}

const DEFAULT_DURATION_MS = 3000;
/* Laenger als der 340-ms-Uebergang der Karte (globals.css). */
const LAYER_RELEASE_MS = 400;

// sessionStorage handoff: a message stored under this key (e.g. by the
// profile logout button, whose sign-out triggers a hard navigation to '/')
// is toasted once on the next page load, then cleared.
export const TOAST_HANDOFF_KEY = 'eatthis_toast';

function buildToastCopy(message: string, lang: string): Notice {
  const text = message.trim();
  const lower = text.toLowerCase();
  const english = lang === 'en';

  if (lower.includes('standort') || lower.includes('location')) {
    if (
      lower.includes('block') ||
      lower.includes('zugriff') ||
      lower.includes('allow') ||
      lower.includes('browser')
    ) {
      return english
        ? {
            tone: 'warning',
            eyebrow: 'Location',
            title: 'Blocked',
            detail: 'Allow it in your browser, then tap again.',
            icon: 'pin',
          }
        : {
            tone: 'warning',
            eyebrow: 'Standort',
            title: 'Blockiert',
            detail: 'Im Browser erlauben, dann nochmal tippen.',
            icon: 'pin',
          };
    }
    return english
      ? {
          tone: 'warning',
          eyebrow: 'Location',
          title: 'Not found',
          detail: 'Try once more or choose a district manually.',
          icon: 'pin',
        }
      : {
          tone: 'warning',
          eyebrow: 'Standort',
          title: 'Nicht gefunden',
          detail: 'Nochmal versuchen oder Bezirk manuell wählen.',
          icon: 'pin',
        };
  }

  if (
    lower.includes('gespeichert') ||
    lower.includes('saved') ||
    lower.includes('geherzt') ||
    lower.includes('hearted')
  ) {
    return english
      ? {
          tone: 'success',
          eyebrow: 'Spot',
          title: 'Saved',
          detail: 'It is on your map — and in your profile.',
          icon: 'heart',
        }
      : {
          tone: 'success',
          eyebrow: 'Spot',
          title: 'Gespeichert',
          detail: 'Liegt jetzt auf deiner Map — und im Profil.',
          icon: 'heart',
        };
  }

  if (
    lower.includes('spot entfernt') ||
    lower.includes('spot removed') ||
    lower.includes('herz entfernt') ||
    lower.includes('heart removed')
  ) {
    return english
      ? {
          tone: 'info',
          eyebrow: 'Spot',
          title: 'Removed',
          icon: 'heart',
        }
      : {
          tone: 'info',
          eyebrow: 'Spot',
          title: 'Entfernt',
          icon: 'heart',
        };
  }

  if (lower.includes('schiefgelaufen') || lower.includes('wrong') || lower.includes('failed')) {
    return english
      ? {
          tone: 'error',
          eyebrow: 'Heads up',
          title: 'Something went wrong',
          detail: 'Please try again in a moment.',
          icon: 'alert',
        }
      : {
          tone: 'error',
          eyebrow: 'Kurz hakt es',
          title: 'Hat nicht geklappt',
          detail: 'Bitte gleich nochmal versuchen.',
          icon: 'alert',
        };
  }

  if (lower.includes('abgemeldet') || lower.includes('signed out')) {
    return english
      ? {
          tone: 'info',
          eyebrow: 'Login',
          title: 'Signed out',
          icon: 'check',
        }
      : {
          tone: 'info',
          eyebrow: 'Login',
          title: 'Abgemeldet',
          icon: 'check',
        };
  }

  if (lower.includes('angemeldet') || lower.includes('signed in')) {
    return english
      ? {
          tone: 'success',
          eyebrow: 'Login',
          title: "You're in",
          detail: 'Right where you left off.',
          icon: 'check',
        }
      : {
          tone: 'success',
          eyebrow: 'Login',
          title: 'Du bist drin',
          detail: 'Genau da, wo du aufgehört hast.',
          icon: 'check',
        };
  }

  if (lower.includes('freigeschaltet') || lower.includes('unlocked')) {
    return english
      ? {
          tone: 'success',
          eyebrow: 'Unlocked',
          title: 'New spots are ready',
          detail: text,
          icon: 'spark',
        }
      : {
          tone: 'success',
          eyebrow: 'Freigeschaltet',
          title: 'Neue Spots sind bereit',
          detail: text,
          icon: 'spark',
        };
  }

  return {
    tone: 'info',
    eyebrow: 'Eat This',
    title: text,
    icon: 'spark',
  };
}

function ToastIcon({ icon }: { icon: NoticeIcon }) {
  if (icon === 'heart') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.8 4.7a5.4 5.4 0 0 0-7.7 0L12 5.9l-1.1-1.2a5.4 5.4 0 0 0-7.7 7.7L12 21l8.8-8.6a5.4 5.4 0 0 0 0-7.7z" />
      </svg>
    );
  }
  if (icon === 'pin') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" />
        <circle cx="12" cy="10" r="2.4" />
      </svg>
    );
  }
  if (icon === 'alert') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 2.9 19h18.2L12 3z" />
        <path d="M12 8.2v5.1" />
        <path d="M12 17.3h.01" />
      </svg>
    );
  }
  if (icon === 'check') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <path d="m7.8 12.3 2.6 2.6 5.8-6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.8 14 9l6.2 2-6.2 2-2 6.2-2-6.2-6.2-2L10 9l2-6.2z" />
    </svg>
  );
}

export default function NotificationToast() {
  const { lang } = useTranslation();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [visible, setVisible] = useState(false);
  /* Ob die Huelle gerendert und fixiert ist. Sie wird es im selben Render wie
     `show` und bleibt es, bis das Ausfahren durch ist — erst dann geht sie auf
     display: none (globals.css: iOS 26 behaelt die Leistenfarbe des letzten
     fixierten Containers, solange der noch einen Renderer hat). */
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* Welche Meldung gerade DRAN ist — im Gegensatz zu `notice`, das seinen
     Inhalt ueber das Ausfahren hinaus behaelt (sonst faehrt eine leere Karte
     heraus). Daran haengt, ob ein spaeter Aufraeumer noch zustaendig ist. */
  const activeRef = useRef<Notice | null>(null);

  const present = useCallback((next: Notice | null): (() => void) | void => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    activeRef.current = next;
    if (!next) {
      setVisible(false);
      return;
    }
    setNotice(next);
    setOpen(true);
    setVisible(true);
    if (next.duration !== 0) {
      timerRef.current = setTimeout(() => {
        if (activeRef.current === next) activeRef.current = null;
        setVisible(false);
      }, next.duration ?? DEFAULT_DURATION_MS);
    }
    return () => {
      if (activeRef.current !== next) return;
      activeRef.current = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setVisible(false);
    };
  }, []);

  useEffect(() => {
    window.showNotice = present;
    window.showNotification = (message: string, duration = DEFAULT_DURATION_MS) =>
      present({ ...buildToastCopy(message, lang), duration });
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [present, lang]);

  // Pick up a handoff message left by the previous page (survives the hard
  // navigation). Small delay so the reveal plays after paint.
  useEffect(() => {
    let msg: string | null = null;
    try {
      msg = sessionStorage.getItem(TOAST_HANDOFF_KEY);
      if (msg) sessionStorage.removeItem(TOAST_HANDOFF_KEY);
    } catch {
      /* private mode */
    }
    if (!msg) return;
    const handoff = msg;
    const t = setTimeout(() => present({ ...buildToastCopy(handoff, lang), duration: 3500 }), 600);
    return () => clearTimeout(t);
  }, [present, lang]);

  const dismiss = useCallback(() => {
    notice?.onDismiss?.();
    present(null);
  }, [notice, present]);

  useEffect(() => {
    if (visible) return;
    const t = setTimeout(() => setOpen(false), LAYER_RELEASE_MS);
    return () => clearTimeout(t);
  }, [visible]);

  const isLayer = Boolean(visible && notice?.layer);

  /* Escape raeumt den Layer ab wie ein Tipp daneben. Nur den Layer: eine
     Bestaetigung ohne Scrim geht von allein und faengt keine Tasten ab. */
  useEffect(() => {
    if (!isLayer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isLayer, dismiss]);

  /* Die Huelle bleibt im Dokument, ist zugeklappt aber display: none (siehe
     globals.css). Deshalb liegt der aria-live-Bereich getrennt daneben, immer
     gerendert; die Karte selbst ist nur noch Bild.

     Die Vollbild-Huelle zentriert die Karte ueber das Grid statt ueber
     top/left 50 % plus translate — so haengt die Mitte an nichts ausser dem
     Viewport. Ohne `data-layer` laesst die Huelle jeden Tipp durch, nur die
     Karte selbst faengt ihn; mit Scrim schluckt sie alles daneben. */
  const liveText =
    visible && notice
      ? [notice.eyebrow, notice.title, notice.detail].filter(Boolean).join('. ')
      : '';
  return (
    <>
      <div className="notification-live" aria-live="polite" aria-atomic="true">
        {liveText}
      </div>
      <div
        className={`notification-layer${visible ? ' show' : ''}`}
        data-open={open ? '' : undefined}
        data-layer={isLayer ? '' : undefined}
      >
        {isLayer && (
          // Kein Knopf: die Karte traegt ihre Knoepfe selbst, der Scrim ist nur
          // die Flaeche, auf der ein Tipp NICHT in die Seite faellt.
          <div className="notification-scrim" onClick={dismiss} aria-hidden="true" />
        )}
        <div className={`notification${visible ? ' show' : ''}`} data-tone={notice?.tone ?? 'info'}>
          <span className="notification-mark">
            <ToastIcon icon={notice?.icon ?? 'spark'} />
          </span>
          <span className="notification-copy">
            <span className="notification-eyebrow">{notice?.eyebrow ?? ''}</span>
            <span className="notification-title">{notice?.title ?? ''}</span>
            {notice?.detail && <span className="notification-detail">{notice.detail}</span>}
          </span>
          {/* Nur solange die Karte offen ist: zugeklappt waeren die Knoepfe zwar
            unsichtbar, aber weiter antippbar per Tastatur — ein Fokus, der ins
            Nichts springt.
            Reihenfolge: erst „Alles klar", dann die Aktion — die Knoepfe sitzen
            rechtsbuendig, und der gelbe Primaerknopf gehoert ganz nach rechts. */}
          {visible && notice && (notice.action || notice.onDismiss) && (
            <span className="notification-actions">
              {notice.onDismiss && (
                <button type="button" className="notification-dismiss" onClick={dismiss}>
                  {lang === 'en' ? 'Got it' : 'Alles klar'}
                </button>
              )}
              {notice.action && (
                <button
                  type="button"
                  className="notification-action"
                  onClick={() => {
                    const run = notice.action?.onClick;
                    present(null);
                    run?.();
                  }}
                >
                  {notice.action.label}
                </button>
              )}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
