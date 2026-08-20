import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAll = vi.fn();
const doc = vi.fn((id: string) => ({ id }));

vi.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: () => ({
    collection: () => ({ doc }),
    getAll,
  }),
}));

import { hydrateAuthorizedMustEats } from './private-store';

const metadata = {
  _id: 'm1',
  order: 1,
  restaurant: { _id: 'r1', name: 'R1', slug: 'r1', lat: 52.5, lng: 13.4 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('private Must-Eat hydration', () => {
  it('hydrates only an explicitly authorized ID without exposing a storage URL', async () => {
    getAll.mockResolvedValue([
      {
        id: 'm1',
        data: () => ({
          schemaVersion: 1,
          dish: 'Dish',
          description: 'Beschreibung',
          descriptionEn: 'Description',
          price: '€€',
          restaurantId: 'r1',
          imageObjectPath: 'premium/must-eats/m1/hash.webp',
          imageContentType: 'image/webp',
        }),
      },
    ]);

    const [hydrated] = await hydrateAuthorizedMustEats([metadata], new Set(['m1']));

    expect(hydrated).toMatchObject({
      dish: 'Dish',
      description: 'Beschreibung',
      image: '/api/must-eat-image/m1',
    });
    expect(JSON.stringify(hydrated)).not.toContain('premium/must-eats/');
    expect(JSON.stringify(hydrated)).not.toContain('storage.googleapis.com');
  });

  it('does not read Firestore for a covered card', async () => {
    await expect(hydrateAuthorizedMustEats([metadata], new Set())).resolves.toEqual([metadata]);
    expect(getAll).not.toHaveBeenCalled();
  });

  it('fails closed when private content is missing or points at another restaurant', async () => {
    getAll.mockResolvedValueOnce([{ id: 'm1', data: () => undefined }]);
    await expect(hydrateAuthorizedMustEats([metadata], new Set(['m1']))).rejects.toThrow(
      'Private Must-Eat m1 is missing'
    );

    getAll.mockResolvedValueOnce([
      {
        id: 'm1',
        data: () => ({
          schemaVersion: 1,
          dish: 'Dish',
          description: 'Beschreibung',
          descriptionEn: 'Description',
          price: '€€',
          restaurantId: 'other',
          imageObjectPath: 'premium/must-eats/m1/hash.webp',
          imageContentType: 'image/webp',
        }),
      },
    ]);
    await expect(hydrateAuthorizedMustEats([metadata], new Set(['m1']))).rejects.toThrow(
      'points at the wrong restaurant'
    );
  });

  // getInitialAnonMapData hands in a cached reader that keys on its argument.
  // Sanity's ordering is not part of the authorization, so the same set of
  // cards arriving in another order has to reach the reader identically.
  it('asks an injected reader for the authorized IDs in a stable order', async () => {
    const read = vi.fn().mockResolvedValue({});
    const cards = ['m2', 'm1', 'm3'].map((_id) => ({ ...metadata, _id }));

    await hydrateAuthorizedMustEats(cards, new Set(['m3', 'm1']), read).catch(() => {});
    await hydrateAuthorizedMustEats([...cards].reverse(), new Set(['m1', 'm3']), read).catch(
      () => {}
    );

    expect(read).toHaveBeenNthCalledWith(1, ['m1', 'm3']);
    expect(read).toHaveBeenNthCalledWith(2, ['m1', 'm3']);
    expect(getAll).not.toHaveBeenCalled();
  });
});
