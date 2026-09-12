// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { whenImageReady } from './imageReady';

/* jsdom, nicht node: der Helfer legt ohne `window` gar kein Bild an und wäre
   sofort fertig — die Prüfungen liefen dann ins Leere. `globalThis` IST dort
   `window`, der Stub erreicht also `window.Image`. */
const stubImage = (impl: unknown) => vi.stubGlobal('Image', impl);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/* Der Kartentausch hängt an dieser Zusage: erfüllt sie sich nicht, bleibt die
   Karte stehen. Deshalb prüft jeder Fall vor allem, DASS sie sich erfüllt. */
describe('whenImageReady', () => {
  it('wartet gar nicht, wenn es kein Bild gibt', async () => {
    await expect(whenImageReady(null)).resolves.toBeUndefined();
    await expect(whenImageReady('')).resolves.toBeUndefined();
  });

  it('meldet das dekodierte Bild', async () => {
    const decode = vi.fn().mockResolvedValue(undefined);
    stubImage(
      class {
        src = '';
        decode = decode;
      }
    );
    await expect(whenImageReady('/pics/card-back.webp')).resolves.toBeUndefined();
    expect(decode).toHaveBeenCalledTimes(1);
  });

  it('gibt auch ein kaputtes Bild frei — die Geste darf daran nicht hängen', async () => {
    stubImage(
      class {
        src = '';
        decode = () => Promise.reject(new Error('decode failed'));
      }
    );
    await expect(whenImageReady('/pics/kaputt.webp')).resolves.toBeUndefined();
  });

  it('deckelt das Warten auf ein Bild, das nie ankommt', async () => {
    vi.useFakeTimers();
    stubImage(
      class {
        src = '';
        decode = () => new Promise<void>(() => {});
      }
    );
    const pending = whenImageReady('/pics/haengt.webp', 700);
    let done = false;
    void pending.then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(699);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(done).toBe(true);
  });
});
