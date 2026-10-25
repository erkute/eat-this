// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

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

describe('BridgeAuth — direct sign-in', () => {
  it('closes immediately when the verified account arrives, without a confirmation screen', () => {
    render(<BridgeAuth />);
    expect(state.close).toHaveBeenCalledOnce();
    expect(showNotice).not.toHaveBeenCalled();
    expect(state.useRouter).not.toHaveBeenCalled();
  });

  it('waits for auth to resolve', () => {
    state.loading = true;
    const { rerender } = render(<BridgeAuth />);
    expect(state.close).not.toHaveBeenCalled();
    state.loading = false;
    rerender(<BridgeAuth />);
    expect(state.close).toHaveBeenCalledOnce();
  });

  it('keeps the form open for guests and leaves closed modals alone', () => {
    state.user = null;
    const { rerender } = render(<BridgeAuth />);
    expect(state.close).not.toHaveBeenCalled();
    state.loginOpen = false;
    state.user = { uid: 'u1', displayName: 'Food Fan', email: 'food@example.com' };
    rerender(<BridgeAuth />);
    expect(state.close).not.toHaveBeenCalled();
  });
});
