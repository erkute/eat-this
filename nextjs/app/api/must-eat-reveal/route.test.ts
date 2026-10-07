// Was /api/must-eat-reveal einem angemeldeten Konto herausgibt. Die Herausgabe
// ist bewusst offen (Betreiber, 02.10.2026; AGENTS.md): wer eine
// Karte anfragt, bekommt sie und ihren Stempel — begrenzt nur über das
// Ratenlimit. Ändert sich das, ändert sich dieser Test mit.
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { MapMustEat } from '@/lib/types';
import { composeRevealedMustEats } from '@/lib/map/revealed-must-eats';

const m = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  resolveEntitlements: vi.fn(),
  getUnlockedMustEatIds: vi.fn(),
  unlockMustEat: vi.fn(),
  hydrate: vi.fn(),
  setCookie: vi.fn(),
  rateLimit: vi.fn(),
  catalog: { restaurants: [] as unknown[], mustEats: [] as unknown[] },
}));

vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => ({ verifyIdToken: m.verifyIdToken }),
}));
vi.mock('@/lib/firebase/entitlements', () => ({
  resolveEntitlements: m.resolveEntitlements,
  ownsCategoryOf: () => false,
}));
vi.mock('@/lib/map/cached-sanity', () => ({
  getCachedMapData: async () => m.catalog,
}));
vi.mock('@/lib/firebase/unlockedMustEats.server', () => ({
  getUnlockedMustEatIds: m.getUnlockedMustEatIds,
  unlockMustEat: m.unlockMustEat,
}));
vi.mock('@/lib/rateLimitWindow', () => ({
  checkWindowedRateLimit: m.rateLimit,
}));
vi.mock('@/lib/must-eat/private-store', () => ({
  hydrateAuthorizedMustEats: m.hydrate,
}));
vi.mock('@/lib/must-eat/premium-access', () => ({
  setPremiumAccessCookie: m.setCookie,
}));

import { POST } from './route';

const card = (i: number): MapMustEat =>
  ({
    _id: `me-${i}`,
    restaurant: { _id: `r-${i}` },
  }) as unknown as MapMustEat;

function reveal(mustEatId: string) {
  return POST(
    new Request('http://localhost/api/must-eat-reveal', {
      method: 'POST',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ mustEatId }),
    })
  );
}

describe('POST /api/must-eat-reveal', () => {
  const cards = Array.from({ length: 8 }, (_, i) => card(i + 1));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    m.catalog = { restaurants: cards.map((c) => c.restaurant), mustEats: cards };
    m.rateLimit.mockResolvedValue({ allowed: true });
    // Ein frisches Gratis-Konto: kein Kauf, kein Starter Pack, kein Stempel.
    m.verifyIdToken.mockResolvedValue({ uid: 'free-user', email: 'a@b.c' });
    m.resolveEntitlements.mockResolvedValue({
      isAdmin: false,
      hasAllBerlin: false,
      categorySlugs: new Set(),
      mustEatIds: new Set(),
      coveredMustEatIds: new Set(),
    });
    m.getUnlockedMustEatIds.mockResolvedValue([]);
    m.hydrate.mockImplementation(async (list: MapMustEat[]) =>
      list.map((c) => ({ ...c, dish: 'Gericht', description: 'Text', price: '9 €' }))
    );
  });

  it('gibt einem Gratis-Konto den Inhalt einer verdeckten Karte und stempelt sie', async () => {
    const covered = cards.find((c) => !composeRevealedMustEats(cards).has(c._id))!;

    const res = await reveal(covered._id);

    expect(res.status).toBe(200);
    expect((await res.json()).mustEat).toMatchObject({ _id: covered._id, dish: 'Gericht' });
    expect(m.hydrate).toHaveBeenCalledWith([covered], new Set([covered._id]));
    expect(m.unlockMustEat).toHaveBeenCalledWith('free-user', covered);
  });

  it('begrenzt je Konto auf 10 in der Minute und 15 am Tag, ohne Zähler gar nicht', async () => {
    await reveal(cards[0]._id);
    expect(m.rateLimit).toHaveBeenCalledWith(
      'reveal:free-user',
      { perMinute: 10, perDay: 15 },
      'deny'
    );
  });

  it('gibt über dem Limit nichts heraus und stempelt nicht', async () => {
    m.rateLimit.mockResolvedValue({ allowed: false, reason: 'day' });

    const res = await reveal(cards[0]._id);

    expect(res.status).toBe(429);
    expect(m.hydrate).not.toHaveBeenCalled();
    expect(m.unlockMustEat).not.toHaveBeenCalled();
  });
});
