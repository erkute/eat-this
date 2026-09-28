// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXPLORATION_SETTLE_MS, useExplorationSettled } from '../useExplorationSettled';

const wheel = () => window.dispatchEvent(new Event('wheel'));
const touchmove = () => window.dispatchEvent(new Event('touchmove'));
const mouseDrag = (buttons: number) =>
  window.dispatchEvent(Object.assign(new Event('pointermove'), { buttons }));

describe('useExplorationSettled', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('bleibt ohne Geste aus', () => {
    const { result } = renderHook(() => useExplorationSettled());
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current).toBe(false);
  });

  it('schaltet erst, wenn die Geste zur Ruhe gekommen ist', () => {
    const { result } = renderHook(() => useExplorationSettled());
    act(() => touchmove());
    act(() => vi.advanceTimersByTime(EXPLORATION_SETTLE_MS - 100));
    // Weiter gewischt: die Frist beginnt von vorn.
    act(() => touchmove());
    act(() => vi.advanceTimersByTime(EXPLORATION_SETTLE_MS - 100));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe(true);
  });

  it('zählt Scrollrad und Ziehen mit der Maus, aber keine blosse Mausbewegung', () => {
    const hover = renderHook(() => useExplorationSettled());
    act(() => mouseDrag(0));
    act(() => vi.advanceTimersByTime(EXPLORATION_SETTLE_MS));
    expect(hover.result.current).toBe(false);

    act(() => mouseDrag(1));
    act(() => vi.advanceTimersByTime(EXPLORATION_SETTLE_MS));
    expect(hover.result.current).toBe(true);

    const scrolled = renderHook(() => useExplorationSettled());
    act(() => wheel());
    act(() => vi.advanceTimersByTime(EXPLORATION_SETTLE_MS));
    expect(scrolled.result.current).toBe(true);
  });

  it('hängt die Listener ab, sobald es geschaltet hat', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    renderHook(() => useExplorationSettled());
    act(() => wheel());
    act(() => vi.advanceTimersByTime(EXPLORATION_SETTLE_MS));
    expect(remove.mock.calls.map(([type]) => type)).toEqual(
      expect.arrayContaining(['wheel', 'touchmove', 'pointermove'])
    );
    remove.mockRestore();
  });
});
