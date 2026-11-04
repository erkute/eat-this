import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCachedMapData = vi.fn();
const getCachedMustEats = vi.fn();
vi.mock('./cached-sanity', () => ({
  getCachedMapData: () => getCachedMapData(),
  getCachedMustEats: () => getCachedMustEats(),
}));
vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn }));
vi.mock('@/lib/must-eat/private-store', () => ({
  hydrateAuthorizedMustEats: vi.fn(),
  readPrivateMustEatContent: vi.fn(),
}));

import { getPublicMustEatIds } from './server-initial-map-data';

const CARD = { _id: 'card-a', restaurant: { _id: 'spot-a' }, revealedForAnon: true };

describe('getPublicMustEatIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCachedMustEats.mockResolvedValue([CARD]);
  });

  it('liest nur die Karten, nicht den Spot-Katalog', async () => {
    await expect(getPublicMustEatIds()).resolves.toEqual(new Set(['card-a']));
    expect(getCachedMapData).not.toHaveBeenCalled();
  });

  // Prod 03.11.2026: ~80 Bilder auf einer frischen Instanz, jedes mit eigenen
  // Sanity-Abfragen — alle liefen ins Zeitlimit und endeten als 500.
  it('teilt sich eine Anfrage, solange sie läuft', async () => {
    const results = await Promise.all(Array.from({ length: 80 }, () => getPublicMustEatIds()));

    expect(getCachedMustEats).toHaveBeenCalledTimes(1);
    for (const ids of results) expect(ids.has('card-a')).toBe(true);
  });

  it('fragt nach dem Ende einer Anfrage neu, damit Änderungen ankommen', async () => {
    await getPublicMustEatIds();
    getCachedMustEats.mockResolvedValue([{ ...CARD, _id: 'card-b' }]);

    await expect(getPublicMustEatIds()).resolves.toEqual(new Set(['card-b']));
    expect(getCachedMustEats).toHaveBeenCalledTimes(2);
  });

  it('merkt sich keinen Fehlschlag', async () => {
    getCachedMustEats.mockRejectedValueOnce(new Error('Socket timed out'));
    await expect(getPublicMustEatIds()).rejects.toThrow('Socket timed out');

    await expect(getPublicMustEatIds()).resolves.toEqual(new Set(['card-a']));
  });
});
