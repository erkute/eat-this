import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { resolveEntitlements } from '@/lib/firebase/entitlements';
import { getCachedMapData } from '@/lib/map/cached-sanity';
import { composeAccountSurface } from '@/lib/map/visible-restaurants.server';
import { getUnlockedMustEatIds, unlockMustEat } from '@/lib/firebase/unlockedMustEats.server';
import { checkWindowedRateLimit } from '@/lib/rateLimitWindow';
import { hydrateAuthorizedMustEats } from '@/lib/must-eat/private-store';
import { setPremiumAccessCookie } from '@/lib/must-eat/premium-access';

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Any signed-in account may reveal a card, without a purchase check.
// The browser checks the 50 m proximity; the server enforces account limits.
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'auth required' }, { status: 401 });
  }

  let uid: string;
  let identity: Parameters<typeof resolveEntitlements>[1] = {};
  try {
    const decoded = await getAdminAuth().verifyIdToken(token, true);
    uid = decoded.uid;
    identity = {
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified === true,
      admin: decoded.admin === true,
    };
  } catch {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 });
  }

  // Fail closed when the account quota cannot be checked: 10/minute, 15/day.
  const limit = await checkWindowedRateLimit(
    `reveal:${uid}`,
    {
      perMinute: num(process.env.MUST_EAT_REVEAL_LIMIT_PER_MIN, 10),
      perDay: num(process.env.MUST_EAT_REVEAL_LIMIT_PER_DAY, 15),
    },
    'deny'
  );
  if (!limit.allowed) {
    return NextResponse.json({ error: 'rate_limited', reason: limit.reason }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const mustEatId = typeof body?.mustEatId === 'string' ? body.mustEatId : null;
  if (!mustEatId) {
    return NextResponse.json({ error: 'mustEatId required' }, { status: 400 });
  }

  const [{ restaurants: all, mustEats: allMustEats }, ent, unlockedIds] = await Promise.all([
    getCachedMapData(),
    resolveEntitlements(uid, identity),
    getUnlockedMustEatIds(uid),
  ]);

  const mustEat = allMustEats.find((m) => m._id === mustEatId);
  if (!mustEat) {
    return NextResponse.json({ error: 'unknown must-eat' }, { status: 404 });
  }

  // Preserve existing access and add the newly revealed card.
  const surface = await composeAccountSurface({ all, allMustEats, ent, unlockedIds });

  /* Die gerade aufgedeckte Karte kommt dazu — im Admin-Zweig liegt sie
     ohnehin schon drin. */
  const accessIds = new Set([...surface.faceUpIds, mustEatId]);

  const [hydratedMustEat] = await hydrateAuthorizedMustEats([mustEat], new Set([mustEatId]));
  await unlockMustEat(uid, mustEat);

  const res = NextResponse.json({ mustEat: hydratedMustEat });
  res.headers.set('Cache-Control', 'private, no-store');
  setPremiumAccessCookie(res, accessIds, uid);
  return res;
}
