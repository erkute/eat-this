// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(() => Promise.resolve({})),
  getDocs: vi.fn(),
  openLoginModal: vi.fn(),
  getIdToken: vi.fn(() => Promise.resolve('token')),
}));

vi.mock('next-intl', () => ({ useLocale: () => 'de' }));
vi.mock('@/lib/auth', () => ({
  useLoginModal: () => ({ open: mocks.openLoginModal }),
}));
vi.mock('@/lib/firebase/config', () => ({
  auth: { currentUser: { getIdToken: mocks.getIdToken } },
  getDb: mocks.getDb,
}));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, ...parts: string[]) => ({ path: parts.join('/') })),
  getDocs: (...args: unknown[]) => mocks.getDocs(...args),
  doc: vi.fn((_db, ...parts: string[]) => ({ path: parts.join('/') })),
  updateDoc: vi.fn(),
}));

import { useFavorites } from '../useFavorites';

function pendingSnapshot() {
  return new Promise<never>(() => {});
}

describe('useFavorites uid isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.getDb.mockResolvedValue({});
    mocks.getDocs.mockImplementation(pendingSnapshot);
  });

  it('atomically clears the previous account on uid change and sign-out', async () => {
    window.localStorage.setItem(
      'eatthis_favorites_user-a',
      JSON.stringify([{ restaurantId: 'restaurant-a', name: 'Account A spot' }])
    );

    const { result, rerender } = renderHook(
      ({ uid }: { uid: string | null }) => useFavorites(uid),
      { initialProps: { uid: 'user-a' as string | null } }
    );

    await waitFor(() => expect(result.current.favoriteIds.has('restaurant-a')).toBe(true));
    expect(result.current.favorites).toHaveLength(1);

    rerender({ uid: 'user-b' });
    expect(result.current.favoriteIds.size).toBe(0);
    expect(result.current.favorites).toEqual([]);
    expect(result.current.loading).toBe(true);

    rerender({ uid: null });
    expect(result.current.favoriteIds.size).toBe(0);
    expect(result.current.favorites).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('discards malformed cached favorites instead of crashing the profile', async () => {
    window.localStorage.setItem(
      'eatthis_favorites_user-a',
      JSON.stringify([{ restaurantId: 'restaurant-a' }, null])
    );

    const { result } = renderHook(() => useFavorites('user-a'));

    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(result.current.favoriteIds.size).toBe(0);
    expect(result.current.favorites).toEqual([]);
    expect(window.localStorage.getItem('eatthis_favorites_user-a')).toBeNull();
  });

  it('skips malformed Firestore favorites and refreshes a safe cache', async () => {
    mocks.getDocs.mockResolvedValue({
      docs: [
        { id: 'valid', data: () => ({ name: 'Valid spot', district: 'Mitte' }) },
        { id: 'missing-name', data: () => ({ district: 'Kreuzberg' }) },
        { id: 'bad-photo', data: () => ({ name: 'Bad photo', photo: 42 }) },
      ],
    });

    const { result } = renderHook(() => useFavorites('user-a'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.favorites).toEqual([
      {
        restaurantId: 'valid',
        name: 'Valid spot',
        district: 'Mitte',
        note: '',
      },
    ]);
    expect(JSON.parse(window.localStorage.getItem('eatthis_favorites_user-a') ?? '[]')).toEqual(
      result.current.favorites
    );
  });

  /* Der Tap eines Ausgeloggten ging vorher verloren: Modal auf, und danach
     stand derselbe Mensch vor demselben leeren Herz. Jetzt wartet die Absicht
     auf das Konto — im sessionStorage fuer den Google-Weg, am Modal fuer die
     Continue-URL des Magic-Links. */
  it('merkt sich das Herz eines Ausgeloggten und gibt es dem Login mit', async () => {
    window.sessionStorage.clear();
    const { result } = renderHook(() => useFavorites(null));

    await act(async () => {
      await result.current.toggle({ _id: 'restaurant-a', name: 'Spot A' });
    });

    expect(mocks.openLoginModal).toHaveBeenCalledWith({
      kind: 'heart',
      restaurantId: 'restaurant-a',
      name: 'Spot A',
    });
    expect(JSON.parse(window.sessionStorage.getItem('eatthis_pending_heart') ?? '{}').id).toBe(
      'restaurant-a'
    );
  });

  it('ignores a previous uid read that resolves after an account switch', async () => {
    let resolveFirst:
      | ((value: { docs: Array<{ id: string; data: () => object }> }) => void)
      | null = null;
    mocks.getDocs
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockResolvedValueOnce({ docs: [] });

    const { result, rerender } = renderHook(
      ({ uid }: { uid: string | null }) => useFavorites(uid),
      { initialProps: { uid: 'user-a' as string | null } }
    );

    await waitFor(() => expect(mocks.getDocs).toHaveBeenCalledTimes(1));
    rerender({ uid: 'user-b' });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      resolveFirst?.({
        docs: [{ id: 'restaurant-a', data: () => ({ name: 'Account A spot' }) }],
      });
      await Promise.resolve();
    });

    expect(result.current.favoriteIds.size).toBe(0);
    expect(result.current.favorites).toEqual([]);
  });
});

