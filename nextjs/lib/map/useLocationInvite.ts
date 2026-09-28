'use client';
import { useEffect, useState } from 'react';

import { getGeolocationPermissionState, type GeolocationPermissionState } from './useUserLocation';

/**
 * The cookie gate locks the whole page while it is up (CookieConsent puts this
 * attribute on <html> and app/globals.css hangs the overflow lock off it), and
 * it asks first. An info card asking underneath a modal is a question nobody
 * can answer, so the two queue instead of stacking.
 */
const CONSENT_GATE_ATTR = 'data-consent-gate';

function useConsentGateClosed(): boolean {
  // Starts closed-for-business — assume gated until the DOM says otherwise, so
  // the label can never unfold under the modal on first paint.
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const read = () => setClosed(!document.documentElement.hasAttribute(CONSENT_GATE_ATTR));
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [CONSENT_GATE_ATTR],
    });
    return () => observer.disconnect();
  }, []);

  return closed;
}

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
  const consentGateClosed = useConsentGateClosed();

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
  if (permission === null || !consentGateClosed) return false;
  return isInviteOpen(permission, located);
}
