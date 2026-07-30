import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The map chunk is ~800 KB, so hovering a map link warms it. That makes this a
 * bet, not a requirement — and a bet that loses must not leave anything behind.
 *
 * Both cases below are things it did: a failed chunk request surfaced as an
 * unhandled rejection (the caller fires and forgets with `void`, which attaches
 * no handler), and the rejected promise stayed in the module cache, so every
 * later hover handed the same rejection back and preloading stayed dead for the
 * rest of the session — long after the network came back.
 *
 * The retry is asserted on promise IDENTITY rather than on how often the import
 * ran: a mocked module is cached after its first import, so counting factory
 * calls would measure the mock, not the code.
 */
describe('preloadMapSurface', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('resolves rather than rejecting when the chunk fails to load', async () => {
    vi.doMock('./MapCanvasLayer', () => {
      throw new Error('ChunkLoadError: Loading chunk failed');
    });
    const { preloadMapSurface } = await import('./preloadMapSurface');

    await expect(preloadMapSurface()).resolves.toBeUndefined();
  });

  it('drops the cached attempt after a failure so the next intent retries', async () => {
    vi.doMock('./MapCanvasLayer', () => {
      throw new Error('ChunkLoadError: Loading chunk failed');
    });
    const { preloadMapSurface } = await import('./preloadMapSurface');

    const first = preloadMapSurface();
    await first;
    const second = preloadMapSurface();
    await second;

    expect(
      second,
      'the failed attempt is still cached — every later hover gets the same dead promise'
    ).not.toBe(first);
  });

  it('imports the chunk once when it succeeds', async () => {
    vi.doMock('./MapCanvasLayer', () => ({ default: () => null }));
    const { preloadMapSurface } = await import('./preloadMapSurface');

    const first = preloadMapSurface();
    await first;

    expect(preloadMapSurface(), 'a successful preload should stay cached').toBe(first);
  });
});
