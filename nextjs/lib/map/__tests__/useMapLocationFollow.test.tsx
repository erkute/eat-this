// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapRef } from 'react-map-gl/maplibre';
import type { UserLocation } from '../useUserLocation';
import { useMapLocationFollow } from '../useMapLocationFollow';

const permission = vi.hoisted(() => vi.fn());
vi.mock('../useUserLocation', () => ({ hasGeolocationPermission: permission }));
vi.mock('../useMapCamera', () => ({ getUserLocationZoom: () => 16 }));

function harness() {
  const stop = vi.fn();
  const request = vi.fn().mockResolvedValue({ location: null, error: null });
  const watch = vi.fn(() => stop);
  const flyToSpot = vi.fn();
  const getFlyPadding = vi.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 }));
  return {
    isActive: true, detailId: null as string | null,
    mapRef: { current: {} as MapRef | null },
    camera: { flyToSpot, getFlyPadding, getFlyPaddingRef: { current: getFlyPadding } },
    geolocation: { location: null as UserLocation | null, loading: false, error: null,
      permitted: false, request, watch },
    stop,
  };
}
const berlin = { lat: 52.52, lng: 13.4 };

beforeEach(() => {
  vi.useFakeTimers();
  permission.mockReset().mockResolvedValue(false);
  window.history.replaceState({}, '', '/map');
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('useMapLocationFollow', () => {
  it('never prompts automatically without an existing permission', async () => {
    const args = harness();
    renderHook(() => useMapLocationFollow(args));
    await act(async () => {});
    expect(args.geolocation.request).not.toHaveBeenCalled();
    expect(args.geolocation.watch).not.toHaveBeenCalled();
    expect(args.camera.flyToSpot).not.toHaveBeenCalled();
  });

  it.each(['interaction', 'deep-link', 'inactive'])('does not let a late automatic fix override %s', async (reason) => {
    permission.mockResolvedValue(true);
    const args = harness();
    let resolve!: (value: { location: UserLocation; error: null }) => void;
    args.geolocation.request.mockImplementation(() => new Promise(done => { resolve = done; }));
    if (reason === 'deep-link') window.history.replaceState({}, '', '/map?r=spot');
    const { result, rerender } = renderHook(props => useMapLocationFollow(props), { initialProps: args });
    await act(async () => {});
    if (reason === 'interaction') result.current.userInteractedRef.current = true;
    if (reason === 'inactive') rerender({ ...args, isActive: false });
    await act(async () => resolve({ location: berlin, error: null }));
    expect(args.camera.flyToSpot).not.toHaveBeenCalled();
  });

  it('watches only while active, restarts on foreground and locate, and stops on unmount', async () => {
    const args = harness();
    args.geolocation.permitted = true;
    args.geolocation.location = berlin;
    const { result, rerender, unmount } = renderHook(props => useMapLocationFollow(props), { initialProps: args });
    expect(args.geolocation.watch).toHaveBeenCalledTimes(1);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(args.stop).toHaveBeenCalledTimes(1);
    expect(args.geolocation.watch).toHaveBeenCalledTimes(2);
    await act(async () => { await result.current.locate(); });
    expect(args.geolocation.watch).toHaveBeenCalledTimes(3);
    expect(args.geolocation.request).not.toHaveBeenCalled();
    rerender({ ...args, isActive: false });
    expect(args.stop).toHaveBeenCalledTimes(3);
    rerender(args);
    expect(args.geolocation.watch).toHaveBeenCalledTimes(4);
    unmount();
    expect(args.stop).toHaveBeenCalledTimes(4);
  });

  it('follows fixes after locate and stops when the visitor moves the map', async () => {
    const args = harness();
    const { result, rerender } = renderHook(props => useMapLocationFollow(props), { initialProps: args });
    await act(async () => { await result.current.locate(); });
    const located = { ...args, geolocation: { ...args.geolocation, location: berlin } };
    rerender(located);
    expect(args.camera.flyToSpot).toHaveBeenCalledTimes(1);
    result.current.stopFollowing();
    rerender({ ...located, geolocation: { ...located.geolocation, location: { ...berlin, lat: 52.53 } } });
    expect(args.camera.flyToSpot).toHaveBeenCalledTimes(1);
  });

  it('inside a detail follows only the fix answering the locate click', async () => {
    const args = { ...harness(), detailId: 'spot' };
    const { result, rerender } = renderHook(props => useMapLocationFollow(props), { initialProps: args });
    await act(async () => { await result.current.locate(); });
    rerender({ ...args, geolocation: { ...args.geolocation, location: berlin } });
    rerender({ ...args, geolocation: { ...args.geolocation, location: { ...berlin, lat: 52.53 } } });
    expect(args.camera.flyToSpot).toHaveBeenCalledTimes(1);
  });
});
