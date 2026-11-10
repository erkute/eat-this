// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserLocationError } from '../useUserLocation';
import { useMapLocationFeedback } from '../useMapLocationFeedback';
import { LOCATING_SHOW_DELAY_MS, LOCATION_ERROR_VISIBLE_MS } from '../locationStatus';

const mocks = vi.hoisted(() => ({ notify: vi.fn(), dismiss: vi.fn(), welcome: vi.fn() }));
vi.mock('@/lib/notice', () => ({ notify: mocks.notify }));
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn(), trackEventOnce: vi.fn() }));
vi.mock('../useLocationInvite', () => ({ useLocationInvite: () => true }));
vi.mock('../useExplorationSettled', () => ({ useExplorationSettled: () => true }));
vi.mock('../useLocationWelcome', () => ({ useLocationWelcome: mocks.welcome }));
vi.mock('../locationHelp', () => ({ locationBlockedOptions: (_locale: string, onDismiss: () => void) => ({ onDismiss }) }));
function options() {
  return { locale: 'de', isActive: true, sheetView: 'list' as 'list' | 'detail',
    location: null, locationError: null as UserLocationError | null, locateLoading: false,
    mapDataLoading: false, mapDataError: null, onLocateMe: vi.fn() };
}
beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); mocks.notify.mockReturnValue(mocks.dismiss); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('useMapLocationFeedback', () => {
  it('does not flash a locating notice for a quick fix', () => {
    const args = options();
    const { rerender } = renderHook(props => useMapLocationFeedback(props), { initialProps: { ...args, locateLoading: true } });
    act(() => vi.advanceTimersByTime(LOCATING_SHOW_DELAY_MS - 1));
    rerender(args);
    act(() => vi.advanceTimersByTime(2000));
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it('an error immediately replaces the held locating notice and permits retry', () => {
    const args = options();
    const { rerender } = renderHook(props => useMapLocationFeedback(props), { initialProps: { ...args, locateLoading: true } });
    act(() => vi.advanceTimersByTime(LOCATING_SHOW_DELAY_MS));
    expect(mocks.notify.mock.lastCall?.[0]).toBe('locating');
    rerender({ ...args, locationError: 'timeout' });
    expect(mocks.dismiss).toHaveBeenCalled();
    expect(mocks.notify.mock.lastCall?.[0]).toBe('locationNotFound');
    act(() => mocks.notify.mock.lastCall?.[2].action.onClick());
    expect(args.onLocateMe).toHaveBeenCalledOnce();
  });

  it('retires transient errors but shows the same error again on a deliberate retry', () => {
    const args = { ...options(), locationError: 'timeout' as const };
    const { result } = renderHook(() => useMapLocationFeedback(args));
    expect(mocks.notify).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(LOCATION_ERROR_VISIBLE_MS));
    expect(mocks.dismiss).toHaveBeenCalledTimes(1);
    act(() => result.current());
    expect(args.onLocateMe).toHaveBeenCalledOnce();
    expect(mocks.notify).toHaveBeenCalledTimes(2);
  });

  it('keeps blocked-permission help available and removes it on detail open', () => {
    const args = { ...options(), locationError: 'denied' as const };
    const { rerender } = renderHook(props => useMapLocationFeedback(props), { initialProps: args });
    expect(mocks.notify.mock.lastCall?.[0]).toBe('locationBlocked');
    act(() => vi.advanceTimersByTime(60000));
    expect(mocks.dismiss).not.toHaveBeenCalled();
    rerender({ ...args, sheetView: 'detail' });
    expect(mocks.dismiss).toHaveBeenCalledOnce();
    expect(mocks.welcome.mock.lastCall?.[0]).toBe(false);
  });
});
