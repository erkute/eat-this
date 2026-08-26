'use client';
import { useEffect, useState } from 'react';
import { claimSignupSpot } from './claimSignupSpot';

/** How long the sheet waits for the map to catch up before it gives up and
 *  resolves normally. Only a safety net — the refetch is usually a second or
 *  two — but without it a claim whose refetch never lands (offline, a dropped
 *  listener) would strand the reader on a sign-up form they already completed. */
export const CLAIM_HOLD_TIMEOUT_MS = 15_000;

/** The slug the current URL asks to claim, or null. Read synchronously so the
 *  flag is already true on the first render — see below. */
function pendingSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('claim') === '1' ? params.get('r') : null;
}

/**
 * The email half of the sign-up claim.
 *
 * Google can claim the spot inline — the popup resolves and the uid is right
 * there. Email cannot: the sign-in completes on /welcome, in what is routinely
 * a different browser than the one that tapped the dot. The only thing that
 * survives that trip is the continue URL, so LockedDetail writes the intent
 * into it (`?r=<slug>&claim=1`) and this hook cashes it in on arrival.
 *
 * Returns the slug while the claim is outstanding, because the sheet standing
 * open on that spot must NOT fall through to its signed-in pack offer in the
 * meantime.
 *
 * "Outstanding" ends when the SPOT IS OPEN, not when the POST comes back. That
 * distinction is the whole point and the first version got it wrong: releasing
 * on the response left the entitlement write → Firestore listener → map
 * refetch → response round trip running with the hold already gone, so for a
 * second or two the reader watched a pack banner sit on the very spot the mail
 * had just promised them (user report, 2026-08-26). `isSpotOpen` is what the
 * map actually shows, so the hold now spans the real wait.
 *
 * The initial value is read from the URL rather than set in an effect, so the
 * flag is true from the first render on. Reading it in the effect left exactly
 * one frame — uid known, claim not yet registered — where the pack offer
 * rendered. It is SSR-safe (null on the server) and cannot mismatch during
 * hydration: at that point the viewer is not signed in yet, and the sheet
 * renders the sign-up branch either way.
 *
 * `claim` is stripped once the POST has fired; `r` deliberately stays, because
 * MapSection's URL sync owns that param and a refresh should still reopen the
 * spot.
 */
export function useSignupSpotClaim(
  uid: string | null,
  isSpotOpen: (slug: string) => boolean
): string | null {
  const [claimingSlug, setClaimingSlug] = useState<string | null>(pendingSlugFromUrl);

  useEffect(() => {
    if (!uid || !claimingSlug) return;
    // Already open — an account this spot's tier covers, or a link used twice.
    // Spending the one claim on it would take it away from a spot that needs
    // it, and there is nothing to wait for either.
    if (isSpotOpen(claimingSlug)) {
      setClaimingSlug(null);
      return;
    }
    let active = true;
    // The helper swallows its own failures, but the catch is not redundant:
    // a rejection escaping it would surface as an unhandled rejection in a
    // page the reader is mid-sign-in on.
    void claimSignupSpot(claimingSlug)
      .catch(() => false)
      .then((claimed) => {
        const params = new URLSearchParams(window.location.search);
        params.delete('claim');
        const query = params.toString();
        window.history.replaceState(
          window.history.state,
          '',
          `${window.location.pathname}${query ? `?${query}` : ''}`
        );
        // Only a REFUSED claim releases here — nothing is coming, so holding
        // the sheet would just delay an offer the reader can act on. A granted
        // one keeps the hold until the map shows the spot (effect below).
        if (active && !claimed) setClaimingSlug(null);
      });
    return () => {
      active = false;
    };
    // isSpotOpen is deliberately not a dependency: it changes identity on every
    // map payload, and re-running this would re-issue the POST. The guard above
    // only has to be right at the moment the uid lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, claimingSlug]);

  // The release: the spot the reader was promised is now on their map.
  useEffect(() => {
    if (!claimingSlug) return;
    if (isSpotOpen(claimingSlug)) setClaimingSlug(null);
  }, [claimingSlug, isSpotOpen]);

  useEffect(() => {
    if (!claimingSlug) return;
    const id = window.setTimeout(() => setClaimingSlug(null), CLAIM_HOLD_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [claimingSlug]);

  // Gated on the uid rather than reported raw: a logged-out visitor on a stale
  // `claim=1` URL has no claim running, and would otherwise read "Wir
  // schliessen auf …" on a sheet that is waiting for nothing. Deriving it here
  // instead of clearing it in an effect is also what closes the frame gap —
  // the flag turns true in the very render the uid lands in.
  return uid ? claimingSlug : null;
}
