import { NextResponse } from 'next/server';

import { getAdminAuth } from '@/lib/firebase/admin';
import { isAdminToken } from '@/lib/firebase/entitlements';
import { clearPremiumAccessCookie } from '@/lib/must-eat/premium-access';
import { clearPremiumSessionCookie, setPremiumSessionCookie } from '@/lib/must-eat/premium-session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: 'auth required' }, { status: 401 });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    // Ob der Client den Admin-Eingang (Stats im Burger) zeigen darf. Die
    // Admin-Liste ist server-only; die Seiten unter /admin prüfen selbst
    // noch einmal, das hier schaltet nur die Sichtbarkeit des Links.
    const admin = isAdminToken({
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified === true,
      admin: decoded.admin === true,
    });
    const response = NextResponse.json({ ok: true, admin });
    response.headers.set('Cache-Control', 'private, no-store');
    // Identity transition is atomic from the browser's perspective: remove
    // the prior user's capability while replacing the verified session.
    clearPremiumAccessCookie(response);
    await setPremiumSessionCookie(response, idToken);
    return response;
  } catch {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.headers.set('Cache-Control', 'private, no-store');
  clearPremiumAccessCookie(response);
  clearPremiumSessionCookie(response);
  return response;
}
