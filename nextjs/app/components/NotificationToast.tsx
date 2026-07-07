'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';

declare global {
  interface Window {
    showNotification?: (msg: string, duration?: number) => void;
  }
}

type ToastTone = 'success' | 'warning' | 'error' | 'info';

interface ToastCopy {
  tone: ToastTone;
  eyebrow: string;
  title: string;
  detail?: string;
  icon: 'heart' | 'pin' | 'alert' | 'check' | 'spark';
  variant?: 'signed-out';
}

// sessionStorage handoff: a message stored under this key (e.g. by the
// profile logout button, whose sign-out triggers a hard navigation to '/')
// is toasted once on the next page load, then cleared.
export const TOAST_HANDOFF_KEY = 'eatthis_toast';

function buildToastCopy(message: string, lang: string): ToastCopy {
  const text = message.trim();
  const lower = text.toLowerCase();
  const english = lang === 'en';

  if (lower.includes('standort') || lower.includes('location')) {
    if (lower.includes('block') || lower.includes('zugriff') || lower.includes('allow') || lower.includes('browser')) {
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

  if (lower.includes('geherzt') || lower.includes('hearted')) {
    return english
      ? {
          tone: 'success',
          eyebrow: 'Saved',
          title: 'Spot is on your list',
          detail: 'Ready for the next hunger.',
          icon: 'heart',
        }
      : {
          tone: 'success',
          eyebrow: 'Gespeichert',
          title: 'Spot ist auf deiner Liste',
          detail: 'Bereit für den nächsten Hunger.',
          icon: 'heart',
        };
  }

  if (lower.includes('herz entfernt') || lower.includes('heart removed')) {
    return english
      ? {
          tone: 'info',
          eyebrow: 'Updated',
          title: 'Heart removed',
          detail: 'The spot is out of your saved list.',
          icon: 'heart',
        }
      : {
          tone: 'info',
          eyebrow: 'Aktualisiert',
          title: 'Herz entfernt',
          detail: 'Der Spot ist raus aus deiner Liste.',
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
          eyebrow: 'Session ended',
          title: "You're signed out",
          detail: 'Your map is safe for next time.',
          icon: 'check',
          variant: 'signed-out',
        }
      : {
          tone: 'info',
          eyebrow: 'Session beendet',
          title: 'Du bist abgemeldet',
          detail: 'Deine Map wartet beim nächsten Mal.',
          icon: 'check',
          variant: 'signed-out',
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
    eyebrow: english ? 'Eat This' : 'Eat This',
    title: text,
    icon: 'spark',
  };
}

function ToastIcon({ icon }: { icon: ToastCopy['icon'] }) {
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
  const [text, setText] = useState('');
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, duration = 3000) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setText(message);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), duration);
  }, []);

  useEffect(() => {
    window.showNotification = show;
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [show]);

  // Pick up a handoff message left by the previous page (survives the hard
  // navigation). Small delay so the slide-in transition plays after paint.
  useEffect(() => {
    let msg: string | null = null;
    try {
      msg = sessionStorage.getItem(TOAST_HANDOFF_KEY);
      if (msg) sessionStorage.removeItem(TOAST_HANDOFF_KEY);
    } catch { /* private mode */ }
    if (!msg) return;
    const t = setTimeout(() => show(msg as string, 3500), 600);
    return () => clearTimeout(t);
  }, [show]);

  const copy = buildToastCopy(text, lang);

  return (
    <div
      className={`notification${visible ? ' show' : ''}`}
      data-tone={copy.tone}
      data-variant={copy.variant}
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="notification-mark">
        <ToastIcon icon={copy.icon} />
      </span>
      <span className="notification-copy">
        <span className="notification-eyebrow">{copy.eyebrow}</span>
        <span className="notification-title">{copy.title}</span>
        {copy.detail && <span className="notification-detail">{copy.detail}</span>}
      </span>
    </div>
  );
}
