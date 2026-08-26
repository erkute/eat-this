'use client';
import { useEffect, useState } from 'react';
import { claimSignupSpot } from './claimSignupSpot';

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
 * meantime. The window is real: auth resolves in a few hundred ms, the claim
 * and the refetch behind it take longer, and in between the reader would be
 * looking at a price tag on the very spot the mail just promised them.
 *
 * The initial value is read from the URL rather than set in the effect, so the
 * flag is true from the first render on. Reading it in the effect left exactly
 * one frame — uid known, claim not yet registered — where the pack offer
 * rendered. It is SSR-safe (null on the server) and cannot mismatch during
 * hydration: at that point the viewer is not signed in yet, and the sheet
 * renders the sign-up branch either way.
 *
 * `claim` is stripped once it has fired; `r` deliberately stays, because
 * MapSection's URL sync owns that param and a refresh should still reopen the
 * spot.
 */
export function useSignupSpotClaim(uid: string | null): string | null {
  const [claimingSlug, setClaimingSlug] = useState<string | null>(pendingSlugFromUrl);

  useEffect(() => {
    if (!uid || !claimingSlug) return;
    let active = true;
    // The helper swallows its own failures, but the catch is not redundant:
    // a rejection escaping .finally() would surface as an unhandled rejection
    // in a page the reader is mid-sign-in on.
    void claimSignupSpot(claimingSlug)
      .catch(() => false)
      .finally(() => {
        const params = new URLSearchParams(window.location.search);
        params.delete('claim');
        const query = params.toString();
        window.history.replaceState(
          window.history.state,
          '',
          `${window.location.pathname}${query ? `?${query}` : ''}`
        );
        // Held until the write is through: the map refetch it triggers is what
        // actually opens the spot, and dropping the flag before that would put
        // the pack offer back on screen for the last stretch of the wait.
        if (active) setClaimingSlug(null);
      });
    return () => {
      active = false;
    };
    // Runs once the uid lands. claimingSlug only ever goes slug → null, and
    // the null case is guarded above, so this cannot re-fire the claim.
  }, [uid, claimingSlug]);

  // Gated on the uid rather than reported raw: a logged-out visitor on a stale
  // `claim=1` URL has no claim running, and would otherwise read "Wir
  // schliessen auf …" on a sheet that is waiting for nothing. Deriving it here
  // instead of clearing it in an effect is also what closes the frame gap —
  // the flag turns true in the very render the uid lands in.
  return uid ? claimingSlug : null;
}
