'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { claimSignupSpot, type ClaimOutcome } from './claimSignupSpot';

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

function stripClaimParam(): void {
  const params = new URLSearchParams(window.location.search);
  if (params.get('claim') !== '1') return;
  params.delete('claim');
  const query = params.toString();
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${query ? `?${query}` : ''}`
  );
}

export interface SignupSpotClaim {
  /** Set while the claim is outstanding — the sheet holds its sign-up branch
   *  and SignInReward shows the wait. */
  claimingSlug: string | null;
  /** How it went, once it is decided. Drives what the reward screen says: a
   *  granted claim gets a count, a spent one gets the reason it did not come
   *  true. */
  outcome: ClaimOutcome | null;
  /** Run the claim for a spot NOW — the Google path. The email path cannot use
   *  this (its sign-in completes on /welcome, in another document); it goes
   *  through the `?claim=1` URL marker instead. Both end up in the same state,
   *  which is the point: the first version let Google claim inline inside
   *  LockedDetail, past this hook — the spot opened, and the reward screen
   *  never learned a sign-up had happened at all ("dachte da kommt ein Info
   *  Screen", user 2026-08-26). One claim per mount; a second call is a no-op,
   *  matching the server's one-claim-per-account rule. */
  startClaim: (slug: string) => void;
}

export function useSignupSpotClaim(
  uid: string | null,
  isSpotOpen: (slug: string) => boolean
): SignupSpotClaim {
  const [claimingSlug, setClaimingSlug] = useState<string | null>(pendingSlugFromUrl);
  const [outcome, setOutcome] = useState<ClaimOutcome | null>(null);

  /* isSpotOpen changes identity with every map payload; going through a ref
     keeps it out of every dependency list without going stale. */
  const isSpotOpenRef = useRef(isSpotOpen);
  isSpotOpenRef.current = isSpotOpen;

  /* One claim per mount, whichever path gets there first. Without this, the
     URL effect below would fire a SECOND POST after startClaim's — the server
     would refuse it as already_claimed, and a granted outcome would be
     clobbered into a spent one. */
  const startedRef = useRef(false);

  const startClaim = useCallback((slug: string) => {
    if (startedRef.current) return;
    startedRef.current = true;
    // Already open — an account this spot's tier covers, or a link used twice.
    // Spending the one claim on it would take it away from a spot that needs
    // it, and there is nothing to wait for either.
    if (isSpotOpenRef.current(slug)) {
      setClaimingSlug(null);
      return;
    }
    setClaimingSlug(slug);
    // The helper resolves its failures into 'failed'; the catch is for a
    // rejection escaping it, which must not surface as unhandled mid-sign-in.
    void claimSignupSpot(slug)
      .catch((): ClaimOutcome => 'failed')
      .then((result) => {
        stripClaimParam();
        setOutcome(result);
        // Only a claim that granted nothing releases here — nothing is coming,
        // so holding the sheet would just delay an offer the reader can act
        // on. A granted one keeps the hold until the map SHOWS the spot (the
        // effect below): releasing on the POST left the write → listener →
        // refetch round trip unguarded, and a pack banner sat on the promised
        // spot for that stretch.
        if (result !== 'granted') setClaimingSlug(null);
      });
  }, []);

  /* The email path: /welcome carried the intent back as `?claim=1`, and this
     fires as soon as the uid lands. */
  useEffect(() => {
    if (!uid || !claimingSlug) return;
    startClaim(claimingSlug);
  }, [uid, claimingSlug, startClaim]);

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
  // `claim=1` URL has no claim running, and would otherwise read a wait on a
  // sheet that is waiting for nothing. Deriving it here instead of clearing it
  // in an effect is also what closes the frame gap — the flag turns true in
  // the very render the uid lands in.
  return { claimingSlug: uid ? claimingSlug : null, outcome, startClaim };
}
