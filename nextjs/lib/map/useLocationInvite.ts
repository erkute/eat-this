'use client';
import { useEffect, useState } from 'react';

import {
  getGeolocationPermissionState,
  type GeolocationPermissionState,
} from './useUserLocation';

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
 * How long the label stays out for someone who ALREADY granted.
 *
 * There it is a greeting, not an invitation — the map is already resolving
 * their position, and the label says so while it happens. That makes the
 * duration a floor rather than a delay: a cached GPS fix lands in tens of
 * milliseconds, so binding the collapse straight to the position would flash
 * the label for a frame or two. Long enough to read three words, short enough
 * not to sit in the way of a map the visitor came to use.
 */
export const GREETING_MIN_VISIBLE_MS = 1400;

/**
 * Which of the two the label currently is, or `null` for a bare icon.
 *
 * The caller has to tell them apart, and not only for copy: only an 'invite'
 * belongs in the map_location_invite_* funnel. Counting greetings there would
 * fill the denominator with visitors who never had a decision to make, and the
 * accept rate would drift toward the share of returning users rather than
 * measuring whether the invitation works.
 */
export type LocateLabel = 'invite' | 'greeting' | null;

/**
 * Whether the locate control may say its own name at all.
 *
 * Kept as a pure function because this is the difference between a control
 * that introduces itself and one that nags. A denial is the one state that
 * gets nothing: they answered, and a label cannot reopen that door.
 *
 * 'unknown' — pre-16 Safari and anything else without the Permissions API —
 * counts as unanswered. There a denial is indistinguishable from an open
 * prompt, and a tap that lands on a standing denial resolves into the
 * "Blockiert. Im Browser erlauben." notice, which beats staying mute.
 */
export function mayInviteLocation(state: 'granted' | 'denied' | 'prompt' | 'unknown'): boolean {
  return state !== 'denied';
}

/**
 * Whether the label is still owed screen time.
 *
 * Two different jobs behind one control:
 *   granted → a GREETING. It goes away once the position is in, but never
 *             before the floor, so it cannot flash.
 *   prompt  → an INVITATION. Nothing arrives on its own to end it, so it
 *   unknown   stands until the visitor acts.
 *
 * A position ends BOTH. The permission is read once, at mount, so a visitor
 * who starts at 'prompt' and then grants stays 'prompt' to this function for
 * the rest of the page — without the `located` check the invitation would come
 * back the moment the map finished centring on them and ask where they are
 * while showing them exactly that. The greeting's floor is the one thing a
 * position does not override.
 *
 * A granted visitor whose position never arrives (GPS off indoors, the silent
 * request timing out) keeps the label. That is deliberate: the control has
 * nothing better to say, and a tap on it runs a loud request that surfaces the
 * real error instead of the silence they would otherwise get.
 */
export function isLabelStillOwed(
  state: 'granted' | 'denied' | 'prompt' | 'unknown',
  located: boolean,
  floorElapsed: boolean
): LocateLabel {
  if (state === 'denied') return null;
  if (state === 'granted') return !located || !floorElapsed ? 'greeting' : null;
  return located ? null : 'invite';
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
export function useLocationInvite(located: boolean): LocateLabel {
  const [permission, setPermission] = useState<GeolocationPermissionState | null>(null);
  const [floorElapsed, setFloorElapsed] = useState(false);
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

  /* The floor starts when the label does — which for a granted visitor is the
     moment we learn the permission, not mount, since the label cannot be shown
     before that. Starting it at mount would spend the floor on the permission
     read and let the label flash after all. */
  useEffect(() => {
    if (permission !== 'granted') return;
    const id = window.setTimeout(() => setFloorElapsed(true), GREETING_MIN_VISIBLE_MS);
    return () => window.clearTimeout(id);
  }, [permission]);

  // `null` permission = not read yet. Never guess before the browser answers.
  if (permission === null || !consentGateClosed) return null;
  return isLabelStillOwed(permission, located, floorElapsed);
}
