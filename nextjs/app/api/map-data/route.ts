import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { resolveEntitlements } from '@/lib/firebase/entitlements';
import { getCachedMapData } from '@/lib/map/cached-sanity';
import { getFreeSurfaceData } from '@/lib/map/free-surface';
import { composeAccountSurface } from '@/lib/map/visible-restaurants.server';
import { stripCoveredMustEats } from '@/lib/map/stripCoveredMustEats';
import { stripLockedRestaurants } from '@/lib/map/stripLockedRestaurant';
import { getUnlockedMustEatIds } from '@/lib/firebase/unlockedMustEats.server';
import { hydrateAuthorizedMustEats } from '@/lib/must-eat/private-store';
import { clearPremiumAccessCookie, setPremiumAccessCookie } from '@/lib/must-eat/premium-access';

// Per-user response. Disable framework-level caching; the expensive Sanity
// fetch is shared via the module-level cache in cached-sanity.ts.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  let uid: string | null = null;
  let identity: Parameters<typeof resolveEntitlements>[1] = {};
  if (token) {
    try {
      const decoded = await getAdminAuth().verifyIdToken(token);
      uid = decoded.uid;
      identity = {
        email: decoded.email ?? null,
        emailVerified: decoded.email_verified === true,
        admin: decoded.admin === true,
      };
    } catch {
      // Expired/invalid token → treat as anonymous.
    }
  }

  const [ent, unlockedIds, [{ restaurants: all, mustEats: allMustEats, categories }, freeSurface]] =
    await Promise.all([
      resolveEntitlements(uid, identity),
      // On-site reveals — they keep their must-eats face-up in the payload.
      uid ? getUnlockedMustEatIds(uid) : Promise.resolve(new Set<string>()),
      Promise.all([getCachedMapData(), getFreeSurfaceData()]),
    ]);

  // Wer was sieht, entscheidet composeAccountSurface — dieselbe Ableitung, die
  // auch die oeffentliche Deck-Seite benutzt. Diese Route formt daraus nur noch
  // die Antwort.
  const surface = await composeAccountSurface({
    all,
    allMustEats,
    ent,
    uid,
    freeRestaurantIds: freeSurface.restaurantIds,
    unlockedIds,
  });

  // Admin / all-berlin: full catalog, no filter, no reveal signal (signed
  // & paid users get individual reveals via Firestore unlockedMustEats).
  if (surface.fullCatalog) {
    if (!uid) {
      return NextResponse.json({ error: 'auth required' }, { status: 401 });
    }
    const hydratedMustEats = await hydrateAuthorizedMustEats(surface.mustEats, surface.faceUpIds);
    const res = NextResponse.json({
      restaurants: surface.restaurants,
      mustEats: hydratedMustEats,
      categories,
      totalCount: all.length,
      lockedRestaurants: [],
      revealedMustEatIds: Array.from(surface.faceUpIds),
      // Der Client kann das nicht selbst entscheiden. Der Admin-Zugang haengt
      // an ADMIN_EMAILS plus verifizierter Adresse (isAdminToken) — beides
      // server-only —, und das Konto, das ihn nutzt, hat weder einen
      // admin-Claim noch ein Entitlement-Dokument. Das Profil las bisher nur
      // users/<uid>/entitlements und zeigte deshalb „466 von 466 Spots" ueber
      // zehn verschlossenen Packs: zwei Wahrheiten auf einem Bildschirm.
      // WARUM nicht, sondern nur DASS alles offen ist — mehr braucht die
      // Oberflaeche nicht, und der Grund geht sie nichts an.
      fullCatalog: true,
    });
    res.headers.set('Cache-Control', 'private, no-store');
    setPremiumAccessCookie(res, surface.faceUpIds, uid);
    return res;
  }

  // Alles, was nicht offen liegt, geht gestrippt raus — verdeckte Karten
  // rendern nur den Kartenruecken, die bezahlten Felder duerfen den Server
  // nicht verlassen.
  const hydratedMustEats = await hydrateAuthorizedMustEats(surface.mustEats, surface.faceUpIds);

  const res = NextResponse.json({
    restaurants: surface.restaurants,
    mustEats: stripCoveredMustEats(hydratedMustEats, surface.faceUpIds),
    categories,
    totalCount: all.length,
    lockedRestaurants: stripLockedRestaurants(surface.lockedRestaurants),
    // Client face-up state must be identical to the IDs hydrated above.
    // Otherwise purchased content reaches the browser but still renders as a
    // covered card because entitlements are not duplicated into reveal docs.
    revealedMustEatIds: Array.from(surface.faceUpIds),
    // Hier immer false: der Zweig oben faengt Admin UND all-berlin ab.
    fullCatalog: false,
  });
  res.headers.set('Cache-Control', 'private, no-store');
  if (uid) {
    setPremiumAccessCookie(res, surface.faceUpIds, uid);
  } else {
    clearPremiumAccessCookie(res);
  }
  return res;
}
