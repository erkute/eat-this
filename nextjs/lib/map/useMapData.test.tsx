// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InitialMapData } from './server-initial-map-data';

const mocks = vi.hoisted(() => ({ readMapCache: vi.fn(), snapshotListeners: [] as (() => void)[] }));
vi.mock('@/lib/firebase/config', () => ({ auth: { currentUser: null }, getDb: vi.fn() }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  onSnapshot: vi.fn((_ref: unknown, listener: () => void) => {
    mocks.snapshotListeners.push(listener);
    return () => {};
  }),
}));
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

describe('useMapData signed-in refetches', () => {
  const fetchMock = vi.fn();
  const accountCard = { ...initialMapData.mustEats[0], _id: 'account-card', dish: 'Account dish' };
  const accountPayload = { ...initialMapData, mustEats: [accountCard], revealedMustEatIds: ['account-card'] };
  function deferredResponse() {
    let resolve!: () => void;
    const promise = new Promise<{ ok: boolean; json: () => Promise<InitialMapData> }>((done) => {
      resolve = () => done({ ok: true, json: async () => accountPayload });
    });
    return { promise, resolve };
  }
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.snapshotListeners.length = 0;
    mocks.readMapCache.mockReturnValue(null);
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows the first account payload while the listener refetch is still running', async () => {
    const first = deferredResponse();
    const second = deferredResponse();
    fetchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useMapData({ uid: 'account', authLoading: false, initialMapData }));
    await waitFor(() => expect(mocks.snapshotListeners.length).toBeGreaterThan(0));
    mocks.snapshotListeners[0]();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    first.resolve();
    await waitFor(() => expect(result.current.dataUid).toBe('account'));
    expect(result.current.revealedMustEatIds.has('account-card')).toBe(true);
    expect(result.current.loading).toBe(true);

    second.resolve();
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('drops a payload that lands after the account signed out', async () => {
    const first = deferredResponse();
    fetchMock.mockReturnValueOnce(first.promise).mockResolvedValue({ ok: true, json: async () => initialMapData });
    const { result, rerender } = renderHook(
      ({ uid }) => useMapData({ uid, authLoading: false, initialMapData }),
      { initialProps: { uid: 'account' as string | null } }
    );
    rerender({ uid: null });
    await waitFor(() => expect(result.current.loading).toBe(false));
    first.resolve();
    await new Promise((done) => setTimeout(done, 0));
    expect(result.current.dataUid).toBeNull();
    expect(result.current.revealedMustEatIds.has('account-card')).toBe(false);
  });

  it('starts the account fetch before the image session is synced and keeps it after', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => accountPayload });
    const { result, rerender } = renderHook(
      ({ authLoading, uid }) =>
        useMapData({ uid, authLoading, firebaseUid: 'account', initialMapData }),
      { initialProps: { authLoading: true, uid: null as string | null } }
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ authLoading: false, uid: 'account' });
    expect(result.current.dataUid).toBe('account');
    expect(result.current.revealedMustEatIds.has('account-card')).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('waits for the account while Firebase has not reported one', () => {
    renderHook(() =>
      useMapData({ uid: null, authLoading: true, firebaseUid: undefined, initialMapData })
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refetches when the same account settles again after a token refresh', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => accountPayload });
    const { rerender } = renderHook(
      ({ authLoading, uid }) =>
        useMapData({ uid, authLoading, firebaseUid: 'account', initialMapData }),
      { initialProps: { authLoading: true, uid: null as string | null } }
    );
    rerender({ authLoading: false, uid: 'account' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

    rerender({ authLoading: true, uid: 'account' });
    rerender({ authLoading: false, uid: 'account' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});

