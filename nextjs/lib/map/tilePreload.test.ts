import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { spotTileUrls, tileOf } from './tilePreload';

const TEMPLATE = 'https://tiles.example/planet/v1/{z}/{x}/{y}.pbf';
const ALEX = { lng: 13.4132, lat: 52.5219 };

describe('tileOf', () => {
  it('liefert die Kachel, in der ein Punkt liegt (Web-Mercator, XYZ)', () => {
    expect(tileOf(ALEX, 14)).toEqual({ x: 8802, y: 5373 });
    expect(tileOf(ALEX, 13)).toEqual({ x: 4401, y: 2686 });
    expect(tileOf({ lng: -0.1276, lat: 51.5072 }, 14)).toEqual({ x: 8186, y: 5448 });
  });
});

describe('spotTileUrls', () => {
  it('nimmt die z14-Kachel des Spots und ihre z13-Mutter', () => {
    expect(spotTileUrls(TEMPLATE, ALEX)).toEqual([
      'https://tiles.example/planet/v1/14/8802/5373.pbf',
      'https://tiles.example/planet/v1/13/4401/2686.pbf',
    ]);
  });
});

describe('preloadSpotTiles', () => {
  const fetchMock = vi.fn(async (_url: string) => new Response(new ArrayBuffer(8)));
  // Frisch geladen je Test: das Modul merkt sich, was es schon geholt hat.
  let preloadSpotTiles: typeof import('./tilePreload').preloadSpotTiles;

  beforeEach(async () => {
    vi.resetModules();
    ({ preloadSpotTiles } = await import('./tilePreload'));
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('holt beide Kacheln genau einmal, auch wenn der Spot wieder drankommt', () => {
    preloadSpotTiles(TEMPLATE, ALEX);
    preloadSpotTiles(TEMPLATE, ALEX);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(spotTileUrls(TEMPLATE, ALEX));
  });

  it('lädt nichts ohne Vorlage oder ohne Spot', () => {
    preloadSpotTiles(undefined, ALEX);
    preloadSpotTiles(TEMPLATE, null);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lädt nichts, wenn der Browser Daten sparen soll', () => {
    vi.stubGlobal('navigator', { connection: { saveData: true } });
    preloadSpotTiles(TEMPLATE, ALEX);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('versucht es beim nächsten Mal wieder, wenn das Laden scheiterte', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    preloadSpotTiles(TEMPLATE, ALEX);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 0));
    preloadSpotTiles(TEMPLATE, ALEX);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
