// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';

const state = vi.hoisted(() => ({
  user: null as { uid: string; displayName: string; email: string } | null,
  loading: false,
  loginOpen: false,
  close: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next-intl', () => ({ useLocale: () => 'de' }));
vi.mock('@/i18n/navigation', () => ({ useRouter: () => ({ replace: state.replace }) }));
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: state.user, loading: state.loading }),
  useLoginModal: () => ({ isOpen: state.loginOpen, mode: 'starter', close: state.close }),
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
import { TOAST_HANDOFF_KEY } from '@/app/components/NotificationToast';

beforeEach(() => {
  vi.useFakeTimers();
  state.user = { uid: 'user-1', displayName: 'Food Fan', email: 'food@example.com' };
  state.loading = false;
  state.loginOpen = true;
  state.close.mockClear();
  state.replace.mockClear();
  sessionStorage.clear();
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
  it('laesst Modal und Weiterleitung die Haltezeit des Wartescreens abwarten', () => {
    render(<BridgeAuth />);

    expect(state.close).not.toHaveBeenCalled();
    expect(state.replace).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(AUTH_SCREEN_HOLD_MS - 1);
    });
    expect(state.close).not.toHaveBeenCalled();
    expect(state.replace).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(state.close).toHaveBeenCalledOnce();
    expect(state.replace).toHaveBeenCalledWith('/');
    expect(sessionStorage.getItem(TOAST_HANDOFF_KEY)).toBe('Du bist angemeldet');
  });

  /* Die Bestaetigung wird erst mit der Weiterleitung hinterlegt: wer waehrend
     der Haltezeit abbricht, soll sie nicht beim naechsten Seitenaufruf
     nachgereicht bekommen. */
  it('hinterlegt die Bestaetigung nicht schon beim Anmelden', () => {
    render(<BridgeAuth />);

    act(() => {
      vi.advanceTimersByTime(AUTH_SCREEN_HOLD_MS - 1);
    });
    expect(sessionStorage.getItem(TOAST_HANDOFF_KEY)).toBeNull();
  });

  it('leitet nicht weiter, wenn das Modal waehrend der Haltezeit zugeht', () => {
    const { rerender } = render(<BridgeAuth />);

    state.loginOpen = false;
    rerender(<BridgeAuth />);

    act(() => {
      vi.advanceTimersByTime(AUTH_SCREEN_HOLD_MS * 2);
    });
    expect(state.replace).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(TOAST_HANDOFF_KEY)).toBeNull();
  });
});
