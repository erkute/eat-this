// Server-only. Do not import this from a client component — firebase-admin
// pulls Node-only modules and will break the browser build.

import { getAdminFirestore } from './admin';

export interface Entitlement {
  /** 'starter' ist kein Kauf, sondern das, was eine Anmeldung mitbringt —
   *  Karten, keine Kategorie und nicht die ganze Stadt. Es traegt seinen
   *  Bestand allein in `mustEatIds`, die reduceEntitlements wie jeden anderen
   *  vereinigt. Siehe app/api/starter-pack/route.ts. */
  type: 'category' | 'all-berlin' | 'starter';
  slug: string | null;
  mustEatIds: string[];
  purchasedAt: FirebaseFirestore.Timestamp;
  stripeSessionId: string | null;
  source: 'stripe' | 'manual' | 'signup';
}

interface ResolvedEntitlements {
  isAdmin: boolean;
  hasAllBerlin: boolean;
  /** Gekaufte Kategorien. Sie werden LIVE gegen den Katalog aufgeloest, damit
   *  eine spaeter erscheinende Karte in einem gekauften Pack mitkommt — der
   *  `mustEatIds`-Schnappschuss unten haelt nur fest, was es beim Kauf gab. */
  categorySlugs: Set<string>;
  /** Einzelkarten: der Kauf-Schnappschuss und die Karten aus Einladungen. */
  mustEatIds: Set<string>;
}

const EMPTY_RESOLVED = (): ResolvedEntitlements => ({
  isAdmin: false,
  hasAllBerlin: false,
  categorySlugs: new Set(),
  mustEatIds: new Set(),
});

// Pure reducer — exported separately so it's testable without mocking Firestore.
// `bonuses` carries the cards a referral awarded; they union into the same set
// a purchase writes, because a card is a card wherever it came from.
export function reduceEntitlements(
  docs: Entitlement[],
  bonuses: { mustEatIds?: string[] }[] = []
): ResolvedEntitlements {
  const out = EMPTY_RESOLVED();
  for (const data of docs) {
    if (data.type === 'all-berlin') {
      out.hasAllBerlin = true;
    } else if (data.type === 'category' && data.slug) {
      out.categorySlugs.add(data.slug);
    }
    for (const id of data.mustEatIds ?? []) out.mustEatIds.add(id);
  }
  for (const b of bonuses) {
    for (const id of b.mustEatIds ?? []) out.mustEatIds.add(id);
  }
  return out;
}

export function isAdminEmail(email: string | null): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

// Identity attributes derived from a verified Firebase ID token (or, for
// server-side lookups, from a UserRecord). These drive the admin decision.
interface TokenIdentity {
  email?: string | null;
  // From the ID token's `email_verified` claim / UserRecord.emailVerified.
  emailVerified?: boolean;
  // The `admin` custom claim, set out-of-band for trusted operators
  // (see scripts/set-admin-claims.ts).
  admin?: boolean;
}

// Authoritative admin check. SECURITY: never trust the `email` claim on its
// own — Email/Password and unverified signups let a caller pick an arbitrary
// (unverified) email, which would otherwise hand them admin + all-berlin.
// Admin is granted only via the `admin` custom claim, or a *verified* email
// present in ADMIN_EMAILS (kept as a bootstrap path so the operator keeps
// access before claims are provisioned — Google / magic-link both yield
// email_verified === true).
export function isAdminToken(id: TokenIdentity): boolean {
  if (id.admin === true) return true;
  return id.emailVerified === true && isAdminEmail(id.email ?? null);
}

// Firestore-reading wrapper. Anonymous users (uid === null) get an empty
// resolved view: sie sehen die ganze Karte, nur eben keine eigenen Karten.
export async function resolveEntitlements(
  uid: string | null,
  identity: TokenIdentity = {}
): Promise<ResolvedEntitlements> {
  if (!uid) return EMPTY_RESOLVED();

  if (isAdminToken(identity)) {
    return { ...EMPTY_RESOLVED(), isAdmin: true, hasAllBerlin: true };
  }

  const userRef = getAdminFirestore().collection('users').doc(uid);
  const [entSnap, bonusSnap] = await Promise.all([
    userRef.collection('entitlements').get(),
    userRef.collection('referralBonuses').get(),
  ]);

  const docs = entSnap.docs.map((d) => d.data() as Entitlement);
  const bonuses = bonusSnap.docs.map((d) => ({
    mustEatIds: (d.data().mustEatIds ?? []) as string[],
  }));
  return reduceEntitlements(docs, bonuses);
}

/**
 * Gehoert dieses Restaurant zu einer gekauften Kategorie?
 *
 * EIN gemeinsames Tag reicht — ein Spot, der `lunch` UND `breakfast` traegt,
 * kommt in beiden Packs vor. Genau dieselbe Regel zaehlt `packContentsQuery`
 * fuer die Zahl auf der Pack-Karte; laufen die beiden auseinander, ist die
 * Zahl eine Luege, die ein Kaeufer nachpruefen kann.
 *
 * Der Vorgaenger hiess `isRestaurantVisible` und entschied, ob ein Spot auf
 * der Karte auftaucht. Das entscheidet niemand mehr — die Karte ist frei; was
 * hier haengt, sind die KARTEN dieses Spots.
 */
export function ownsCategoryOf(
  r: { categories?: { slug: string }[] },
  ent: Pick<ResolvedEntitlements, 'categorySlugs'>
): boolean {
  return r.categories?.some((c) => ent.categorySlugs.has(c.slug)) ?? false;
}
