'use client';
import { useState, useCallback } from 'react';

export interface UserLocation {
  lat: number;
  lng: number;
}

export type UserLocationError = 'denied' | 'unavailable' | 'timeout';

// GeolocationPositionError.code → typed error (1=PERMISSION_DENIED,
// 2=POSITION_UNAVAILABLE, 3=TIMEOUT)
export function mapGeoError(code: number): UserLocationError {
  if (code === 1) return 'denied';
  if (code === 3) return 'timeout';
  return 'unavailable';
}

interface LocationRequestResult {
  location: UserLocation | null;
  error: UserLocationError | null;
}

/**
 * True only when this origin ALREADY holds geolocation permission — i.e. when
 * calling getCurrentPosition raises no dialog.
 *
 * The map auto-locates once on mount to centre on the user. Unguarded, that
 * fired the system permission prompt on first paint with nothing on screen to
 * explain it, which is the reliable way to collect a "Don't Allow" — and iOS
 * remembers that per site, so the feature is then dead for good. Gating the
 * background attempt on an existing grant keeps the auto-centre for everyone
 * who already said yes and leaves the ASKING to a deliberate tap on the locate
 * button, where the intent is unambiguous.
 *
 * Safari ships navigator.permissions from 16.0. Where the API or the
 * geolocation descriptor is missing we report false and simply skip the silent
 * attempt — never prompt on a guess.
 */
export async function hasGeolocationPermission(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return false;
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state === 'granted';
  } catch {
    return false;
  }
}

interface RequestOptions {
  /**
   * Background attempts (the once-per-mount auto-centre) must stay invisible.
   * Only a deliberate tap on "Mein Standort" may raise the status toast — a
   * user who never asked for their position should not be told it failed, and
   * on iOS a denial is remembered per site, so the surfaced error would come
   * back on every single visit with no way to act on it.
   *
   * The position itself is still stored on success, so a silent attempt can
   * centre the map; only `loading`/`error` stay unreported.
   */
  silent?: boolean;
}

interface UseUserLocationResult {
  location: UserLocation | null;
  loading: boolean;
  error: UserLocationError | null;
  request: (options?: RequestOptions) => Promise<LocationRequestResult>;
}

export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<UserLocationError | null>(null);

  const request = useCallback((options?: RequestOptions): Promise<LocationRequestResult> => {
    const silent = options?.silent === true;
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        if (!silent) setError('unavailable');
        resolve({ location: null, error: 'unavailable' });
        return;
      }
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(loc);
          if (!silent) setLoading(false);
          resolve({ location: loc, error: null });
        },
        (err) => {
          const typed = mapGeoError(err.code);
          if (!silent) {
            setError(typed);
            setLoading(false);
          }
          // The promise carries the error so click handlers can react to THIS
          // request without racing the state update (stale closure).
          resolve({ location: null, error: typed });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  return { location, loading, error, request };
}
