// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDeferredStatus } from '../useDeferredStatus';

const DELAY = 350;
const MIN_VISIBLE = 600;

function setup(active: boolean) {
  return renderHook(({ on }: { on: boolean }) => useDeferredStatus(on, DELAY, MIN_VISIBLE), {
    initialProps: { on: active },
  });
}

describe('useDeferredStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('never shows for a wait shorter than the delay', () => {
    const { result, rerender } = setup(true);
    expect(result.current).toBe(false);

    // Cached GPS fix: resolves in tens of ms, well inside the delay.
    act(() => {
      vi.advanceTimersByTime(40);
    });
    rerender({ on: false });
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current).toBe(false);
  });

  it('shows once the wait outlives the delay', () => {
    const { result } = setup(true);

    act(() => {
      vi.advanceTimersByTime(DELAY - 1);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });

  it('holds a shown status for the minimum visible time', () => {
    const { result, rerender } = setup(true);
    act(() => {
      vi.advanceTimersByTime(DELAY);
    });
    expect(result.current).toBe(true);

    // Fix lands 150 ms after the toast appeared — it must not vanish yet.
    act(() => {
      vi.advanceTimersByTime(150);
    });
    rerender({ on: false });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(MIN_VISIBLE - 150 - 1);
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(false);
  });

  it('hides immediately when the wait already outlived the minimum', () => {
    const { result, rerender } = setup(true);
    act(() => {
      vi.advanceTimersByTime(DELAY + MIN_VISIBLE + 500);
    });
    expect(result.current).toBe(true);

    rerender({ on: false });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current).toBe(false);
  });

  it('stays visible when a retry re-activates it mid-hold', () => {
    const { result, rerender } = setup(true);
    act(() => {
      vi.advanceTimersByTime(DELAY);
    });
    rerender({ on: false });
    expect(result.current).toBe(true);

    rerender({ on: true });
    act(() => {
      vi.advanceTimersByTime(MIN_VISIBLE + 1000);
    });
    expect(result.current).toBe(true);
  });
});
