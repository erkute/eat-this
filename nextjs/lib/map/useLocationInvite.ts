'use client';
import { useEffect, useState } from 'react';

import { getGeolocationPermissionState } from './useUserLocation';

/**
 * The cookie gate locks the whole page while it is up (CookieConsent puts this
 * attribute on <html> and app/globals.css hangs the overflow lock off it), and
 * it asks first. A control unfolding a label underneath a modal is motion
 * nobody can act on, so the two queue instead of stacking.
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
 * Whether the locate control should say its own name.
 *
 * Kept as a pure function because this is the whole difference between a
 * control that introduces itself and one that nags. It fails closed at both
 * ends: a grant means a fix is already on its way in, so the label would
 * unfold and collapse again for nothing; a denial means they answered, and a
 * label cannot reopen that door.
 *
 * 'unknown' — pre-16 Safari and anything else without the Permissions API —
 * still gets the label. There a denial is indistinguishable from an unanswered
 * prompt, and a tap that lands on a standing denial resolves into the
 * "Blockiert. Im Browser erlauben." notice, which beats staying mute.
 */
export function mayInviteLocation(state: 'granted' | 'denied' | 'prompt' | 'unknown'): boolean {
  return state === 'prompt' || state === 'unknown';
}

/**
 * Gate for the locate control's label. Resolves after mount — both inputs are
 * browser-only — so the label is never server-rendered and cannot mismatch on
 * hydration.
 *
 * Reading the permission state never raises a dialog. That is the entire
 * reason the map is allowed to consult it before the visitor has asked for
 * anything: see hasGeolocationPermission on why an unprompted ask is a one-way
 * door on iOS.
 */
export function useLocationInvite(): boolean {
  const [allowed, setAllowed] = useState(false);
  const consentGateClosed = useConsentGateClosed();

  useEffect(() => {
    let cancelled = false;
    void getGeolocationPermissionState().then((state) => {
      if (!cancelled) setAllowed(mayInviteLocation(state));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return allowed && consentGateClosed;
}
