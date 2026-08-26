import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/map/cached-sanity', () => ({
  getCachedMapData: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

const verifyIdToken = vi.fn();
const create = vi.fn();
const get = vi.fn();
const doc = vi.fn(() => ({ create, get }));

vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminFirestore: () => ({
    collection: () => ({ doc: () => ({ collection: () => ({ doc }) }) }),
  }),
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'SERVER_TS' },
}));

import { POST } from '@/app/api/claim-spot/route';
import { getCachedMapData } from '@/lib/map/cached-sanity';

function mkReq(body: unknown, token: string | null = 'valid'): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (token) headers.set('authorization', `Bearer ${token}`);
  return new Request('https://example.com/api/claim-spot', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

/** ALREADY_EXISTS — the gRPC code Firestore's create() rejects with. */
function alreadyExists() {
  return Object.assign(new Error('already exists'), { code: 6 });
}

beforeEach(() => {
  vi.clearAllMocks();
  verifyIdToken.mockResolvedValue({ uid: 'u1' });
  create.mockResolvedValue(undefined);
  vi.mocked(getCachedMapData).mockResolvedValue({
    restaurants: [{ _id: 'r-tief', slug: 'tief-im-katalog' }] as never,
    mustEats: [],
    categories: [],
  });
});

describe('POST /api/claim-spot', () => {
  it('grants the tapped spot, whatever tier it sits in', async () => {
    // The whole point of the route: the locked sheet promises THIS spot to
    // anyone signing up, on all ~194 grey dots and not only on the 50 the
    // signed tier happens to cover. The grant is what makes that true.
    const res = await POST(mkReq({ slug: 'tief-im-katalog' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ claimed: true, restaurantId: 'r-tief' });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'spot', restaurantIds: ['r-tief'], source: 'signup' })
    );
  });

  it('gives one spot per account, not one per tap', async () => {
    /* Without the cap a signed-in user walks the map and claims the catalog a
       dot at a time. The doc id IS the cap — the second create() collides. */
    create.mockRejectedValueOnce(alreadyExists());
    get.mockResolvedValueOnce({ data: () => ({ restaurantIds: ['r-first'] }) });

    const res = await POST(mkReq({ slug: 'tief-im-katalog' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      claimed: false,
      reason: 'already_claimed',
      restaurantIds: ['r-first'],
    });
  });

  it('refuses an anonymous caller', async () => {
    const res = await POST(mkReq({ slug: 'tief-im-katalog' }, null));
    expect(res.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses a token it cannot verify', async () => {
    verifyIdToken.mockRejectedValueOnce(new Error('expired'));
    const res = await POST(mkReq({ slug: 'tief-im-katalog' }));
    expect(res.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it('resolves the slug against the catalog instead of trusting the body', async () => {
    // The body is user-editable. An unchecked id would write an entitlement
    // for something that is not a restaurant at all.
    const res = await POST(mkReq({ slug: 'gibt-es-nicht' }));
    expect(res.status).toBe(404);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a request with no slug', async () => {
    const res = await POST(mkReq({}));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});
