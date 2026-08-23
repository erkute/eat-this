// @vitest-environment jsdom
import { afterAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

import { getMustEatProximityProgress, useMustEatDetailState } from '../useMustEatDetailState';
import { trackEvent } from '@/lib/analytics';
import type { MapMustEat } from '@/lib/types';

const mkMustEat = (): MapMustEat => ({
  _id: 'me-1',
  dish: 'Pizza',
  image: '/card.webp',
  restaurant: {
    _id: 'r-1',
    name: 'R',
    slug: 'r',
    lat: 52.52,
    lng: 13.405,
  },
});

const fakeRect = {
  width: 100,
  height: 100,
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  right: 100,
  bottom: 100,
  toJSON: () => ({}),
} as DOMRect;
const mkEvent = () =>
  ({
    currentTarget: { getBoundingClientRect: () => fakeRect },
  }) as unknown as React.MouseEvent<HTMLButtonElement>;
const originalVibrate = navigator.vibrate;
const vibrate = vi.fn();

Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });
afterAll(() => {
  if (originalVibrate) {
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: originalVibrate });
  } else {
    Reflect.deleteProperty(navigator, 'vibrate');
  }
});

describe('getMustEatProximityProgress', () => {
  it('grows as the user approaches and reaches full at the reveal radius', () => {
    const far = getMustEatProximityProgress(5000);
    const nearby = getMustEatProximityProgress(500);
    const almostThere = getMustEatProximityProgress(100);

    expect(far).not.toBeNull();
    expect(nearby).toBeGreaterThan(far ?? 0);
    expect(almostThere).toBeGreaterThan(nearby ?? 0);
    expect(getMustEatProximityProgress(50)).toBe(1);
  });

  it('has no progress without a location fix', () => {
    expect(getMustEatProximityProgress(null)).toBeNull();
  });
});

