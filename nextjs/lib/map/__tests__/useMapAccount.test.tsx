// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapMustEat } from '@/lib/types';
import type { InitialMapData } from '../server-initial-map-data';

const mocks = vi.hoisted(() => ({
  auth: { user: { uid: 'a' } as { uid: string } | null, loading: false },
  dataUid: 'a' as string | null,
  unlock: vi.fn(), merge: vi.fn(), stored: new Set(['private']),
}));
vi.mock('@/lib/auth', () => ({ useAuth: () => mocks.auth }));
vi.mock('../useMapData', () => ({ useMapData: () => ({
  restaurants: [], mustEats: [], categories: [], revealedMustEatIds: new Set<string>(),
  dataUid: mocks.dataUid, fullCatalog: false, loading: false, error: null,
  refetch: vi.fn(), mergeMustEat: mocks.merge,
}) }));
vi.mock('../useUnlockedMustEats', () => ({ useUnlockedMustEats: () => ({ unlockedIds: mocks.stored, unlock: mocks.unlock }) }));
vi.mock('../useFavorites', () => ({ useFavorites: () => ({ favoriteIds: new Set(), toggle: vi.fn() }) }));
vi.mock('../useUserTier', () => ({ useUserTier: () => 'member' }));
import { useMapAccount } from '../useMapAccount';

const full: MapMustEat = {
  _id: 'private', dish: 'Dish',
  restaurant: { _id: 'r', name: 'Spot', slug: 'spot', lat: 52.5, lng: 13.4 },
};
const initial: InitialMapData = {
  restaurants: [], mustEats: [], categories: [], totalCount: 0, revealedMustEatIds: ['public'],
};

describe('useMapAccount viewer lifetime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth = { user: { uid: 'a' }, loading: false };
    mocks.dataUid = 'a';
  });

  it('merges a successful reveal and returns the full card to the selection', async () => {
    mocks.unlock.mockResolvedValue(full);
    const { result } = renderHook(() => useMapAccount(initial));
    await expect(result.current.reveal('private')).resolves.toEqual(full);
    expect(mocks.merge).toHaveBeenCalledExactlyOnceWith(full);
  });

  it.each(['switch', 'loading', 'logout', 'away-and-back'])('discards a pending reveal on %s', async (change) => {
    let resolve!: (card: MapMustEat) => void;
    mocks.unlock.mockImplementation(() => new Promise<MapMustEat>(done => { resolve = done; }));
    const { result, rerender } = renderHook(() => useMapAccount(initial));
    const pending = result.current.reveal('private');
    mocks.auth = change === 'loading'
      ? { user: { uid: 'a' }, loading: true }
      : { user: change === 'logout' ? null : { uid: 'b' }, loading: false };
    rerender();
    if (change === 'away-and-back') {
      mocks.auth = { user: { uid: 'a' }, loading: false };
      rerender();
    }
    await act(async () => resolve(full));
    await expect(pending).resolves.toBeNull();
    expect(mocks.merge).not.toHaveBeenCalled();
  });

  it('keeps public cards face-up while hiding stale account unlocks', () => {
    const { result, rerender } = renderHook(() => useMapAccount(initial));
    expect(result.current.unlockedIds).toEqual(new Set(['public', 'private']));
    mocks.dataUid = 'b';
    rerender();
    expect(result.current.unlockedIds).toEqual(new Set(['public']));
    mocks.dataUid = 'a';
    mocks.auth.loading = true;
    rerender();
    expect(result.current.unlockedIds).toEqual(new Set(['public']));
  });

  it.each([true, false])('does not reveal for guests or pending auth (%s)', async (loading) => {
    mocks.auth = { user: loading ? { uid: 'a' } : null, loading };
    const { result } = renderHook(() => useMapAccount(initial));
    await expect(result.current.reveal('private')).resolves.toBeNull();
    expect(mocks.unlock).not.toHaveBeenCalled();
  });
});
