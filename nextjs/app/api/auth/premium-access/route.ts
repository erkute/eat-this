import { NextResponse, type NextRequest } from 'next/server';

import { verifyBearer } from '@/lib/firebase/bearerAuth';
import { isAdminToken } from '@/lib/firebase/entitlements';
import {
  clearPremiumAccessCookie,
  premiumAccessBelongsTo,
  premiumAccessCookieName,
} from '@/lib/must-eat/premium-access';
import { clearPremiumSessionCookie, setPremiumSessionCookie } from '@/lib/must-eat/premium-session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const auth = await verifyBearer(request);
  if (auth.status === 'missing') {
    // Only the same-origin fetch can add this header without a CORS preflight.
    if (
      !request.headers.get('authorization') &&
      request.headers.get('X-EatThis-Action') === 'clear-premium-access'
    ) {
      return clearSession();
    }
    return NextResponse.json({ error: 'auth required' }, { status: 401 });
  }
  if (auth.status === 'invalid') {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 });
  }

  try {
    // Ob der Client den Admin-Eingang (Stats im Burger) zeigen darf. Die
    // Admin-Liste ist server-only; die Seiten unter /admin prüfen selbst
    // noch einmal, das hier schaltet nur die Sichtbarkeit des Links.
    const admin = isAdminToken(auth.identity);
    const response = NextResponse.json({ ok: true, admin });
    response.headers.set('Cache-Control', 'private, no-store');
    // Identity transition is atomic from the browser's perspective: a
    // capability the request carries for another account goes with the old
    // session. One for this account stays: /api/map-data sets it, may run in
    // parallel to this call, and the hourly token refresh lands here too.
    const capability = request.cookies.get(premiumAccessCookieName())?.value;
    if (capability && !premiumAccessBelongsTo(capability, auth.uid)) {
      clearPremiumAccessCookie(response);
    }
    await setPremiumSessionCookie(response, auth.token);
    return response;
  } catch {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 });
  }
}

export async function DELETE() {
  return clearSession();
}

function clearSession() {
  // The client only needs the cookie changes, so there is no body to leave unread.
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Cache-Control', 'private, no-store');
  clearPremiumAccessCookie(response);
  clearPremiumSessionCookie(response);
  return response;
}
