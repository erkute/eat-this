// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UserLocationProvider, useUserLocationContext } from '../UserLocationContext';

type PositionCallback = (pos: { coords: { latitude: number; longitude: number } }) => void;
type ErrorCallback = (err: { code: number }) => void;

const geo = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};
const permissions = { query: vi.fn() };

function fix(lat: number, lng: number) {
  return { coords: { latitude: lat, longitude: lng } };
}

function wrapper({ children }: { children: ReactNode }) {
  return <UserLocationProvider>{children}</UserLocationProvider>;
}

describe('UserLocationProvider — stille Wiederaufnahme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true });
    Object.defineProperty(navigator, 'permissions', { value: permissions, configurable: true });
  });
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'geolocation');
    Reflect.deleteProperty(navigator, 'permissions');
  });

  /* Der Besucher hat nichts angefragt: die Position kommt, aber weder
     Ladezustand noch Fehler duerfen eine Meldung ausloesen — HubNearby zeigte
     sonst auf jedem Laden „Wir suchen dich" mit Scrim ueber der Seite. */
  it('nimmt eine bestehende Freigabe still auf: Position ja, Ladezustand nein', async () => {
    permissions.query.mockResolvedValue({ state: 'granted' });
    let deliver: PositionCallback = () => {};
    geo.getCurrentPosition.mockImplementation((onFix: PositionCallback) => {
      deliver = onFix;
    });

    const { result } = renderHook(() => useUserLocationContext(), { wrapper });
    await waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1));
    expect(result.current.loading).toBe(false);

    act(() => deliver(fix(52.52, 13.405)));
    expect(result.current.location).toEqual({ lat: 52.52, lng: 13.405 });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('meldet einen Fehler der stillen Wiederaufnahme nicht', async () => {
    permissions.query.mockResolvedValue({ state: 'granted' });
    let fail: ErrorCallback = () => {};
    geo.getCurrentPosition.mockImplementation((_onFix: PositionCallback, onError: ErrorCallback) => {
      fail = onError;
    });

    const { result } = renderHook(() => useUserLocationContext(), { wrapper });
    await waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1));

    act(() => fail({ code: 1 }));
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.location).toBeNull();
  });

  it('zeigt den Ladezustand nur bei einer bewussten Anfrage', async () => {
    permissions.query.mockResolvedValue({ state: 'prompt' });
    let deliver: PositionCallback = () => {};
    geo.getCurrentPosition.mockImplementation((onFix: PositionCallback) => {
      deliver = onFix;
    });

    const { result } = renderHook(() => useUserLocationContext(), { wrapper });
    await waitFor(() => expect(permissions.query).toHaveBeenCalled());
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();

    act(() => {
      void result.current.request();
    });
    expect(result.current.loading).toBe(true);

    act(() => deliver(fix(52.5, 13.4)));
    expect(result.current.loading).toBe(false);
    expect(result.current.location).toEqual({ lat: 52.5, lng: 13.4 });
  });
});
