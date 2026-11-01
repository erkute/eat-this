// @vitest-environment jsdom
import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapMustEat } from '@/lib/types';
const firebase = vi.hoisted(() => ({ auth: { currentUser: null as null | { uid: string; getIdToken: () => Promise<string> } } }));
vi.mock('@/lib/firebase/config', () => ({ auth: firebase.auth, getDb: async () => ({}) }));
vi.mock('firebase/firestore', () => ({ collection: vi.fn((_db, ...parts: string[]) => ({ path: parts.join('/') })), getDocs: vi.fn(async () => ({ docs: [] })) }));
import { collection } from 'firebase/firestore';
import { useUnlockedMustEats } from './useUnlockedMustEats';
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};
const user = (uid: string) => ({ uid, getIdToken: async () => `token-${uid}` });
beforeEach(() => { localStorage.clear(); firebase.auth.currentUser = user('A'); expect(vi.isMockFunction(collection)).toBe(true); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('account-bound reveal responses', () => {
  it('accepts a current-account reveal and stores it only in that account cache', async () => {
    const card = { _id: 'card', image: '/CURRENT_ACCOUNT_CARD' };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ mustEat: card }), { status: 200 })));
    const page = renderHook(() => useUnlockedMustEats('A'));
    await waitFor(() => expect(page.result.current.loading).toBe(false));
    await act(async () => { expect(await page.result.current.unlock('card')).toEqual(card); });
    expect(page.result.current.unlockedIds.has('card')).toBe(true);
    expect(localStorage.getItem('eatthis_unlocked_v2_A')).toContain('card');
    expect(localStorage.getItem('eatthis_unlocked_v2_B')).toBeNull();
  });

  it('discards a response whose body finishes after switching accounts', async () => {
    const body = deferred<{ mustEat: MapMustEat }>();
    const json = vi.fn(() => body.promise);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json })));
    const page = renderHook(({ uid }) => useUnlockedMustEats(uid), { initialProps: { uid: 'A' } });
    await waitFor(() => expect(page.result.current.loading).toBe(false));
    let pending!: Promise<MapMustEat | null>;
    await act(async () => { pending = page.result.current.unlock('private-A'); });
    await waitFor(() => expect(json).toHaveBeenCalledOnce());
    firebase.auth.currentUser = user('B'); page.rerender({ uid: 'B' });
    await waitFor(() => expect(page.result.current.loading).toBe(false));
    await act(async () => { body.resolve({ mustEat: { _id: 'private-A' } as MapMustEat }); expect(await pending).toBeNull(); });
    expect(page.result.current.unlockedIds.has('private-A')).toBe(false);
  });

  it.each(['B', null, 'A-again'])('discards A’s late card when the viewer changes to %s', async next => {
    const response = deferred<Response>();
    const fetcher = vi.fn(() => response.promise); vi.stubGlobal('fetch', fetcher);
    const page = renderHook(({ uid }: { uid: string | null }) => useUnlockedMustEats(uid), { initialProps: { uid: 'A' as string | null } });
    await waitFor(() => expect(page.result.current.loading).toBe(false));
    let pending!: Promise<MapMustEat | null>;
    await act(async () => { pending = page.result.current.unlock('private-A'); });
    await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    firebase.auth.currentUser = next === null ? null : user('B');
    page.rerender({ uid: next === null ? null : 'B' });
    await waitFor(() => expect(page.result.current.loading).toBe(false));
    if (next === 'A-again') {
      firebase.auth.currentUser = user('A'); page.rerender({ uid: 'A' });
    }
    await waitFor(() => expect(page.result.current.loading).toBe(false));
    await act(async () => {
      response.resolve(new Response(JSON.stringify({ mustEat: { _id: 'private-A', image: '/PRIVATE_A' } }), { status: 200 }));
      expect(await pending).toBeNull();
    });
    expect(page.result.current.unlockedIds.has('private-A')).toBe(false);
    expect([...Array(localStorage.length)].map((_, i) => localStorage.getItem(localStorage.key(i)!)).join()).not.toContain('private-A');
  });

  it('invalidates an old response during pending auth even when the SDK UID stays A', async () => {
    const response = deferred<Response>();
    const fetcher = vi.fn(() => response.promise); vi.stubGlobal('fetch', fetcher);
    const page = renderHook(({ uid }: { uid: string | null }) => useUnlockedMustEats(uid), { initialProps: { uid: 'A' as string | null } });
    await waitFor(() => expect(page.result.current.loading).toBe(false));
    let pending!: Promise<MapMustEat | null>;
    await act(async () => { pending = page.result.current.unlock('private-A'); });
    await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    page.rerender({ uid: null });
    page.rerender({ uid: 'A' });
    await waitFor(() => expect(page.result.current.loading).toBe(false));
    await act(async () => {
      response.resolve(new Response(JSON.stringify({ mustEat: { _id: 'private-A' } }), { status: 200 }));
      expect(await pending).toBeNull();
    });
    expect(page.result.current.unlockedIds.has('private-A')).toBe(false);
  });

  it('does not send a reveal if A’s token arrives after switching accounts', async () => {
    const token = deferred<string>(); firebase.auth.currentUser = { uid: 'A', getIdToken: () => token.promise };
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const page = renderHook(({ uid }) => useUnlockedMustEats(uid), { initialProps: { uid: 'A' } });
    await waitFor(() => expect(page.result.current.loading).toBe(false));
    let pending!: Promise<MapMustEat | null>;
    await act(async () => { pending = page.result.current.unlock('private-A'); });
    firebase.auth.currentUser = user('B'); page.rerender({ uid: 'B' });
    await waitFor(() => expect(page.result.current.loading).toBe(false));
    await act(async () => { token.resolve('old-token'); expect(await pending).toBeNull(); });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
