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
 * 'unknown' means the browser would not say — the Permissions API or its
 * geolocation descriptor is missing. It is NOT a synonym for 'prompt': callers
 * must treat it as "no information" and fail closed on anything that could
 * raise a dialog.
 */
export type GeolocationPermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

/**
 * This origin's geolocation permission, read WITHOUT prompting.
 *
 * Safari ships navigator.permissions from 16.0; where the API or the
 * geolocation descriptor is missing this reports 'unknown' rather than
 * guessing.
 */
export async function getGeolocationPermissionState(): Promise<GeolocationPermissionState> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown';
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    return 'unknown';
  }
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
 * Every non-'granted' state — 'denied', 'prompt' and 'unknown' alike — is
 * false here: never prompt on a guess.
 */
export async function hasGeolocationPermission(): Promise<boolean> {
  return (await getGeolocationPermissionState()) === 'granted';
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
  /**
   * Keep `location` moving. Returns the stop function.
   *
   * `request` is a single fix, and the first fix a phone hands out is the
   * cheap one — the last known position, or a Wi-Fi/cell estimate a few
   * hundred metres off. The map stored that once and never asked again, so
   * someone who opened the map on the way and then walked INTO the spot was
   * still measured against the position from the U-Bahn: "too far", with no
   * tap that would refresh it (the card only asks while there is NO fix, and
   * the locate button just flies to the stale one). Watching lets the phone
   * hand over the GPS fix as soon as it has one and follow the visitor to the
   * door.
   *
   * Silent by design: a watcher error must not raise the status toast — the
   * visitor did not ask right now — and it never touches `loading`. Only
   * start it once this origin already holds the permission (a `location` on
   * hand proves that); watchPosition would otherwise raise the system dialog
   * out of nowhere, see hasGeolocationPermission.
   */
  watch: () => () => void;
}

export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<UserLocationError | null>(null);

  const watch = useCallback((): (() => void) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation?.watchPosition) {
      return () => {};
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        /* A denial that arrives here is only possible when the grant was
           revoked in the meantime; keep the last fix, the next deliberate
           request will report the error itself. */
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

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

  return { location, loading, error, request, watch };
}
