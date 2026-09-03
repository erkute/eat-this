'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { hasGeolocationPermission, mapGeoError, type UserLocationError } from './useUserLocation';
import { armGhostClickGuard } from './ghostClickGuard';

interface UserLocation {
  lat: number;
  lng: number;
}

interface UserLocationValue {
  location: UserLocation | null;
  loading: boolean;
  error: UserLocationError | null;
  request: (opts?: { prompt?: boolean }) => Promise<UserLocation | null>;
}

const UserLocationContext = createContext<UserLocationValue | null>(null);

/**
 * Shared geolocation state for the hub. A single permission grant (e.g. the
 * "Standort" button in HubNearby) powers every location-aware surface — the
 * nearby rail AND the "Dein Bezirk" greeting pill — instead of each component
 * prompting on its own.
 *
 * On mount we silently resolve the position ONLY if the permission was already
 * granted (Permissions API), so returning users get their real Bezirk without
 * a prompt on load, while first-timers still see the Mitte fallback until they
 * tap the button.
 */
export function UserLocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<UserLocationError | null>(null);

  /* `prompt: false` fuer den stillen Aufruf beim Mounten: dort ist die
     Berechtigung bereits erteilt, es erscheint kein Dialog — und ohne Dialog
     gibt es auch keinen Geisterklick abzufangen.

     Still heisst auch: `loading` und `error` bleiben unberichtet, wie bei
     useUserLocation. Der Besucher hat gerade nichts angefragt — HubNearby
     zeigte sonst auf jedem Laden „Wir suchen dich" als Karte mit Scrim ueber
     der ganzen Seite, nur weil eine alte Freigabe still wieder aufgenommen
     wurde. Die Position selbst wird weiter gespeichert, damit die Nahe-Liste
     und der Bezirks-Gruss stimmen; ein Fehler dabei (widerrufene Freigabe)
     bleibt stumm, die naechste bewusste Anfrage meldet ihn selbst. */
  const request = useCallback(
    ({ prompt = true }: { prompt?: boolean } = {}): Promise<UserLocation | null> => {
      const silent = !prompt;
      return new Promise((resolve) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          if (!silent) setError('unavailable');
          resolve(null);
          return;
        }
        /* Der System-Dialog liegt ueber der Seite; wird er weggetippt, kann der
           Finger an derselben Stelle einen Klick IN der Seite ausloesen. Auf dem
           Telefon liegt dort im Aufmacher der Karten-Knopf, und man landet
           ungewollt auf /map. Der Waechter laeuft, solange der Dialog offen sein
           kann, und noch einen Wimpernschlag danach — er schluckt nur Klicks
           ohne vorausgegangenen `pointerdown`, siehe ghostClickGuard.ts. */
        const disarm = prompt ? armGhostClickGuard() : null;
        const settle = () => {
          if (disarm) window.setTimeout(disarm, 700);
        };
        if (!silent) {
          setLoading(true);
          setError(null);
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setLocation(loc);
            if (!silent) {
              setError(null);
              setLoading(false);
            }
            settle();
            resolve(loc);
          },
          (err) => {
            if (!silent) {
              setError(mapGeoError(err.code));
              setLoading(false);
            }
            settle();
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    },
    []
  );

  /* Resume an existing grant without prompting. Shares hasGeolocationPermission
     with MapSection's auto-centre — the one surface that used to skip this check
     and fired the system dialog on first paint. Permission is per-origin, so a
     prompt on any page would poison it everywhere: both callers stay on the
     same gate. */
  useEffect(() => {
    let cancelled = false;
    void hasGeolocationPermission().then((granted) => {
      if (!cancelled && granted) void request({ prompt: false });
    });
    return () => {
      cancelled = true;
    };
  }, [request]);

  return (
    <UserLocationContext.Provider value={{ location, loading, error, request }}>
      {children}
    </UserLocationContext.Provider>
  );
}

export function useUserLocationContext(): UserLocationValue {
  const ctx = useContext(UserLocationContext);
  if (!ctx) {
    throw new Error('useUserLocationContext must be used within <UserLocationProvider>');
  }
  return ctx;
}
