import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();
vi.mock('@/lib/sanity', () => ({ client: { fetch: (...args: unknown[]) => fetchMock(...args) } }));

import { getCachedMapData, getCachedMustEats } from './cached-sanity';
import { mapMustEatsQuery } from './queries';

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
