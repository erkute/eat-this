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
  it('waermt die Karten auch, wenn Sanity scheitert', async () => {
    getPublicMustEatIds.mockRejectedValue(new Error('Socket timed out'));

    await expect(warmMustEatImages()).resolves.toEqual({
      cards: 2,
      failedRenders: 0,
      firstError: undefined,
    });
    expect(renderPrivateMustEatImage).toHaveBeenCalledTimes(2);
  });

  it('reads and primes 100 documents in one batch before rendering', async () => {
    const ids = Array.from({ length: 100 }, (_, i) => `card-${i}`);
    listIds.mockResolvedValue({ docs: ids.map(id => ({ id })) });
    await warmMustEatImages();
    expect(readPrivateMustEatContent).toHaveBeenCalledExactlyOnceWith(ids);
    expect(primePrivateMustEatImageContent).toHaveBeenCalledOnce();
    expect(renderPrivateMustEatImage).toHaveBeenCalledTimes(100);
    expect(primePrivateMustEatImageContent.mock.invocationCallOrder[0]).toBeLessThan(renderPrivateMustEatImage.mock.invocationCallOrder[0]);
  });

  it('rechnet nur die 360er vor', async () => {
    getPublicMustEatIds.mockResolvedValue(new Set());

    await warmMustEatImages();

    const widths = renderPrivateMustEatImage.mock.calls.map(([, variant]) => variant.width);
    expect(widths).toEqual([360, 360]);
  });
});
