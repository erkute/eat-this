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
export async function claimSignupSpot(slug: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  try {
    const token = await user.getIdToken();
    const res = await fetch('/api/claim-spot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ slug }),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { claimed?: boolean };
    return json.claimed === true;
  } catch {
    return false;
  }
}
