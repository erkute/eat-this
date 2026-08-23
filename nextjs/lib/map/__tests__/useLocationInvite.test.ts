// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { mayInviteLocation, useLocationInvite } from '../useLocationInvite';

/**
 * The gate in front of the locate control's label. Two ways to get it wrong
 * and both are bad: keep nudging someone who already said no, or stay mute —
 * which is where the map started, with a bare icon nobody presses.
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
  vi.restoreAllMocks();
});

describe('mayInviteLocation', () => {
  it('labels the control while the permission is unanswered', () => {
    expect(mayInviteLocation('prompt')).toBe(true);
  });

  it('stays bare once the browser holds an answer', () => {
    expect(mayInviteLocation('granted')).toBe(false);
    expect(mayInviteLocation('denied')).toBe(false);
  });

  it('still labels where the browser will not say', () => {
    // Pre-16 Safari has no Permissions API. A tap landing on a standing denial
    // resolves into the "Blockiert" notice, which beats staying mute.
    expect(mayInviteLocation('unknown')).toBe(true);
  });
});

describe('useLocationInvite', () => {
  it('starts closed so the label is never server-rendered', () => {
    stubPermissions('prompt');
    const { result } = renderHook(() => useLocationInvite());
    expect(result.current).toBe(false);
  });

  it('opens after mount for an unanswered permission', async () => {
    stubPermissions('prompt');
    const { result } = renderHook(() => useLocationInvite());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('stays shut for someone who already granted', async () => {
    stubPermissions('granted');
    const { result } = renderHook(() => useLocationInvite());
    await waitFor(() => expect(navigator.permissions.query).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('stays shut for a standing denial', async () => {
    stubPermissions('denied');
    const { result } = renderHook(() => useLocationInvite());
    await waitFor(() => expect(navigator.permissions.query).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  /* The cookie gate locks the page and asks first. A label unfolding under a
     modal is motion nobody can act on. */
  it('waits behind the cookie gate and opens when it closes', async () => {
    document.documentElement.setAttribute('data-consent-gate', 'open');
    stubPermissions('prompt');

    const { result } = renderHook(() => useLocationInvite());
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

    const { result } = renderHook(() => useLocationInvite());
    await waitFor(() => expect(result.current).toBe(true));

    expect(getCurrentPosition).not.toHaveBeenCalled();
  });
});
