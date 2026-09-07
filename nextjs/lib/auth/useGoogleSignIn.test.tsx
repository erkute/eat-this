// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({
  user: null as null | { metadata: { creationTime?: string; lastSignInTime?: string } },
  signInWithGoogle: vi.fn<() => Promise<void>>(),
  prepareGoogleSignIn: vi.fn(),
}));
const trackEvent = vi.hoisted(() => vi.fn());

vi.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: authState.user,
    loading: false,
    signInWithGoogle: authState.signInWithGoogle,
    prepareGoogleSignIn: authState.prepareGoogleSignIn,
  }),
}));
vi.mock('@/lib/analytics', () => ({ trackEvent }));
vi.mock('@/app/components/AuthScreen', () => ({ AUTH_SCREEN_HOLD_MS: 2200 }));

import { useGoogleSignIn } from './useGoogleSignIn';

function firebaseError(code: string) {
  return Object.assign(new Error(code), { code });
}

describe('useGoogleSignIn', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    authState.user = null;
    authState.signInWithGoogle.mockReset();
    authState.prepareGoogleSignIn.mockReset();
    trackEvent.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('holds the wait screen after the answer, then settles and reports', async () => {
    authState.signInWithGoogle.mockResolvedValue(undefined);
    const onSettled = vi.fn();
    const { result } = renderHook(() => useGoogleSignIn({ onSettled }));

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.phase).toBe('done');
    expect(trackEvent).toHaveBeenCalledWith('login_start', { method: 'google' });

    act(() => vi.advanceTimersByTime(2199));
    expect(result.current.phase).toBe('done');
    expect(onSettled).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.phase).toBe('idle');
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('treats a closed window as a decision: quiet note, short retreat', async () => {
    authState.signInWithGoogle.mockRejectedValue(firebaseError('auth/popup-closed-by-user'));
    const { result } = renderHook(() => useGoogleSignIn());

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.phase).toBe('leaving');
    expect(result.current.note).toBe('cancelled');

    act(() => vi.advanceTimersByTime(260));
    expect(result.current.phase).toBe('idle');
    expect(result.current.note).toBe('cancelled');
  });

  it('names a blocked window and a failed handover differently', async () => {
    authState.signInWithGoogle.mockRejectedValueOnce(firebaseError('auth/popup-blocked'));
    const { result } = renderHook(() => useGoogleSignIn());

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.note).toBe('blocked');

    authState.signInWithGoogle.mockRejectedValueOnce(firebaseError('auth/internal-error'));
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.note).toBe('failed');
  });

  it('counts a fresh account as sign_up and a returning one as login, only via Google', async () => {
    authState.signInWithGoogle.mockResolvedValue(undefined);
    const { result, rerender } = renderHook(() => useGoogleSignIn());

    // Angemeldet, ohne dass hier ein Knopf gedrueckt wurde (anderer Tab,
    // Mail-Link): kein Ereignis.
    authState.user = {
      metadata: { creationTime: '2026-01-01T00:00:00Z', lastSignInTime: '2026-09-07T10:00:00Z' },
    };
    rerender();
    expect(trackEvent).not.toHaveBeenCalledWith('login', expect.anything());

    authState.user = null;
    rerender();
    await act(async () => {
      await result.current.start();
    });
    authState.user = {
      metadata: { creationTime: '2026-09-07T10:00:00Z', lastSignInTime: '2026-09-07T10:00:03Z' },
    };
    rerender();
    expect(trackEvent).toHaveBeenCalledWith('sign_up', { method: 'google' });

    authState.user = null;
    rerender();
    await act(async () => {
      await result.current.start();
    });
    authState.user = {
      metadata: { creationTime: '2026-01-01T00:00:00Z', lastSignInTime: '2026-09-07T10:00:00Z' },
    };
    rerender();
    expect(trackEvent).toHaveBeenCalledWith('login', { method: 'google' });
  });

  it('hands the popup warm-up through untouched', () => {
    const { result } = renderHook(() => useGoogleSignIn());
    result.current.prepare();
    expect(authState.prepareGoogleSignIn).toHaveBeenCalledTimes(1);
  });
});