/* Das Herz fuellt sich beim Tippen, nicht erst nach /api/heart; gemeldet
   wird nur der allererste Spot, einmal je Geraet (Betreiber, 27.10.2026). */
describe('useFavorites — Speichern', () => {
  const showNotice = vi.fn();
  const fetchMock = vi.fn(() => Promise.resolve({ ok: true }));

  /* Eigene Konten je Test: pendingHeart merkt sich das eingeloeste Herz pro
     Seite und uid, und ein frueherer Test dieser Datei hinterlaesst eines
     fuer user-a. */
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.showNotice = showNotice;
    fetchMock.mockImplementation(() => Promise.resolve({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    mocks.getDb.mockResolvedValue({});
  });

  it('sagt beim allerersten Spot einmal, wo die Spots liegen', async () => {
    mocks.getDocs.mockResolvedValue({ docs: [] });
    const { result } = renderHook(() => useFavorites('user-first'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggle({ _id: 'r-1', name: 'Spot 1' });
    });
    expect(showNotice).toHaveBeenCalledOnce();
    expect(showNotice.mock.calls[0][0].detail).toBe('Deine Spots findest du im Profil.');

    /* Entfernt und neu gespeichert ist die Liste wieder leer — der Hinweis
       kommt trotzdem nicht noch einmal. */
    await act(async () => {
      await result.current.toggle({ _id: 'r-1', name: 'Spot 1' });
    });
    await act(async () => {
      await result.current.toggle({ _id: 'r-1', name: 'Spot 1' });
    });
    expect(showNotice).toHaveBeenCalledOnce();
  });

  it('meldet ab dem zweiten Spot nichts', async () => {
    mocks.getDocs.mockResolvedValue({
      docs: [{ id: 'r-0', data: () => ({ name: 'Spot 0' }) }],
    });
    const { result } = renderHook(() => useFavorites('user-more'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggle({ _id: 'r-1', name: 'Spot 1' });
    });

    expect(showNotice).not.toHaveBeenCalled();
  });

  it('fuellt das Herz sofort und nimmt es zurueck, wenn der Server ablehnt', async () => {
    mocks.getDocs.mockResolvedValue({ docs: [] });
    let answer: (value: { ok: boolean }) => void = () => {};
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          answer = resolve;
        })
    );
    const { result } = renderHook(() => useFavorites('user-optimistic'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let done: Promise<boolean> = Promise.resolve(false);
    act(() => {
      done = result.current.toggle({ _id: 'r-1', name: 'Spot 1' });
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(result.current.favoriteIds.has('r-1')).toBe(true);

    /* Ein zweiter Tipp, solange der erste laeuft, schaltet nicht zurueck. */
    await act(async () => {
      await expect(result.current.toggle({ _id: 'r-1', name: 'Spot 1' })).resolves.toBe(false);
    });
    expect(fetchMock).toHaveBeenCalledOnce();

    await act(async () => {
      answer({ ok: false });
      await expect(done).resolves.toBe(false);
    });
    expect(result.current.favoriteIds.has('r-1')).toBe(false);
    expect(showNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: 'error' }));
  });

  it('behaelt die Notiz, wenn das Entfernen scheitert', async () => {
    mocks.getDocs.mockResolvedValue({
      docs: [{ id: 'r-1', data: () => ({ name: 'Spot 1', note: 'Mittags hin' }) }],
    });
    fetchMock.mockImplementation(() => Promise.resolve({ ok: false }));
    const { result } = renderHook(() => useFavorites('user-keep-note'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggle({ _id: 'r-1', name: 'Spot 1' });
    });

    expect(result.current.favorites).toEqual([
      { restaurantId: 'r-1', name: 'Spot 1', note: 'Mittags hin' },
    ]);
  });

  /* Das Herz von vor dem Login: die Anmeldung endet im Profil, der Spot steht
     dort in der Liste. Keine Meldung — und auch spaeter kein Hinweis mehr. */
  it('meldet das Herz von vor dem Login nicht und zaehlt es als gezeigt', async () => {
    window.sessionStorage.setItem(
      'eatthis_pending_heart',
      JSON.stringify({ id: 'r-9', at: Date.now() })
    );
    mocks.getDocs.mockResolvedValue({
      docs: [{ id: 'r-9', data: () => ({ name: 'Spot 9' }) }],
    });

    const { result } = renderHook(() => useFavorites('user-pending-first'));

    await waitFor(() => expect(result.current.favoriteIds.has('r-9')).toBe(true));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(showNotice).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('eatthis_saved_spots_hint')).toBe('1');
  });
});
