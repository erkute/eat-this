import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MapMustEat, MapRestaurant } from '@/lib/types';

const state = vi.hoisted(() => ({
  account: {
    uid: 'Z2IJ8CJsEeQVlV5X4TiwhaOE7423',
    email: 'geheim@example.com',
    emailVerified: true,
    displayName: 'Ersan Mustermann',
    photoURL: 'https://lh3.googleusercontent.com/a/secret=s96-c',
    customClaims: undefined as Record<string, unknown> | undefined,
  } as Record<string, unknown> | null,
  avatar: 2 as unknown,
  unlocked: new Set<string>(),
  ent: {
    isAdmin: false,
    hasAllBerlin: false,
    mustEatIds: new Set<string>(),
    restaurantIds: new Set<string>(),
  },
  visibleRestaurants: [] as MapRestaurant[],
  visibleMustEats: [] as MapMustEat[],
  revealed: new Set<string>(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => ({
    getUser: async (uid: string) => {
      if (!state.account) throw new Error('user not found');
      return { ...state.account, uid };
    },
  }),
  getAdminFirestore: () => ({
    collection: () => ({
      doc: () => ({ get: async () => ({ data: () => ({ avatar: state.avatar }) }) }),
    }),
  }),
}));
vi.mock('@/lib/firebase/entitlements', () => ({
  resolveEntitlements: async () => state.ent,
}));
vi.mock('@/lib/firebase/unlockedMustEats.server', () => ({
  getUnlockedMustEatIds: async () => state.unlocked,
}));
vi.mock('@/lib/map/cached-sanity', () => ({
  getCachedMapData: async () => ({ restaurants: ALL_RESTAURANTS, mustEats: ALL_MUST_EATS }),
}));
vi.mock('@/lib/map/free-surface', () => ({
  getFreeSurfaceData: async () => ({ restaurantIds: new Set<string>() }),
}));
vi.mock('@/lib/map/visible-restaurants.server', () => ({
  composeVisibleRestaurants: async () => ({
    restaurants: state.visibleRestaurants,
    mustEats: state.visibleMustEats,
    revealedMustEatIds: state.revealed,
  }),
}));

function restaurant(id: string, district: string): MapRestaurant {
  return {
    _id: id,
    _createdAt: '2026-01-01',
    name: `Spot ${id}`,
    slug: `spot-${id}`,
    isClosed: false,
    bezirk: { name: district },
    lat: 52.5,
    lng: 13.4,
    mustEatCount: 1,
  };
}

/** Aufgedeckte Karten tragen Gericht und Bild — genau das darf nicht raus. */
function mustEat(id: string, restaurantId: string, faceUp = false): MapMustEat {
  const base: MapMustEat = {
    _id: id,
    restaurant: {
      _id: restaurantId,
      name: `Spot ${restaurantId}`,
      slug: `spot-${restaurantId}`,
      lat: 52.5,
      lng: 13.4,
    },
  };
  return faceUp
    ? { ...base, dish: 'Chorizo Verde', image: '/api/must-eat-image/' + id, price: '9,50 €' }
    : base;
}

const ALL_RESTAURANTS = [
  restaurant('r1', 'Kreuzberg'),
  restaurant('r2', 'Kreuzberg'),
  restaurant('r3', 'Mitte'),
];
const ALL_MUST_EATS = [
  mustEat('m1', 'r1'),
  mustEat('m2', 'r1'),
  mustEat('m3', 'r2'),
  mustEat('m4', 'r3'),
];

import { getPublicDeck } from './publicDeck.server';

afterEach(() => {
  state.account = {
    uid: 'Z2IJ8CJsEeQVlV5X4TiwhaOE7423',
    email: 'geheim@example.com',
    emailVerified: true,
    displayName: 'Ersan Mustermann',
    photoURL: 'https://lh3.googleusercontent.com/a/secret=s96-c',
    customClaims: undefined,
  };
  state.avatar = 2;
  state.unlocked = new Set();
  state.ent = {
    isAdmin: false,
    hasAllBerlin: false,
    mustEatIds: new Set(),
    restaurantIds: new Set(),
  };
  state.visibleRestaurants = [];
  state.visibleMustEats = [];
  state.revealed = new Set();
});

const OK_UID = 'Z2IJ8CJsEeQVlV5X4TiwhaOE7423';

describe('getPublicDeck', () => {
  /* Die Seite ist die einzige Stelle, an der Kontodaten an Unangemeldete
     gehen — jedes nutzerbezogene Dokument ist in firestore.rules sonst nur
     fuer seinen Eigentuemer lesbar. Was das Objekt nicht nennt, kann nicht
     versehentlich mitfliegen; dieser Test ist die Liste. */
  it('gibt nur die vereinbarten Felder heraus', async () => {
    state.visibleRestaurants = ALL_RESTAURANTS;
    state.visibleMustEats = ALL_MUST_EATS;

    const deck = await getPublicDeck(OK_UID);

    expect(Object.keys(deck ?? {}).sort()).toEqual([
      'avatar',
      'groups',
      'name',
      'revealed',
      'spotsOpen',
      'spotsTotal',
      'total',
    ]);
  });

  it('traegt weder E-Mail noch Foto-URL noch ein Gericht nach draussen', async () => {
    state.visibleRestaurants = ALL_RESTAURANTS;
    state.visibleMustEats = [mustEat('m1', 'r1', true), mustEat('m2', 'r1')];
    state.revealed = new Set(['m1']);

    const serialized = JSON.stringify(await getPublicDeck(OK_UID), (_k, v) =>
      v instanceof Set ? [...v] : v
    );

    expect(serialized).not.toContain('geheim@example.com');
    expect(serialized).not.toContain('googleusercontent');
    expect(serialized).not.toContain('Chorizo');
    expect(serialized).not.toContain('must-eat-image');
    expect(serialized).not.toContain('9,50');
    // Auch keine Spot-Namen oder -Slugs: wo jemand isst, geht niemanden an.
    expect(serialized).not.toContain('spot-r1');
    expect(serialized).not.toContain('Spot r1');
  });

  /* Das eigene Profil faellt fuer den Vornamen auf die E-Mail zurueck
     (`email.split('@')[0]`). Hier stuende damit der halbe Login oeffentlich
     im Netz. */
  it('leitet den Namen nie aus der E-Mail-Adresse ab', async () => {
    state.account = { ...(state.account as object), displayName: null } as Record<string, unknown>;
    state.visibleRestaurants = ALL_RESTAURANTS;
    state.visibleMustEats = ALL_MUST_EATS;

    const deck = await getPublicDeck(OK_UID);

    expect(deck?.name).toBeNull();
  });

  it('nimmt nur den Vornamen', async () => {
    state.visibleRestaurants = ALL_RESTAURANTS;
    state.visibleMustEats = ALL_MUST_EATS;

    expect((await getPublicDeck(OK_UID))?.name).toBe('Ersan');
  });

  it('zaehlt je Bezirk, was dort aufgedeckt ist', async () => {
    state.visibleRestaurants = ALL_RESTAURANTS;
    state.visibleMustEats = ALL_MUST_EATS;
    state.revealed = new Set(['m1']);
    state.unlocked = new Set(['m4']);

    const deck = await getPublicDeck(OK_UID);

    expect(deck?.groups).toEqual([
      { district: 'Kreuzberg', done: 1, total: 3 },
      { district: 'Mitte', done: 1, total: 1 },
    ]);
    expect(deck?.revealed).toBe(2);
    expect(deck?.total).toBe(4);
  });

  /* Ein leeres Set waere hier still falsch: `isAlbumMustEatCollected` faellt
     sonst auf `m.image` zurueck, und das Bild haengt an einer Hydration, die
     diese Seite nie aufruft — das Deck meldete 0 von 24, waehrend das eigene
     Profil 24 von 24 zeigt. */
  it('zeigt beim Admin-Konto alles offen, so wie es sein eigenes Profil tut', async () => {
    state.ent = { ...state.ent, isAdmin: true, hasAllBerlin: true };

    const deck = await getPublicDeck(OK_UID);

    expect(deck?.spotsOpen).toBe(3);
    expect(deck?.revealed).toBe(4);
    expect(deck?.total).toBe(4);
  });

  /* Dieselbe Antwort fuer eine kaputte uid wie fuer eine, die es nicht gibt —
     die Seite soll nicht melden, welche Konten existieren. */
  it('antwortet auf unbrauchbare und unbekannte uids gleich', async () => {
    expect(await getPublicDeck('kurz')).toBeNull();
    expect(await getPublicDeck('../../etc/passwd')).toBeNull();

    state.account = null;
    expect(await getPublicDeck(OK_UID)).toBeNull();
  });

  it('faellt bei einem kaputten Avatar-Wert auf die erste Figur zurueck', async () => {
    state.avatar = 99;
    state.visibleRestaurants = ALL_RESTAURANTS;
    state.visibleMustEats = ALL_MUST_EATS;

    expect((await getPublicDeck(OK_UID))?.avatar).toBe(1);
  });
});