describe('useMustEatDetailState — handleCardClick auth gate', () => {
  beforeEach(() => {
    vi.mocked(trackEvent).mockClear();
    vibrate.mockClear();
  });

  it('waits for a persisted unlock before showing or tracking success', async () => {
    let resolveUnlock!: (persisted: boolean) => void;
    const onUnlock = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveUnlock = resolve;
        })
    );
    const { result } = renderHook(() =>
      useMustEatDetailState({
        mustEat: mkMustEat(),
        userLocation: { lat: 52.52, lng: 13.405 }, // 0m from restaurant
        onUnlock,
        isAuthed: true,
      })
    );

    expect(result.current.canUnlock).toBe(true);
    expect(result.current.revealOrigin).toBeNull();

    let click!: Promise<void>;
    act(() => {
      click = result.current.handleCardClick(mkEvent());
    });

    expect(result.current.unlocking).toBe(true);
    expect(result.current.revealOrigin).toBeNull();
    expect(onUnlock).toHaveBeenCalledOnce();
    expect(trackEvent).not.toHaveBeenCalledWith(
      'must_eat_reveal_attempt',
      expect.objectContaining({ result: 'unlocked' })
    );

    await act(async () => {
      resolveUnlock(true);
      await click;
    });

    expect(result.current.unlocking).toBe(false);
    expect(result.current.unlockError).toBe(false);
    expect(result.current.revealOrigin).toBe(fakeRect);
    expect(trackEvent).toHaveBeenCalledWith(
      'must_eat_reveal_attempt',
      expect.objectContaining({ result: 'unlocked' })
    );
    expect(vibrate).toHaveBeenCalledWith([55, 30, 75, 30, 95]);
  });

  it('keeps the card covered and exposes a retry state when persistence fails', async () => {
    const onUnlock = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() =>
      useMustEatDetailState({
        mustEat: mkMustEat(),
        userLocation: { lat: 52.52, lng: 13.405 },
        onUnlock,
        isAuthed: true,
      })
    );

    await act(async () => {
      await result.current.handleCardClick(mkEvent());
    });

    expect(result.current.unlocking).toBe(false);
    expect(result.current.unlockError).toBe(true);
    expect(result.current.revealOrigin).toBeNull();
    expect(trackEvent).toHaveBeenCalledWith(
      'must_eat_reveal_attempt',
      expect.objectContaining({ result: 'failed' })
    );
    expect(trackEvent).not.toHaveBeenCalledWith(
      'must_eat_reveal_attempt',
      expect.objectContaining({ result: 'unlocked' })
    );
  });

  it('handles a rejected unlock request without starting the reveal', async () => {
    const onUnlock = vi.fn().mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() =>
      useMustEatDetailState({
        mustEat: mkMustEat(),
        userLocation: { lat: 52.52, lng: 13.405 },
        onUnlock,
        isAuthed: true,
      })
    );

    await act(async () => {
      await expect(result.current.handleCardClick(mkEvent())).resolves.toBeUndefined();
    });

    expect(result.current.unlockError).toBe(true);
    expect(result.current.revealOrigin).toBeNull();
  });

  it('within unlock radius but NOT authed: does NOT set revealOrigin or call onUnlock', () => {
    const onUnlock = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useMustEatDetailState({
        mustEat: mkMustEat(),
        userLocation: { lat: 52.52, lng: 13.405 },
        onUnlock,
        isAuthed: false,
      })
    );

    expect(result.current.canUnlock).toBe(true);

    act(() => {
      result.current.handleCardClick(mkEvent());
    });

    // Anon must not enter the reveal-overlay code path — overlay would leak.
    expect(result.current.revealOrigin).toBeNull();
    expect(onUnlock).not.toHaveBeenCalled();
  });

  it('outside the unlock radius clears the tapping state after the shake', () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() =>
        useMustEatDetailState({
          mustEat: mkMustEat(),
          userLocation: null,
          onUnlock: vi.fn().mockResolvedValue(true),
          isAuthed: true,
        })
      );

      act(() => {
        result.current.handleCardClick(mkEvent());
      });
      expect(result.current.tapping).toBe(true);

      act(() => {
        vi.advanceTimersByTime(599);
      });
      expect(result.current.tapping).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.tapping).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

/**
 * A covered card with no position fix is the single place where the missing
 * permission actually costs the visitor something — and it used to answer a tap
 * with a shake and a "come within 50 m" line, which is a guess, not a fact.
 * Asking here is also the safest place to ask: the tap is deliberate and the
 * payoff is on screen, which is exactly what keeps the map from prompting on
 * first paint and collecting a permanent "Don't Allow".
 */
