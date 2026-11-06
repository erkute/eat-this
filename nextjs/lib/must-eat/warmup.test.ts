import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const getPublicMustEatIds = vi.fn();
vi.mock('@/lib/map/server-initial-map-data', () => ({
  getPublicMustEatIds: () => getPublicMustEatIds(),
}));

const listIds = vi.fn();
vi.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: () => ({
    collection: () => ({ select: () => ({ get: () => listIds() }) }),
  }),
}));

const renderPrivateMustEatImage = vi.fn();
const primePrivateMustEatImageContent = vi.fn();
const readPrivateMustEatContent = vi.fn();
vi.mock('./private-store', () => ({
  PRIVATE_MUST_EATS_COLLECTION: 'privateMustEats',
  readPrivateMustEatContent: (...args: unknown[]) => readPrivateMustEatContent(...args),
}));
vi.mock('./private-image', () => ({
  primePrivateMustEatImageContent: (...args: unknown[]) => primePrivateMustEatImageContent(...args),
  renderPrivateMustEatImage: (...args: unknown[]) => renderPrivateMustEatImage(...args),
}));

import { warmMustEatImages } from './warmup';

describe('warmMustEatImages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listIds.mockResolvedValue({ docs: [{ id: 'a' }, { id: 'b' }] });
    renderPrivateMustEatImage.mockResolvedValue({});
    readPrivateMustEatContent.mockResolvedValue({ a: {}, b: {} });
  });

  // Prod 26.09.2026: auf zwei von drei frischen Instanzen lief die
  // Sanity-Abfrage ins Zeitlimit und riss den ganzen Lauf mit.
  it('waermt Firestore und Bucket auch, wenn Sanity scheitert', async () => {
    getPublicMustEatIds.mockRejectedValue(new Error('Socket timed out'));

    await expect(warmMustEatImages()).resolves.toEqual({ cards: 2 });
    expect(renderPrivateMustEatImage).toHaveBeenCalledOnce();
  });

  // Ein Original weckt den Bucket; die uebrigen holt die Route bei Bedarf.
  // Variante null heisst: kein sharp auf der frischen Instanz.
  it('laedt alle Dokumente in einem Rutsch, aber nur ein Original', async () => {
    const ids = Array.from({ length: 100 }, (_, i) => `card-${i}`);
    listIds.mockResolvedValue({ docs: ids.map(id => ({ id })) });
    await warmMustEatImages();
    expect(readPrivateMustEatContent).toHaveBeenCalledExactlyOnceWith(ids);
    expect(primePrivateMustEatImageContent).toHaveBeenCalledOnce();
    expect(renderPrivateMustEatImage.mock.calls.map(([id, variant]) => [id, variant])).toEqual([
      ['card-0', null],
    ]);
    expect(primePrivateMustEatImageContent.mock.invocationCallOrder[0]).toBeLessThan(renderPrivateMustEatImage.mock.invocationCallOrder[0]);
  });

  it('meldet einen gescheiterten Bucket-Abruf, statt zu werfen', async () => {
    renderPrivateMustEatImage.mockRejectedValue(new Error('bucket down'));
    await expect(warmMustEatImages()).resolves.toEqual({ cards: 2, firstError: 'Error: bucket down' });
  });

  it('tut ohne Karten nichts weiter', async () => {
    listIds.mockResolvedValue({ docs: [] });
    await expect(warmMustEatImages()).resolves.toEqual({ cards: 0 });
    expect(readPrivateMustEatContent).not.toHaveBeenCalled();
    expect(renderPrivateMustEatImage).not.toHaveBeenCalled();
  });
});
