// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useUserLocation } from '../useUserLocation';

type PositionCallback = (pos: { coords: { latitude: number; longitude: number } }) => void;

const geo = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

function fix(lat: number, lng: number) {
  return { coords: { latitude: lat, longitude: lng } };
}

describe('useUserLocation.watch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true });
  });
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'geolocation');
  });

  /* Der Kern des Vor-Ort-Fehlers: ein einziger Fix vom Weg dorthin, und die
     50-m-Schranke maß danach für immer gegen diesen Punkt. Der Beobachter
     muss jeden neuen Fix in `location` schreiben. */
  it('keeps location moving with every fix the browser hands over', () => {
    let deliver: PositionCallback = () => {};
    geo.watchPosition.mockImplementation((onFix: PositionCallback) => {
      deliver = onFix;
      return 7;
    });
    const { result } = renderHook(() => useUserLocation());

    let stop: () => void = () => {};
    act(() => {
      stop = result.current.watch();
    });
    expect(geo.watchPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ enableHighAccuracy: true, maximumAge: 0 })
    );

    act(() => deliver(fix(52.52, 13.405)));
    expect(result.current.location).toEqual({ lat: 52.52, lng: 13.405 });

    act(() => deliver(fix(52.5205, 13.4052)));
    expect(result.current.location).toEqual({ lat: 52.5205, lng: 13.4052 });

    act(() => stop());
    expect(geo.clearWatch).toHaveBeenCalledWith(7);
  });

  /* Der Beobachter ist still: er hat nie jemand gefragt, also darf er weder
     den Ladezustand noch den Fehler-Toast anfassen — und der letzte Fix
     bleibt stehen. */
  it('stays silent on a watcher error and keeps the last fix', () => {
    let deliver: PositionCallback = () => {};
    let fail: (err: { code: number }) => void = () => {};
    geo.watchPosition.mockImplementation(
      (onFix: PositionCallback, onError: (err: { code: number }) => void) => {
        deliver = onFix;
        fail = onError;
        return 1;
      }
    );
    const { result } = renderHook(() => useUserLocation());
    act(() => {
      result.current.watch();
    });
    act(() => deliver(fix(52.5, 13.4)));
    act(() => fail({ code: 2 }));

    expect(result.current.location).toEqual({ lat: 52.5, lng: 13.4 });
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('is a no-op without geolocation support', () => {
    Reflect.deleteProperty(navigator, 'geolocation');
    const { result } = renderHook(() => useUserLocation());
    let stop: () => void = () => {};
    act(() => {
      stop = result.current.watch();
    });
    expect(() => stop()).not.toThrow();
    expect(geo.watchPosition).not.toHaveBeenCalled();
  });
});
