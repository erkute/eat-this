import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  docExists: false,
  created: [] as unknown[],
  createThrows: null as { code: number } | null,
}));

vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => ({ verifyIdToken: mocks.verifyIdToken }),
  getAdminFirestore: () => ({
    collection: () => ({
      doc: () => ({
        collection: () => ({
          doc: () => ({
            get: async () => ({ exists: mocks.docExists }),
            create: async (data: unknown) => {
              if (mocks.createThrows) throw mocks.createThrows;
              mocks.created.push(data);
            },
          }),
        }),
      }),
    }),
  }),
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'ts' },
}));

vi.mock('@/lib/map/cached-sanity', () => ({
  getCachedMapData: async () => ({
    restaurants: [],
    mustEats: Array.from({ length: 30 }, (_, i) => ({
      _id: `m${String(i + 1).padStart(2, '0')}`,
      restaurant: { _id: `r${i}` },
    })),
    categories: [],
  }),
}));

vi.mock('@/lib/firebase/entitlements', () => ({
  resolveEntitlements: async () => ({
    isAdmin: false,
    hasAllBerlin: false,
    categorySlugs: new Set(),
    mustEatIds: new Set(),
    coveredMustEatIds: new Set(),
  }),
}));

vi.mock('@/lib/firebase/unlockedMustEats.server', () => ({
  getUnlockedMustEatIds: async () => new Set<string>(),
}));

const faceUp = vi.hoisted(() => ({ ids: new Set<string>() }));
vi.mock('@/lib/map/visible-restaurants.server', () => ({
  composeAccountSurface: async () => ({
    restaurants: [],
    mustEats: [],
    faceUpIds: faceUp.ids,
    fullCatalog: false,
  }),
}));

import { POST } from '@/app/api/starter-pack/route';
import { STARTER_PACK_CARDS, STARTER_PACK_FACE_UP } from '@/lib/starter-pack';

function req(token: string | null = 'tok'): Request {
  const headers = new Headers();
  if (token) headers.set('authorization', `Bearer ${token}`);
  return new Request('https://x/api/starter-pack', { method: 'POST', headers });
}

beforeEach(() => {
  mocks.verifyIdToken.mockReset();
  mocks.verifyIdToken.mockResolvedValue({ uid: 'u1', email: 'u@x.com' });
  mocks.docExists = false;
  mocks.created = [];
  mocks.createThrows = null;
  faceUp.ids = new Set<string>();
});

describe('/api/starter-pack', () => {
  it('rejects anonymous callers', async () => {
    const res = await POST(req(null));
    expect(res.status).toBe(401);
    expect(mocks.created).toHaveLength(0);
  });

  it('rejects an invalid token', async () => {
    mocks.verifyIdToken.mockRejectedValueOnce(new Error('expired'));
    expect((await POST(req())).status).toBe(401);
  });

  /* Zwanzig Karten, halb offen, halb verdeckt — und die zwei Hälften sind
     disjunkt. Eine Karte, die in beiden Listen steht, wäre offen UND eine
     Aufgabe; das Album zeigte sie dann als erledigt und als ausstehend. */
  it('grants the pack once: half face up, half covered, no overlap', async () => {
    const res = await POST(req());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      granted: true,
      count: STARTER_PACK_CARDS,
      faceUp: STARTER_PACK_FACE_UP,
    });
    const doc = mocks.created[0] as {
      type: string;
      source: string;
      mustEatIds: string[];
      coveredMustEatIds: string[];
    };
    expect(doc.type).toBe('starter');
    expect(doc.source).toBe('signup');
    expect(doc.mustEatIds).toHaveLength(STARTER_PACK_FACE_UP);
    expect(doc.coveredMustEatIds).toHaveLength(STARTER_PACK_CARDS - STARTER_PACK_FACE_UP);
    const all = [...doc.mustEatIds, ...doc.coveredMustEatIds];
    expect(new Set(all).size).toBe(STARTER_PACK_CARDS);
  });

  /* Was ohnehin für jeden offen liegt, ist kein Geschenk — sonst besteht das
     Pack zum Teil aus Karten, die der Beschenkte schon sieht, und fühlt sich
     kleiner an, als es ist. */
  it('never hands out a card that is already face up for this account', async () => {
    faceUp.ids = new Set(['m01', 'm02', 'm03']);

    await POST(req());

    const doc = mocks.created[0] as { mustEatIds: string[]; coveredMustEatIds: string[] };
    const all = [...doc.mustEatIds, ...doc.coveredMustEatIds];
    for (const id of ['m01', 'm02', 'm03']) expect(all).not.toContain(id);
  });

  /* Reicht der Stapel nicht, bekommt die offene Hälfte den Vorrang: lieber
     weniger zu holen als weniger zu sehen. */
  it('gives out what is left when the deck is smaller than the pack', async () => {
    faceUp.ids = new Set(
      Array.from({ length: 22 }, (_, i) => `m${String(i + 1).padStart(2, '0')}`)
    );

    const res = await POST(req());

    expect(await res.json()).toEqual({ granted: true, count: 8, faceUp: 8 });
    const doc = mocks.created[0] as { coveredMustEatIds: string[] };
    expect(doc.coveredMustEatIds).toHaveLength(0);
  });

  it('says "already claimed" instead of granting a second pack', async () => {
    mocks.docExists = true;

    const res = await POST(req());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ granted: false, reason: 'already_claimed' });
    expect(mocks.created).toHaveLength(0);
  });

  /* Der Vorab-Blick oben ist nur eine Abkürzung. Zwei Tabs, die sich
     gleichzeitig anmelden, kommen beide daran vorbei — verbindlich ist das
     `create()`, das auf einem belegten Pfad fehlschlägt. */
  it('holds the line when two sign-ins race past the cheap check', async () => {
    mocks.createThrows = { code: 6 };

    const res = await POST(req());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ granted: false, reason: 'already_claimed' });
  });
});
