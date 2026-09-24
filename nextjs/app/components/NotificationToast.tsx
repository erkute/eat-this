'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import type { Notice } from '@/lib/notice';

/**
 * Die eine Infoflaeche der App.
 *
 * Jede kleine Rueckmeldung laeuft hier durch; welche es gibt und was sie
 * sagen, steht in lib/notice.ts. Sie steht mittig und spricht dieselbe
 * Sprache wie der Anmelde-Layer (Styles in globals.css): Kicker, Versalien-
 * Titel, eine Zeile, gefuellte Knoepfe.
 *
 * Eine Regel fuer alle: traegt eine Meldung Knoepfe, wartet sie auf eine
 * Antwort und liegt als Layer ueber der Seite — ein Scrim faengt jeden Tipp
 * daneben ab und raeumt sie damit weg. Ohne Knoepfe ist sie eine kurze
 * Bestaetigung, geht von allein, und die Seite laeuft unter ihr weiter.
 */

const DEFAULT_DURATION_MS = 3000;

export default function NotificationToast() {
  const { lang } = useTranslation();
  const [notice, setNotice] = useState<Notice | null>(null);
  /* Ob die Karte steht. Ohne sie ist die Huelle display: none — nicht bloss
     unsichtbar (globals.css: iOS 26 behaelt die Leistenfarbe des letzten
     fixierten Containers, solange der noch einen Renderer hat). Ein Nachlauf
     fuers Ausfahren gibt es nicht: die Karte geht ohne Bewegung, wie
     Onboarding und Anmelde-Layer. */
  const [visible, setVisible] = useState(false);
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
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [present]);

  const dismiss = useCallback(() => {
    notice?.onDismiss?.();
    present(null);
  }, [notice, present]);

  const hasButtons = Boolean(notice && (notice.action || notice.onDismiss));
  const isLayer = visible && hasButtons;

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
     gerendert; die Karte selbst ist nur noch Bild. */
  const liveText =
    visible && notice
      ? [notice.eyebrow, notice.title, notice.detail, ...(notice.steps ?? [])]
          .filter(Boolean)
          .join('. ')
      : '';
  const dismissLabel = lang === 'en' ? 'Got it' : 'Alles klar';
  return (
    <>
      <div className="notification-live" aria-live="polite" aria-atomic="true">
        {liveText}
      </div>
      <div
        className={`notification-layer${visible ? ' show' : ''}`}
        data-open={visible ? '' : undefined}
        data-layer={isLayer ? '' : undefined}
      >
        {isLayer && (
          // Kein Knopf: die Karte traegt ihre Knoepfe selbst, der Scrim ist nur
          // die Flaeche, auf der ein Tipp NICHT in die Seite faellt.
          <div className="notification-scrim" onClick={dismiss} aria-hidden="true" />
        )}
        <div
          className={`notification${visible ? ' show' : ''}`}
          data-tone={notice?.tone}
          data-buttons={hasButtons ? '' : undefined}
        >
          <span className="notification-eyebrow">{notice?.eyebrow ?? ''}</span>
          <span className="notification-title">{notice?.title ?? ''}</span>
          {notice?.detail && <span className="notification-detail">{notice.detail}</span>}
          {notice?.steps && notice.steps.length > 0 && (
            <ol className="notification-steps">
              {notice.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}
          {/* Der gelbe Knopf steht immer rechts: mit einer Aktion ist sie es und
            „Alles klar" die leise Flaeche daneben; ohne Aktion ist „Alles klar"
            selbst der gelbe Knopf. */}
          {visible && notice && hasButtons && (
            <span className="notification-actions">
              {notice.action ? (
                <>
                  <button type="button" className="notification-quiet" onClick={dismiss}>
                    {dismissLabel}
                  </button>
                  <button
                    type="button"
                    className="notification-primary"
                    onClick={() => {
                      const run = notice.action?.onClick;
                      present(null);
                      run?.();
                    }}
                  >
                    {notice.action.label}
                  </button>
                </>
              ) : (
                <button type="button" className="notification-primary" onClick={dismiss}>
                  {dismissLabel}
                </button>
              )}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
