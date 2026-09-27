// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Notice } from '@/lib/notice';
import { useLocationWelcome } from '../useLocationWelcome';

describe('first map location invitation', () => {
  let notice: Notice | null;
  const clear = vi.fn();
  const show = vi.fn((next: Notice | null) => {
    notice = next;
    return clear;
  });
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    notice = null;
    show.mockClear();
    clear.mockClear();
    window.showNotice = show;
  });
  afterEach(() => {
    vi.useRealTimers();
    delete window.showNotice;
  });

  it('waits for permission and consent gates, and requests location only on Share', () => {
    const locate = vi.fn();
    const { rerender } = renderHook(({ eligible }) => useLocationWelcome(eligible, 'de', locate), {
      initialProps: { eligible: false },
    });
    act(() => vi.advanceTimersByTime(1000));
    expect(show).not.toHaveBeenCalled();
    rerender({ eligible: true });
    act(() => vi.advanceTimersByTime(800));
    expect(notice?.title).toBe('Wo bist du?');
    expect(notice?.dismissLabel).toBe('Später');
    expect(locate).not.toHaveBeenCalled();
    act(() => notice?.action?.onClick());
    expect(locate).toHaveBeenCalledOnce();
  });

  it('does not ask again on a later map visit', () => {
    const first = renderHook(() => useLocationWelcome(true, 'de', vi.fn()));
    act(() => vi.advanceTimersByTime(800));
    first.unmount();
    renderHook(() => useLocationWelcome(true, 'de', vi.fn()));
    act(() => vi.advanceTimersByTime(800));
    expect(show).toHaveBeenCalledOnce();
    expect(clear).toHaveBeenCalledOnce();
  });

  it('cancels when the user leaves or grants through the existing button', () => {
    const { rerender } = renderHook(({ eligible }) => useLocationWelcome(eligible, 'en', vi.fn()), {
      initialProps: { eligible: true },
    });
    rerender({ eligible: false });
    act(() => vi.advanceTimersByTime(1000));
    expect(show).not.toHaveBeenCalled();
  });

  it('does not close or repeat the layer when the request callback changes', () => {
    const initial = vi.fn();
    const latest = vi.fn();
    const { rerender } = renderHook(({ locate }) => useLocationWelcome(true, 'en', locate), {
      initialProps: { locate: initial },
    });
    act(() => vi.advanceTimersByTime(800));
    rerender({ locate: latest });
    expect(clear).not.toHaveBeenCalled();
    act(() => notice?.action?.onClick());
    expect(latest).toHaveBeenCalledOnce();
    expect(initial).not.toHaveBeenCalled();
    expect(show).toHaveBeenCalledOnce();
  });
});
