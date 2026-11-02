// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InitialMapData } from './server-initial-map-data';

const mocks = vi.hoisted(() => ({ readMapCache: vi.fn() }));
vi.mock('@/lib/firebase/config', () => ({ auth: { currentUser: null }, getDb: vi.fn() }));
vi.mock('./map-data-cache', () => ({
  readMapCache: mocks.readMapCache,
  seedUidBeforeAuth: () => 'expired-account',
  writeMapCache: vi.fn(),
}));
import { useMapData } from './useMapData';

const initialMapData: InitialMapData = {
  restaurants: [], categories: [], totalCount: 0,
  mustEats: [{ _id: 'public-card', dish: 'Public dish', restaurant: { _id: 'r', name: 'Spot', slug: 'spot', lat: 52, lng: 13 } }],
  revealedMustEatIds: ['public-card'],
};

describe('useMapData anonymous auth reconciliation', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({ ok: true, json: async () => initialMapData });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('replaces a seeded account cache when auth resolves anonymous', async () => {
    mocks.readMapCache.mockReturnValue({
      ...initialMapData,
      mustEats: initialMapData.mustEats.map(({ dish: _dish, ...metadata }) => metadata),
      revealedMustEatIds: [], fullCatalog: true,
    });
    const { result, rerender } = renderHook(
      ({ authLoading }) => useMapData({ uid: null, authLoading, initialMapData }),
      { initialProps: { authLoading: true } }
    );
    expect(result.current.dataUid).toBe('expired-account');
    expect(fetchMock).not.toHaveBeenCalled();
    rerender({ authLoading: false });
    await waitFor(() => expect(result.current.dataUid).toBeNull());
    expect(result.current.mustEats[0].dish).toBe('Public dish');
    expect(result.current.revealedMustEatIds.has('public-card')).toBe(true);
    expect(result.current.fullCatalog).toBe(false);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('keeps the SSR fetch optimization when no account cache was seeded', () => {
    mocks.readMapCache.mockReturnValue(null);
    const { result } = renderHook(() => useMapData({ uid: null, authLoading: false, initialMapData }));
    expect(result.current.mustEats[0].dish).toBe('Public dish');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
