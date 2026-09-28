// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { isInviteOpen, useLocationInvite } from '../useLocationInvite';

/**
 * The gate in front of the map's one-time location question (the info card,
 * useLocationWelcome) and the invite funnel. Two ways to get it wrong: keep
 * nudging someone who already answered, or never ask at all.
 */
function stubPermissions(state: string | null) {
  Object.defineProperty(navigator, 'permissions', {
    value: state === null ? undefined : { query: vi.fn().mockResolvedValue({ state }) },
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  document.documentElement.removeAttribute('data-consent-gate');
  stubPermissions(null);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('isInviteOpen', () => {
  it('asks an unanswered permission until a position turns up', () => {
    for (const state of ['prompt', 'unknown'] as const) {
      expect(isInviteOpen(state, false)).toBe(true);
      /* The permission is read once at mount, so someone who grants
         mid-session stays 'prompt' here: the position ends it. */
      expect(isInviteOpen(state, true)).toBe(false);
    }
  });

  it('asks nobody who already answered', () => {
    for (const located of [false, true]) {
      expect(isInviteOpen('denied', located)).toBe(false);
      expect(isInviteOpen('granted', located)).toBe(false);
    }
  });
});

describe('useLocationInvite', () => {
  it('starts closed, so nothing is server-rendered', () => {
    stubPermissions('prompt');
    const { result } = renderHook(() => useLocationInvite(false));
    expect(result.current).toBe(false);
  });

  it('opens after mount for an unanswered permission and stays open', async () => {
    stubPermissions('prompt');
    const { result } = renderHook(() => useLocationInvite(false));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('stays shut for a standing denial', async () => {
    stubPermissions('denied');
    const { result } = renderHook(() => useLocationInvite(false));
    await waitFor(() => expect(navigator.permissions.query).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('stays shut for a granted visitor', async () => {
    stubPermissions('granted');
    const { result } = renderHook(() => useLocationInvite(false));
    await waitFor(() => expect(navigator.permissions.query).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  /* The cookie gate locks the page and asks first. A question under a modal
     is one nobody can answer. */
  it('waits behind the cookie gate and opens when it closes', async () => {
    document.documentElement.setAttribute('data-consent-gate', 'open');
    stubPermissions('prompt');

    const { result } = renderHook(() => useLocationInvite(false));
    await waitFor(() => expect(navigator.permissions.query).toHaveBeenCalled());
    expect(result.current).toBe(false);

    document.documentElement.removeAttribute('data-consent-gate');
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('never touches geolocation — deciding whether to ask must not itself ask', async () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });
    stubPermissions('prompt');

    const { result } = renderHook(() => useLocationInvite(false));
    await waitFor(() => expect(result.current).toBe(true));

    expect(getCurrentPosition).not.toHaveBeenCalled();
  });
});
