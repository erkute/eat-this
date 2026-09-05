import { describe, expect, it, vi } from 'vitest';
import type { MapMustEat, MapRestaurant } from '@/lib/types';

/* Der Spot-des-Tages zieht Sanity — hier zaehlt nur die Ableitung darum
   herum, also ein fester Wert. */
vi.mock('@/lib/home/spotOfDay.server', () => ({
  getSpotOfDayId: async () => null,
}));

import { composeAccountSurface } from '../visible-restaurants.server';

function restaurant(id: string, mustEatCount = 1): MapRestaurant {
  return {
    _id: id,
    _createdAt: '2026-01-01',
    name: `Spot ${id}`,
    slug: `spot-${id}`,
    lat: 52.5,
    lng: 13.4,
    mustEatCount,
    tierAnon: false,
    tierSigned: false,
  };
}

function mustEat(id: string, restaurantId: string): MapMustEat {
  return {
    _id: id,
    restaurant: {
      _id: restaurantId,
      name: `Spot ${restaurantId}`,
      slug: `spot-${restaurantId}`,
      lat: 52.5,
      lng: 13.4,
    },
  };
}

const ALL = [restaurant('r1'), restaurant('r2'), restaurant('r3')];
const ALL_MUST_EATS = [mustEat('m1', 'r1'), mustEat('m2', 'r2'), mustEat('m3', 'r3')];

const EMPTY_ENT = {
  isAdmin: false,
  hasAllBerlin: false,
  restaurantIds: new Set<string>(),
  categorySlugs: new Set<string>(),
  mustEatIds: new Set<string>(),
};

function compose(over: Record<string, unknown> = {}) {
  return composeAccountSurface({
    all: ALL,
    allMustEats: ALL_MUST_EATS,
    ent: EMPTY_ENT,
    uid: 'user-1',
    freeRestaurantIds: new Set<string>(),
    unlockedIds: new Set<string>(),
    today: '2026-08-31',
    ...over,
  } as Parameters<typeof composeAccountSurface>[0]);
}

/* Diese Ableitung stand bis zum 31.08.2026 zweimal da — in /api/map-data und
   in publicDeck.server.ts — und ist auseinandergelaufen: der Admin-Zweig
   fehlte in der zweiten Kopie, das geteilte Deck meldete „0 von 24", waehrend
   das Profil desselben Kontos „24 von 24" zeigte. Kein Test hielt die beiden
   zusammen. Jetzt gibt es nur noch eine Definition, und hier steht sie fest. */
describe('composeAccountSurface', () => {
  it('gibt dem Admin den ganzen Katalog, und zwar offen', async () => {
    const s = await compose({ ent: { ...EMPTY_ENT, isAdmin: true } });

    expect(s.fullCatalog).toBe(true);
    expect(s.restaurants).toHaveLength(3);
    expect([...s.faceUpIds].sort()).toEqual(['m1', 'm2', 'm3']);
    expect(s.lockedRestaurants).toEqual([]);
  });

  /* All-Berlin ist gekauft, nicht vergeben — muss aber dasselbe ergeben.
     Genau diese zweite Bedingung ist beim Kopieren verloren gegangen. */
  it('behandelt all-berlin wie den Admin', async () => {
    const admin = await compose({ ent: { ...EMPTY_ENT, isAdmin: true } });
    const allBerlin = await compose({ ent: { ...EMPTY_ENT, hasAllBerlin: true } });

    expect(allBerlin.fullCatalog).toBe(admin.fullCatalog);
    expect([...allBerlin.faceUpIds].sort()).toEqual([...admin.faceUpIds].sort());
    expect(allBerlin.restaurants.length).toBe(admin.restaurants.length);
  });

  /* Ein leeres Face-up-Set waere hier still falsch: die Sammlung faellt sonst
     auf `m.image` zurueck, und das haengt an einer Hydration, die nicht jeder
     Aufrufer macht. */
  it('laesst das Face-up-Set des Admins nie leer', async () => {
    const s = await compose({ ent: { ...EMPTY_ENT, isAdmin: true } });

    expect(s.faceUpIds.size).toBe(ALL_MUST_EATS.length);
  });

  it('vereinigt eigene Aufdeckungen und gekaufte Karten', async () => {
    const s = await compose({
      ent: { ...EMPTY_ENT, mustEatIds: new Set(['m2']) },
      unlockedIds: new Set(['m3']),
    });

    expect(s.fullCatalog).toBe(false);
    expect(s.faceUpIds.has('m2')).toBe(true); // gekauft
    expect(s.faceUpIds.has('m3')).toBe(true); // vor Ort aufgedeckt
  });

  it('meldet fuer ein Konto ohne alles keinen vollen Katalog', async () => {
    expect((await compose()).fullCatalog).toBe(false);
  });
});
