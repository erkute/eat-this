import 'server-only';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { resolveEntitlements } from '@/lib/firebase/entitlements';
import { getUnlockedMustEatIds } from '@/lib/firebase/unlockedMustEats.server';
import { getCachedMapData } from '@/lib/map/cached-sanity';
import { getFreeSurfaceData } from '@/lib/map/free-surface';
import { composeAccountSurface } from '@/lib/map/visible-restaurants.server';
import { UID_SHAPE } from '@/lib/referral/constants';
import { isAlbumMustEatCollected } from './mustEatAlbum';
import { FALLBACK_DISTRICT } from './nextMove';

/** Ein Bezirk der oeffentlichen Ansicht — Name und Staende, sonst nichts. */
export interface PublicDeckGroup {
  district: string;
  done: number;
  total: number;
}

/**
 * Was von einem Deck oeffentlich sichtbar ist.
 *
 * Die Aufzaehlung IST die Zugriffsgrenze: was hier nicht steht, verlaesst den
 * Server nicht. Kein Gericht, kein Bild, keine Notiz, keine Spot-Namen, keine
 * E-Mail. Ein Deck sagt oeffentlich, WIE VIEL jemand hat und WO — nicht, was
 * drauf steht und nicht, wo er isst.
 */
export interface PublicDeck {
  /** Vorname aus dem Anzeigenamen. Null, wenn das Konto keinen gepflegt hat. */
  name: string | null;
  avatar: 1 | 2 | 3;
  spotsOpen: number;
  spotsTotal: number;
  revealed: number;
  total: number;
  groups: PublicDeckGroup[];
}

/* Der Anzeigename kommt aus dem Google-Konto. Nur der erste Teil, und
   ausdruecklich OHNE den Rueckfall auf die E-Mail-Adresse, den das eigene
   Profil benutzt (`(user.email ?? '').split('@')[0]`): dort steht die Adresse
   vor dem eigenen Auge, hier stuende der halbe Login oeffentlich im Netz. */
function firstNameOf(displayName: string | null | undefined): string | null {
  const first = (displayName ?? '').trim().split(/\s+/)[0];
  return first || null;
}

function avatarOf(value: unknown): 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3 ? value : 1;
}

/**
 * Das Deck eines fremden Kontos, so weit es oeffentlich sein darf.
 *
 * Jedes nutzerbezogene Dokument ist in `firestore.rules` ausschliesslich fuer
 * seinen Eigentuemer lesbar — diese Funktion greift bewusst mit dem Admin-SDK
 * daran vorbei und ist damit die einzige Stelle, an der Kontodaten an
 * Unangemeldete gehen. Deshalb baut sie ein eigenes, enges Objekt auf, statt
 * irgendetwas durchzureichen: was `PublicDeck` nicht nennt, kann auch nicht
 * versehentlich mitfliegen.
 *
 * Die bezahlten Felder waeren ohnehin nicht zu holen — `hydrateAuthorizedMustEats`
 * wird hier nie aufgerufen, und die Bildstrecke haengt am HttpOnly-Cookie, das
 * ein fremder Browser nicht hat. Die Grenze steht also doppelt.
 *
 * `null` heisst „gibt es nicht" und fuehrt zu 404 — dieselbe Antwort fuer eine
 * kaputte uid wie fuer eine, die es nicht gibt, damit die Seite nicht zum
 * Melder wird, welche Konten existieren.
 */
export async function getPublicDeck(uid: string): Promise<PublicDeck | null> {
  if (!UID_SHAPE.test(uid)) return null;

  /* Achtung beim Lesen des ausgelieferten HTML im Dev-Server: React serialisiert
     dort JEDEN awaiteten Wert in den Flight-Payload (Async-Debug, `env:"Server"`),
     also auch diesen kompletten UserRecord — mit E-Mail, Google-Foto-URL und
     Anmeldezeiten. Das ist eine Dev-Einrichtung, kein Leck: im Produktionsbau
     ist die Seite 67 statt 244 kB gross und enthaelt von alldem nichts (geprueft
     am 31.08.2026 gegen `build:isolated`). Wer das hier im Dev-HTML findet,
     soll es gegen den Produktionsbau nachmessen, bevor er es fuer einen Fund
     haelt. */
  let account;
  try {
    account = await getAdminAuth().getUser(uid);
  } catch {
    return null;
  }

  /* Dieselbe Identitaet, die /api/map-data aus dem ID-Token liest — hier aus
     dem Konto selbst, weil der Aufrufer ein Fremder ist. Sie entscheidet ueber
     den Admin-Weg, und der gehoert dem Deck, nicht dem Betrachter. */
  const identity = {
    email: account.email ?? null,
    emailVerified: account.emailVerified,
    admin: account.customClaims?.admin === true,
  };

  const [
    ent,
    unlockedIds,
    [{ restaurants: all, mustEats: allMustEats }, freeSurface],
    profileSnap,
  ] = await Promise.all([
    resolveEntitlements(uid, identity),
    getUnlockedMustEatIds(uid),
    Promise.all([getCachedMapData(), getFreeSurfaceData()]),
    getAdminFirestore()
      .collection('users')
      .doc(uid)
      .get()
      .catch(() => null),
  ]);

  /* Dieselbe Ableitung wie /api/map-data — eine Funktion, nicht zwei Kopien.
     Bis zum 31.08.2026 stand die Formel hier ein zweites Mal, und der
     Admin-Zweig fehlte: das geteilte Deck meldete „0 von 24", waehrend das
     Profil desselben Kontos „24 von 24" zeigte. */
  const surface = await composeAccountSurface({
    all,
    allMustEats,
    ent,
    uid,
    freeRestaurantIds: freeSurface.restaurantIds,
    unlockedIds,
  });

  const districtByRest = new Map(
    surface.restaurants.map((r) => [r._id, r.bezirk?.name ?? r.district ?? FALLBACK_DISTRICT])
  );
  const ownedIds = new Set(surface.restaurants.map((r) => r._id));
  const ownedMustEats = surface.mustEats.filter((m) => ownedIds.has(m.restaurant._id));

  const byDistrict = new Map<string, PublicDeckGroup>();
  for (const m of ownedMustEats) {
    const district = districtByRest.get(m.restaurant._id) ?? FALLBACK_DISTRICT;
    const group = byDistrict.get(district) ?? { district, done: 0, total: 0 };
    group.total += 1;
    if (isAlbumMustEatCollected(m, surface.faceUpIds)) group.done += 1;
    byDistrict.set(district, group);
  }
  const groups = [...byDistrict.values()].sort((a, b) =>
    a.district.localeCompare(b.district, 'de')
  );

  return {
    name: firstNameOf(account.displayName),
    avatar: avatarOf(profileSnap?.data()?.avatar),
    spotsOpen: surface.restaurants.length,
    spotsTotal: all.length,
    revealed: groups.reduce((n, g) => n + g.done, 0),
    total: ownedMustEats.length,
    groups,
  };
}
