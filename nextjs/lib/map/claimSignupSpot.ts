'use client';
import { auth } from '@/lib/firebase/config';

/**
 * Claim the locked spot a sign-up started from.
 *
 * Both rungs of the sign-up land here — Google right after the popup resolves,
 * email after the magic link returns to /map (see useSignupSpotClaim). The
 * server allows exactly one claim per account, so calling it twice is safe and
 * the second call simply reports back what the first one took.
 *
 * Nothing reads the return value to refresh the map: the entitlement write
 * lands in Firestore, and the `entitlements` onSnapshot listener in MapSection
 * already refetches on it — the same path a completed purchase takes. The spot
 * therefore leaves the locked set on its own, and the sheet standing open on
 * it swaps from LockedDetail to the real detail in place.
 *
 * Failures are swallowed on purpose. The sign-in itself has succeeded by the
 * time this runs, and the user is looking at a map that just gained fifty
 * spots; an error toast about the bonus one would be the only bad news on the
 * screen. The spot stays locked and keeps its (now signed-in) pack offer.
 */
/**
 * Why a claim did not grant anything.
 *
 * `spent` is the one worth telling the reader about: the account holds its one
 * free spot already, so the sheet's offer — shown while signed out, when it
 * cannot possibly know that — did not come true. Left unsaid it looks like the
 * sign-in silently failed (user report, 2026-08-26).
 */
export type ClaimOutcome = 'granted' | 'spent' | 'failed';

export async function claimSignupSpot(slug: string): Promise<ClaimOutcome> {
  const user = auth.currentUser;
  if (!user) return 'failed';
  try {
    const token = await user.getIdToken();
    const res = await fetch('/api/claim-spot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ slug }),
    });
    if (!res.ok) return 'failed';
    const json = (await res.json()) as { claimed?: boolean; reason?: string };
    if (json.claimed === true) return 'granted';
    return json.reason === 'already_claimed' ? 'spent' : 'failed';
  } catch {
    return 'failed';
  }
}
