import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();
vi.mock('@/lib/sanity', () => ({ client: { fetch: (...args: unknown[]) => fetchMock(...args) } }));

import { getCachedMapData, getCachedMustEats, getCachedMustEatsForPage } from './cached-sanity';
import { mapMustEatsQuery, mapRestaurantsQuery } from './queries';

describe('getCachedMustEats', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue([]);
  });

  // Weicht ein Argument ab, entstehen zwei Einträge im Data Cache und die
  // Bild-Route fragt Sanity, obwohl die Map die Karten längst geholt hat.
  it('nutzt denselben Cache-Eintrag wie getCachedMapData', async () => {
    await getCachedMapData();
    const viaMapData = fetchMock.mock.calls.find(([query]) => query === mapMustEatsQuery);
    fetchMock.mockClear();

    await getCachedMustEats();

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(...viaMapData!);
  });
});

describe('getCachedMustEatsForPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue([]);
  });

  // Eine vorgebaute Seite erbt die kürzeste Frist ihrer Fetches.
  it('liest nur die Karten, mit der Frist der Seiten und dem Tag der Map', async () => {
    await getCachedMustEatsForPage();

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(mapMustEatsQuery, {}, {
      next: { revalidate: 86400, tags: ['map-data'] },
    });
  });
});

describe('getCachedMapData bei gleichzeitigen Aufrufen', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue([]);
  });

  function holdFirstRound() {
    let release!: () => void;
    let fail!: (error: Error) => void;
    const held = new Promise<unknown[]>((resolve, reject) => {
      release = () => resolve([]);
      fail = reject;
    });
    fetchMock.mockImplementationOnce(() => held);
    return { release, fail };
  }

  const catalogFetches = () =>
    fetchMock.mock.calls.filter(([query]) => query === mapRestaurantsQuery);

  it('holt den Katalog bei leerem Cache nur einmal', async () => {
    const { release } = holdFirstRound();

    const calls = [getCachedMapData(), getCachedMapData(), getCachedMapData()];
    await vi.waitFor(() => expect(catalogFetches()).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve));
    expect(catalogFetches()).toHaveLength(1);

    release();
    await Promise.all(calls);
  });

  // Next hängt die Tags an den Render, der `fetch` selbst aufruft. Ohne eigenen
  // Aufruf käme eine ISR-Seite ohne `map-data` in den Cache.
  it('lässt jeden Aufrufer danach selbst lesen, mit Tags', async () => {
    const { release } = holdFirstRound();

    const calls = [getCachedMapData(), getCachedMapData(), getCachedMapData()];
    await vi.waitFor(() => expect(catalogFetches()).toHaveLength(1));
    release();
    await Promise.all(calls);

    expect(catalogFetches()).toHaveLength(3);
    for (const [, , options] of catalogFetches()) {
      expect(options.next.tags).toContain('map-data');
    }
  });

  it('gibt einen Fehler der ersten Runde nicht an die Wartenden weiter', async () => {
    const { fail } = holdFirstRound();

    const first = getCachedMapData();
    const second = getCachedMapData();
    await vi.waitFor(() => expect(catalogFetches()).toHaveLength(1));
    fail(new Error('Socket timed out'));

    await expect(first).rejects.toThrow('Socket timed out');
    await expect(second).resolves.toMatchObject({ restaurants: [] });
  });

  it('wartet nach einem Fehlschlag nicht auf die alte Runde', async () => {
    const { fail } = holdFirstRound();

    const first = getCachedMapData();
    await vi.waitFor(() => expect(catalogFetches()).toHaveLength(1));
    fail(new Error('Socket timed out'));
    await expect(first).rejects.toThrow('Socket timed out');

    await expect(getCachedMapData()).resolves.toMatchObject({ restaurants: [] });
  });
});
