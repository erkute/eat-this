// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';

const state = vi.hoisted(() => ({
  user: null as { uid: string; displayName: string; email: string } | null,
  loading: false,
  loginOpen: false,
  intent: null as { heartRestaurantId?: string } | null,
  close: vi.fn(),
  useRouter: vi.fn(() => ({ replace: vi.fn(), push: vi.fn() })),
}));

vi.mock('@/i18n/navigation', () => ({ useRouter: state.useRouter }));
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: state.user, loading: state.loading }),
  useLoginModal: () => ({
    isOpen: state.loginOpen,
    reason: null,
    intent: state.intent,
    close: state.close,
  }),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ lang: 'de', t: (key: string) => key, setLang: vi.fn() }),
}));
vi.mock('@/app/components/LoginModalBarLock', () => ({ default: () => null }));
// Das Panel selbst spielt hier keine Rolle — nur der Zeitpunkt, zu dem das
// Modal es wegnimmt.
vi.mock('next/dynamic', () => ({ default: () => () => <div>Login panel</div> }));

import BridgeAuth from '@/app/[locale]/(spa)/BridgeAuth';
import { AUTH_SCREEN_HOLD_MS } from '@/app/components/AuthScreen';

const showNotice = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  state.user = { uid: 'user-1', displayName: 'Food Fan', email: 'food@example.com' };
  state.loading = false;
  state.loginOpen = true;
  state.intent = null;
  state.close.mockClear();
  state.useRouter.mockClear();
  showNotice.mockClear();
  window.showNotice = showNotice;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/* Der Wartescreen (AuthScreen) haengt im Panel, also am Modal. Schloss
   BridgeAuth es in derselben Runde, in der Firebase den Nutzer meldet, war der
   Screen weg, bevor er gelesen war — beim Google-Popup bekommt er ueberhaupt
   erst nach dem Popup-Fenster seinen Auftritt (Nutzer, 29.08.2026). */
describe('BridgeAuth — Haltezeit nach dem Anmelden', () => {
  it('laesst das Modal die Haltezeit des Wartescreens abwarten', () => {
    render(<BridgeAuth />);

    expect(state.close).not.toHaveBeenCalled();
    expect(showNotice).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(AUTH_SCREEN_HOLD_MS - 1);
    });
    expect(state.close).not.toHaveBeenCalled();
    expect(showNotice).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(state.close).toHaveBeenCalledOnce();
    /* Keine Bestaetigung danach: der Wartescreen hat es schon gesagt
       (24.09.2026 gestrichen). */
    expect(showNotice).not.toHaveBeenCalled();
  });

  /* Wer auf einem Spot stand und sich dort anmeldete, landete vorher auf der
     Startseite. Es wird nichts mehr weitergeleitet — das Modal liegt ueber der
     Seite, die gemeint ist. */
  it('bleibt auf der Seite, auf der der Login angefangen hat', () => {
    render(<BridgeAuth />);
    act(() => {
      vi.advanceTimersByTime(AUTH_SCREEN_HOLD_MS);
    });

    // Kein Router, keine Weiterleitung: schon der Griff zum Router waere die
    // Rueckkehr des Sprungs auf die Startseite.
    expect(state.useRouter).not.toHaveBeenCalled();
  });

  it('schliesst nicht nach, wenn das Modal waehrend der Haltezeit zugeht', () => {
    const { rerender } = render(<BridgeAuth />);

    state.loginOpen = false;
    rerender(<BridgeAuth />);

    act(() => {
      vi.advanceTimersByTime(AUTH_SCREEN_HOLD_MS * 2);
    });
    expect(state.close).not.toHaveBeenCalled();
  });
});
