'use client';
import { useEffect, useState } from 'react';

import { getGeolocationPermissionState, type GeolocationPermissionState } from './useUserLocation';

/**
 * Whether the visitor still has an unanswered location question: permission
 * never asked (or unknowable) and no position yet. That is when the map asks
 * once, through the info card (useLocationWelcome), and what the
 * map_location_invite_* funnel counts. A denial gets nothing — they answered —
 * and a grant needs no asking.
 *
 * 'unknown' — pre-16 Safari and anything else without the Permissions API —
 * counts as unanswered: a tap that lands on a standing denial resolves into
 * the "Blockiert. Im Browser erlauben." notice, which beats staying mute.
 *
 * A position ends it: the permission is read once, at mount, so a visitor who
 * starts at 'prompt' and then grants stays 'prompt' here for the rest of the
 * page.
 */
export function isInviteOpen(
  state: 'granted' | 'denied' | 'prompt' | 'unknown',
  located: boolean
): boolean {
  return (state === 'prompt' || state === 'unknown') && !located;
}

/**
 * Resolves after mount — both inputs are browser-only. Reading the permission
 * state never raises a dialog: see hasGeolocationPermission on why an
 * unprompted ask is a one-way door on iOS.
 */
export function useLocationInvite(located: boolean): boolean {
  const [permission, setPermission] = useState<GeolocationPermissionState | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getGeolocationPermissionState().then((state) => {
      if (!cancelled) setPermission(state);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // `null` permission = not read yet. Never guess before the browser answers.
  if (permission === null) return false;
  return isInviteOpen(permission, located);
}
