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

/* Blockiert ist nicht fuer immer: gibt der Browser die Freigabe zurueck
   (Chrome meldet das sofort), holt der Hook den Standort selbst — der
   Besucher wollte ihn ja eben. Steht sie nur wieder auf „fragen", faellt der
   Fehler weg, und die naechste Geste darf fragen (siehe locationHelp). */
describe('useUserLocation — Rueckkehr aus der Sperre', () => {
  let setPermission: (state: PermissionState) => void = () => {};

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true });
    const listeners = new Set<() => void>();
    const status = {
      state: 'denied' as PermissionState,
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    };
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: vi.fn(() => Promise.resolve(status)) },
    });
    setPermission = (state) => {
      status.state = state;
      listeners.forEach((fn) => fn());
    };
  });
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'geolocation');
    Reflect.deleteProperty(navigator, 'permissions');
  });

  async function deniedHook() {
    geo.getCurrentPosition.mockImplementationOnce((_ok: unknown, fail: (e: { code: number }) => void) =>
      fail({ code: 1 })
    );
    const hook = renderHook(() => useUserLocation());
    await act(async () => {
      await hook.result.current.request();
    });
    expect(hook.result.current.error).toBe('denied');
    // Der Waechter haengt sich an, sobald die Abfrage der Berechtigung steht.
    await act(async () => {});
    return hook;
  }

  it('holt den Standort selbst, sobald er freigegeben ist', async () => {
    const { result } = await deniedHook();
    geo.getCurrentPosition.mockImplementationOnce((ok: PositionCallback) => ok(fix(52.52, 13.405)));

    await act(async () => setPermission('granted'));

    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(result.current.location).toEqual({ lat: 52.52, lng: 13.405 });
    expect(result.current.error).toBeNull();
  });

  it('nimmt den Fehler weg, wenn wieder gefragt werden darf', async () => {
    const { result } = await deniedHook();

    await act(async () => setPermission('prompt'));

    expect(result.current.error).toBeNull();
    // Gefragt wird erst mit der naechsten Geste, nicht von selbst.
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
  });
});
