'use client';
import { useState, useCallback, useEffect } from 'react';
import { watchLocationUnblock } from './locationHelp';
import { haversineDistance } from './distance';

/** Below this, a watched fix counts as jitter and does not replace `location`. */
const WATCH_MIN_MOVE_M = 3;
/** Without a fix for this long, the watcher is restarted (see `watch`). */
export const WATCH_STALL_MS = 10_000;

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
 * This origin's geolocation permission, read without prompting; 'unknown' where
 * the Permissions API or its geolocation descriptor is missing.
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
 * True only when this origin already holds geolocation permission, i.e.
 * getCurrentPosition raises no dialog.
 *
 * The map auto-locates once on mount. A system prompt on first paint, with
 * nothing on screen to explain it, collects a "Don't Allow" that iOS remembers
 * per site. So the background attempt waits for an existing grant, and asking
 * is left to a tap on the locate button. Every non-'granted' state is false:
 * never prompt on a guess.
 */
export async function hasGeolocationPermission(): Promise<boolean> {
  return (await getGeolocationPermissionState()) === 'granted';
}

interface RequestOptions {
  /**
   * Background attempts (the auto-centre on mount) stay invisible: only a tap
   * on "Mein Standort" may raise the status toast, and iOS remembers a denial
   * per site. The position is still stored on success; only `loading`/`error`
   * stay unreported.
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
   * The first fix a phone hands out is often the cheap one (last known
   * position, Wi-Fi/cell estimate); a visitor who walks into a spot would
   * otherwise still be measured against it. Watching hands over the GPS fix as
   * soon as there is one.
   *
   * Silent: a watcher error never raises the toast or touches `loading`. Start
   * it only once `permitted` is true; watchPosition would otherwise raise the
   * system dialog (see hasGeolocationPermission).
   */
  watch: () => () => void;
  /**
   * True once a request proved the permission is granted: by a fix, or by a
   * timeout/unavailable error, since the browser only starts looking after the
   * visitor said yes. Underground the first request times out, and the watcher
   * still starts.
   */
  permitted: boolean;
}

export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<UserLocationError | null>(null);
  const [permitted, setPermitted] = useState(false);

  const watch = useCallback((): (() => void) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation?.watchPosition) {
      return () => {};
    }
    const geo = navigator.geolocation;
    let id = 0;
    let stallTimer = 0;

    const onFix: PositionCallback = (pos) => {
      armStallTimer();
      const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      /* GPS zittert auch im Stehen um ein paar Meter und liefert dabei im
         Sekundentakt. Jeder neue Fix rendert die ganze Map neu und sortiert
         die Liste nach Entfernung — unterhalb von WATCH_MIN_MOVE_M bleibt
         deshalb das alte Objekt stehen. */
      setLocation((prev) =>
        prev && haversineDistance(prev.lat, prev.lng, next.lat, next.lng) < WATCH_MIN_MOVE_M
          ? prev
          : next
      );
      /* Ein Fix beantwortet einen alten Timeout — sonst stuende „nicht
         gefunden" noch im Zustand, waehrend der Avatar laengst da ist. */
      setError((prev) => (prev === 'denied' ? prev : null));
    };

    /* Timeouts are the tunnel and just wait for the next fix. A denial
       stopped the watcher for good until the next tap — but WebKit also
       reports one with the grant intact (see MapSection.handleLocateMe).
       Only a grant that is really gone drops `permitted`, which stops the
       watcher; otherwise the stall timer restarts it. The last fix stays
       either way, the next deliberate request reports the error itself. */
    const onError: PositionErrorCallback = (err) => {
      if (err.code !== 1) return;
      void getGeolocationPermissionState().then((state) => {
        if (state !== 'granted') setPermitted(false);
      });
    };

    /* iOS Safari lässt einen laufenden Beobachter auch bei offener Karte
       verstummen, ohne Fehler; unterwegs bewegte sich der Avatar dann nicht
       mehr. Ein frischer watchPosition liefert in WebKit sofort die aktuelle
       Position, also startet der Beobachter sich selbst neu, sobald
       WATCH_STALL_MS lang kein Fix kam. Im Hintergrund nicht: Dort liefert iOS
       ohnehin nichts, und MapSection startet ihn bei der Rückkehr neu. */
    function armStallTimer() {
      window.clearTimeout(stallTimer);
      stallTimer = window.setTimeout(() => {
        if (document.visibilityState === 'hidden') return armStallTimer();
        geo.clearWatch(id);
        start();
      }, WATCH_STALL_MS);
    }

    function start() {
      id = geo.watchPosition(onFix, onError, { enableHighAccuracy: true, maximumAge: 0 });
      armStallTimer();
    }

    start();
    return () => {
      window.clearTimeout(stallTimer);
      geo.clearWatch(id);
    };
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
          setPermitted(true);
          if (!silent) setLoading(false);
          resolve({ location: loc, error: null });
        },
        (err) => {
          const typed = mapGeoError(err.code);
          setPermitted(typed !== 'denied');
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

  /* Blockiert ist nicht fuer immer: kommt die Freigabe zurueck (meist aus den
     Einstellungen, siehe locationHelp), holt die Map den Standort selbst —
     der Besucher hat ihn ja eben erst gewollt. Steht sie nur wieder auf
     „fragen", faellt der Fehler weg, und die naechste Geste darf fragen. */
  useEffect(() => {
    if (error !== 'denied') return;
    return watchLocationUnblock((state) => {
      if (state === 'granted') void request();
      else setError(null);
    });
  }, [error, request]);

  return { location, loading, error, request, watch, permitted };
}
