import { NextResponse } from 'next/server';
import { verifyBearer } from '@/lib/firebase/bearerAuth';
import { resolveEntitlements } from '@/lib/firebase/entitlements';
import { getCachedMapData } from '@/lib/map/cached-sanity';
import { composeAccountSurface } from '@/lib/map/visible-restaurants.server';
import { stripCoveredMustEats } from '@/lib/map/stripCoveredMustEats';
import { getUnlockedMustEatIds } from '@/lib/firebase/unlockedMustEats.server';
import { hydrateAuthorizedMustEats } from '@/lib/must-eat/private-store';
import { clearPremiumAccessCookie, setPremiumAccessCookie } from '@/lib/must-eat/premium-access';

// Per-user response. Disable framework-level caching; the expensive Sanity
// fetch is shared via the module-level cache in cached-sanity.ts.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  // A missing, expired or invalid token means an anonymous caller.
  const auth = await verifyBearer(req);
  const uid = auth.status === 'ok' ? auth.uid : null;
  const identity = auth.status === 'ok' ? auth.identity : {};

  const [ent, unlockedIds, { restaurants: all, mustEats: allMustEats, categories }] =
    await Promise.all([
      resolveEntitlements(uid, identity),
      // On-site reveals — they keep their must-eats face-up in the payload.
      uid ? getUnlockedMustEatIds(uid) : Promise.resolve(new Set<string>()),
      getCachedMapData(),
    ]);

  // Welche KARTEN offen liegen, entscheidet composeAccountSurface — dieselbe
  // Ableitung, die auch die oeffentliche Deck-Seite benutzt. Die Spots selbst
  // sind fuer jeden dieselben, der Stapel auch — mit und ohne Konto. Diese
  // Route formt daraus nur noch die Antwort.
  const surface = await composeAccountSurface({ all, allMustEats, ent, unlockedIds });

  // Admin / all-berlin: full catalog, no filter, no reveal signal (signed
  // & paid users get individual reveals via Firestore unlockedMustEats).
  if (surface.fullCatalog) {
    if (!uid) {
      return NextResponse.json({ error: 'auth required' }, { status: 401 });
    }
    const hydratedMustEats = await hydrateAuthorizedMustEats(allMustEats, surface.faceUpIds);
    const res = NextResponse.json({
      restaurants: surface.restaurants,
      mustEats: hydratedMustEats,
      categories,
      totalCount: all.length,
      revealedMustEatIds: Array.from(surface.faceUpIds),
      // Der Client kann das nicht selbst entscheiden. Der Admin-Zugang hängt an
      // ADMIN_EMAILS plus verifizierter Adresse (isAdminToken), beides
      // server-only, und das Konto, das ihn nutzt, hat weder einen admin-Claim
      // noch ein Entitlement-Dokument. Ohne dieses Feld läse das Profil nur
      // users/<uid>/entitlements und zeigte alle Spots offen über lauter
      // verschlossenen Packs: zwei Wahrheiten auf einem Bildschirm. Nur dass
      // alles offen ist, nicht warum: Mehr braucht die Oberfläche nicht, und
      // der Grund geht sie nichts an.
      fullCatalog: true,
    });
    res.headers.set('Cache-Control', 'private, no-store');
    setPremiumAccessCookie(res, surface.faceUpIds, uid);
    return res;
  }

  // Alles, was nicht offen liegt, geht gestrippt raus — verdeckte Karten
  // rendern nur den Kartenruecken, die bezahlten Felder duerfen den Server
  // nicht verlassen.
  const hydratedMustEats = await hydrateAuthorizedMustEats(allMustEats, surface.faceUpIds);

  const res = NextResponse.json({
    restaurants: surface.restaurants,
    mustEats: stripCoveredMustEats(hydratedMustEats, surface.faceUpIds),
    categories,
    totalCount: all.length,
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
