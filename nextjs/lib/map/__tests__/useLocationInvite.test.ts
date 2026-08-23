// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import {
  GREETING_MIN_VISIBLE_MS,
  isLabelStillOwed,
  mayInviteLocation,
  useLocationInvite,
} from '../useLocationInvite';

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
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('mayInviteLocation', () => {
  it('lets every state but a denial speak', () => {
    expect(mayInviteLocation('prompt')).toBe(true);
    expect(mayInviteLocation('granted')).toBe(true);
    // Pre-16 Safari: a denial is indistinguishable from an open prompt there.
    expect(mayInviteLocation('unknown')).toBe(true);
    expect(mayInviteLocation('denied')).toBe(false);
  });
});

describe('isLabelStillOwed', () => {
  it('keeps an unanswered permission asking until a position turns up', () => {
    // Nothing arrives on its own to end an invitation — only the visitor does.
    for (const state of ['prompt', 'unknown'] as const) {
      expect(isLabelStillOwed(state, false, false)).toBe('invite');
      expect(isLabelStillOwed(state, false, true)).toBe('invite');
    }
  });

  it('retires the invitation once the visitor has actually been located', () => {
    /* The permission is read once at mount, so someone who grants mid-session
       stays 'prompt' here forever. Without this the pill would come back after
       the map centred on them and ask where they are — while showing it. */
    for (const state of ['prompt', 'unknown'] as const) {
      expect(isLabelStillOwed(state, true, false)).toBeNull();
      expect(isLabelStillOwed(state, true, true)).toBeNull();
    }
  });

  it('never shows a denial anything', () => {
    expect(isLabelStillOwed('denied', false, false)).toBeNull();
    expect(isLabelStillOwed('denied', true, true)).toBeNull();
  });

  it('holds the greeting past a fix that lands too fast to read', () => {
    // The whole point of the floor: a cached fix resolves in tens of ms.
    expect(isLabelStillOwed('granted', true, false)).toBe('greeting');
  });

  it('holds the greeting past the floor while the fix is still out', () => {
    expect(isLabelStillOwed('granted', false, true)).toBe('greeting');
  });

  it('ends the greeting only once BOTH are true', () => {
    expect(isLabelStillOwed('granted', true, true)).toBeNull();
  });
});

describe('useLocationInvite', () => {
  it('starts closed so the label is never server-rendered', () => {
    stubPermissions('prompt');
    const { result } = renderHook(() => useLocationInvite(false));
    expect(result.current).toBeNull();
  });

  it('opens after mount for an unanswered permission and stays open', async () => {
    stubPermissions('prompt');
    const { result } = renderHook(() => useLocationInvite(false));
    await waitFor(() => expect(result.current).toBe('invite'));
  });

  it('stays shut for a standing denial', async () => {
    stubPermissions('denied');
    const { result } = renderHook(() => useLocationInvite(false));
    await waitFor(() => expect(navigator.permissions.query).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it('greets a granted visitor and retires once the fix is in', async () => {
    vi.useFakeTimers();
    stubPermissions('granted');
    const { result, rerender } = renderHook(({ located }) => useLocationInvite(located), {
      initialProps: { located: false },
    });

    // Let the permission read resolve without letting the floor expire.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current).toBe('greeting');

    // A cached fix lands almost immediately — the greeting must survive it.
    rerender({ located: true });
    expect(result.current).toBe('greeting');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(GREETING_MIN_VISIBLE_MS);
    });
    expect(result.current).toBeNull();
  });

  it('keeps greeting a granted visitor whose position never arrives', async () => {
    vi.useFakeTimers();
    stubPermissions('granted');
    const { result } = renderHook(() => useLocationInvite(false));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(GREETING_MIN_VISIBLE_MS * 3);
    });

    // Deliberate: a tap now runs a loud request that surfaces the real error.
    expect(result.current).toBe('greeting');
  });

  /* The cookie gate locks the page and asks first. A label unfolding under a
     modal is motion nobody can act on. */
  it('waits behind the cookie gate and opens when it closes', async () => {
    document.documentElement.setAttribute('data-consent-gate', 'open');
    stubPermissions('prompt');

    const { result } = renderHook(() => useLocationInvite(false));
    await waitFor(() => expect(navigator.permissions.query).toHaveBeenCalled());
    expect(result.current).toBeNull();

    document.documentElement.removeAttribute('data-consent-gate');
    await waitFor(() => expect(result.current).toBe('invite'));
  });

  it('never touches geolocation — deciding whether to ask must not itself ask', async () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });
    stubPermissions('prompt');

    const { result } = renderHook(() => useLocationInvite(false));
    await waitFor(() => expect(result.current).toBe('invite'));

    expect(getCurrentPosition).not.toHaveBeenCalled();
  });
});