describe('useMustEatDetailState — no position fix', () => {
  beforeEach(() => {
    vi.mocked(trackEvent).mockClear();
  });

  const noFix = (extra: Record<string, unknown> = {}) => ({
    mustEat: mkMustEat(),
    userLocation: null,
    onUnlock: vi.fn().mockResolvedValue(true),
    isAuthed: true,
    ...extra,
  });

  it('flags the state instead of reporting a distance', () => {
    const { result } = renderHook(() => useMustEatDetailState(noFix()));

    expect(result.current.distance).toBeNull();
    expect(result.current.needsLocation).toBe(true);
    expect(result.current.locationDenied).toBe(false);
    expect(result.current.canUnlock).toBe(false);
  });

  it('asks for the position on tap rather than shaking', () => {
    const onRequestLocation = vi.fn();
    const { result } = renderHook(() => useMustEatDetailState(noFix({ onRequestLocation })));

    act(() => {
      result.current.handleCardClick(mkEvent());
    });

    expect(onRequestLocation).toHaveBeenCalledOnce();
    expect(result.current.tapping).toBe(false);
    expect(result.current.revealOrigin).toBeNull();
    expect(trackEvent).toHaveBeenCalledWith(
      'must_eat_reveal_attempt',
      expect.objectContaining({ result: 'location_requested', distance_meters: -1 })
    );
  });

  it('does not re-ask a denial — the browser would not prompt anyway', () => {
    const onRequestLocation = vi.fn();
    const { result } = renderHook(() =>
      useMustEatDetailState(noFix({ onRequestLocation, locationError: 'denied' }))
    );

    expect(result.current.locationDenied).toBe(true);

    act(() => {
      result.current.handleCardClick(mkEvent());
    });

    expect(onRequestLocation).not.toHaveBeenCalled();
    expect(result.current.tapping).toBe(true);
    expect(trackEvent).toHaveBeenCalledWith(
      'must_eat_reveal_attempt',
      expect.objectContaining({ result: 'location_missing' })
    );
  });

  it('treats a transient failure as still askable', () => {
    const onRequestLocation = vi.fn();
    const { result } = renderHook(() =>
      useMustEatDetailState(noFix({ onRequestLocation, locationError: 'timeout' }))
    );

    expect(result.current.locationDenied).toBe(false);

    act(() => {
      result.current.handleCardClick(mkEvent());
    });

    expect(onRequestLocation).toHaveBeenCalledOnce();
  });

  it('leaves demo mode alone — it is tappable by design, fix or not', () => {
    const onRequestLocation = vi.fn();
    const { result } = renderHook(() =>
      useMustEatDetailState(noFix({ onRequestLocation, demo: true }))
    );

    expect(result.current.needsLocation).toBe(false);

    act(() => {
      result.current.handleCardClick(mkEvent());
    });

    expect(onRequestLocation).not.toHaveBeenCalled();
    expect(result.current.revealOrigin).toBe(fakeRect);
  });

  it('hands a granted position straight back to the unlock path', () => {
    const onUnlock = vi.fn().mockResolvedValue(true);
    const { result, rerender } = renderHook(
      (props: { userLocation: { lat: number; lng: number } | null }) =>
        useMustEatDetailState({
          mustEat: mkMustEat(),
          userLocation: props.userLocation,
          onUnlock,
          isAuthed: true,
          onRequestLocation: vi.fn(),
        }),
      { initialProps: { userLocation: null as { lat: number; lng: number } | null } }
    );

    expect(result.current.canUnlock).toBe(false);

    // What the grant does: the map's shared location lands and the same card
    // becomes revealable — the second tap is a real unlock, not another ask.
    rerender({ userLocation: { lat: 52.52, lng: 13.405 } });

    expect(result.current.needsLocation).toBe(false);
    expect(result.current.canUnlock).toBe(true);
  });
});

describe('useMustEatDetailState — lazy zoom lifecycle', () => {
  it('does not start a zoom without a hydrated image', () => {
    const { result } = renderHook(() =>
      useMustEatDetailState({
        mustEat: { ...mkMustEat(), image: undefined },
        userLocation: null,
        onUnlock: vi.fn().mockResolvedValue(true),
        isAuthed: true,
      })
    );

    act(() => {
      result.current.handleCardZoom(mkEvent());
    });

    expect(result.current.zoomRect).toBeNull();
    expect(result.current.zoomActive).toBe(false);
  });

  it('keeps the origin visible until the lightbox is ready and through fly-back', () => {
    const { result } = renderHook(() =>
      useMustEatDetailState({
        mustEat: mkMustEat(),
        userLocation: null,
        onUnlock: vi.fn().mockResolvedValue(true),
        isAuthed: true,
      })
    );

    act(() => {
      result.current.handleCardZoom(mkEvent());
    });
    expect(result.current.zoomRect).toBe(fakeRect);
    expect(result.current.zoomActive).toBe(false);

    act(() => {
      result.current.handleZoomReady();
    });
    expect(result.current.zoomActive).toBe(true);

    act(() => {
      result.current.handleZoomClose();
    });
    expect(result.current.zoomRect).toBeNull();
    expect(result.current.zoomActive).toBe(true);

    act(() => {
      result.current.handleZoomExitComplete();
    });
    expect(result.current.zoomActive).toBe(false);
  });
});
