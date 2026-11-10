'use client';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import { hasGeolocationPermission, type useUserLocation } from './useUserLocation';
import { getUserLocationZoom, type useMapCamera } from './useMapCamera';
import { pollUntilMapReady } from './pollUntilMapReady';

interface Options {
  isActive: boolean;
  detailId: string | null;
  geolocation: ReturnType<typeof useUserLocation>;
  mapRef: RefObject<MapRef | null>;
  camera: Pick<ReturnType<typeof useMapCamera>, 'flyToSpot' | 'getFlyPadding' | 'getFlyPaddingRef'>;
}

/** Owns location watching and the camera's follow mode; deliberate map actions win over late fixes. */
export function useMapLocationFollow({ isActive, detailId, geolocation, mapRef, camera }: Options) {
  const { location, permitted: locationPermitted, request: requestLocation, watch: watchLocation } = geolocation;
  const { flyToSpot, getFlyPadding, getFlyPaddingRef } = camera;
  const userInteractedRef = useRef(false);
  const followingRef = useRef(false);
  const detailOpenRef = useRef(Boolean(detailId));
  detailOpenRef.current = Boolean(detailId);
  const stopFollowing = useCallback(() => { followingRef.current = false; }, []);
  // Watch only with an existing grant, including while waiting for the first fix.
  const [watchRound, setWatchRound] = useState(0);
  useEffect(() => {
    if (!isActive || !locationPermitted) return;
    let stop = watchLocation();
    /* iOS Safari haelt einen Beobachter nach Bildschirmsperre oder
       App-Wechsel oft still, ohne Fehler: er liefert einfach nichts mehr.
       Zurueck im Vordergrund startet er deshalb neu. */
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      stop();
      stop = watchLocation();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
    // watchRound: der Standort-Knopf startet den Beobachter neu (handleLocateMe).
  }, [isActive, locationPermitted, watchLocation, watchRound]);

  // Refresh through the watcher when it is running: WebKit can time out a
  // simultaneous getCurrentPosition. Without a grant/fix, request explicitly.
  const handleLocateMe = useCallback(async () => {
    userInteractedRef.current = true;
    followingRef.current = true;
    if (location) {
      flyToSpot(location, { zoom: getUserLocationZoom(), duration: 600, padding: getFlyPadding() });
    }
    if (location && locationPermitted) {
      setWatchRound((round) => round + 1);
      return;
    }
    await requestLocation();
  }, [location, locationPermitted, requestLocation, flyToSpot, getFlyPadding]);

  // A locate click follows subsequent fixes. Inside a detail it follows just
  // the answering fix; opening a different detail or dragging stops following.
  const followedLocationRef = useRef(location);
  useEffect(() => {
    if (location === followedLocationRef.current) return;
    followedLocationRef.current = location;
    if (!location || !isActive || !followingRef.current) return;
    if (detailOpenRef.current) followingRef.current = false;
    flyToSpot(location, { zoom: getUserLocationZoom(), duration: 800, padding: getFlyPadding() });
  }, [location, isActive, flyToSpot, getFlyPadding]);
  useEffect(() => {
    if (detailId) followingRef.current = false;
  }, [detailId]);

  /* Default camera = the user's position. Request it once on mount and, as
     soon as it resolves, centre the map there — unless the user already
     interacted, a deep-link is steering the camera (?r/?me/?bezirk/?cat all
     set userInteractedRef, but they may consume AFTER the location resolves,
     so check the URL too), or the position is outside Berlin. When the
     location is denied/unavailable the canvas default stays: every spot,
     framed (see initialCamera in useMapCamera). Polls mapRef like the
     deep-link effects — a granted permission can resolve before the canvas
     mounts. */
  const autoLocatedRef = useRef(false);
  useEffect(() => {
    if (!isActive) return;
    if (autoLocatedRef.current) return;
    autoLocatedRef.current = true;
    let cancelled = false;
    let completed = false;
    let cancelPoll = () => {};
    const params = new URLSearchParams(window.location.search);
    const hasDeepLink = ['r', 'me', 'bezirk', 'cat'].some((p) => params.has(p));
    /* Only for an EXISTING grant — otherwise this fires the system permission
       dialog on first paint with no context (see hasGeolocationPermission).
       Silent on top of that, so even a grant that later fails (GPS off, indoors)
       cannot raise a toast nobody asked for; the canvas default, every spot,
       simply stands. Asking is the locate button's job. */
    void hasGeolocationPermission()
      .then((granted) => {
        if (cancelled) return { location: null, error: null };
        if (!granted) {
          completed = true;
          return { location: null, error: null };
        }
        return requestLocation({ silent: true });
      })
      .then(({ location: loc }) => {
        if (cancelled) return;
        if (!loc || hasDeepLink) {
          completed = true;
          return;
        }
        const inBerlin = loc.lat > 52.3 && loc.lat < 52.7 && loc.lng > 12.9 && loc.lng < 13.8;
        if (!inBerlin) {
          completed = true;
          return;
        }
        cancelPoll = pollUntilMapReady({
          mapRef,
          shouldStop: () => userInteractedRef.current,
          onStopped: () => {
            completed = true;
          },
          onTimeout: () => {
            completed = true;
          },
          onReady: () => {
            completed = true;
            followingRef.current = true;
            flyToSpot(loc, { zoom: getUserLocationZoom(), duration: 600, padding: getFlyPaddingRef.current() });
          },
        });
      });
    return () => {
      cancelled = true;
      cancelPoll();
      // Deactivation/unmount before a terminal outcome should not consume the
      // one-shot attempt. A later activation may safely request/centre again.
      if (!completed) autoLocatedRef.current = false;
    };
  }, [isActive, requestLocation, flyToSpot, getFlyPaddingRef, mapRef]);

  const prevActiveRef = useRef(false);
  useEffect(() => {
    const justActivated = isActive && !prevActiveRef.current;
    prevActiveRef.current = isActive;
    if (!justActivated) return;
    if (detailId) return;
    if (!location) return;
    followingRef.current = true;
    flyToSpot(location, { zoom: getUserLocationZoom(), duration: 400, padding: getFlyPadding() });
  }, [isActive, detailId, location, flyToSpot, getFlyPadding]);

  return { locate: handleLocateMe, userInteractedRef, stopFollowing };
}
