import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase/admin', () => ({ getAdminStorage: () => ({}) }));
vi.mock('sharp', () => ({ default: () => ({}) }));

import {
  MemoCache,
  createPrivateMustEatImageRenderer,
  type ImageVariant,
  type StoredImage,
} from './private-image';
import type { PrivateMustEatContent } from './private-store';

const content = (id: string, hash = 'aaa'): PrivateMustEatContent => ({
  dish: 'Dish',
  description: 'B',
  descriptionEn: 'D',
  price: '€€',
  imageObjectPath: `premium/must-eats/${id}/${hash}.webp`,
  imageContentType: 'image/webp',
  restaurantId: 'r1',
  schemaVersion: 1,
});

const original = (tag = 'orig'): StoredImage => ({
  body: Buffer.from(tag),
  contentType: 'image/webp',
  etag: 'E1',
});

const w360: ImageVariant = { width: 360, quality: 80, webp: true };

function setup(overrides: Partial<Parameters<typeof createPrivateMustEatImageRenderer>[0]> = {}) {
  let now = 1_000_000;
  const readContent = vi.fn(async (id: string) => content(id));
  const download = vi.fn(async () => original());
  const resize = vi.fn(async (o: StoredImage, v: ImageVariant) => ({
    body: Buffer.from(`${o.body.toString()}@${v.width}`),
    contentType: 'image/webp',
    etag: o.etag,
  }));
  const gate = vi.fn(async () => {});
  const { render } = createPrivateMustEatImageRenderer({
    readContent,
    download,
    resize,
    now: () => now,
    ...overrides,
  });
  return { render, readContent, download, resize, gate, advance: (ms: number) => (now += ms) };
}

describe('renderPrivateMustEatImage', () => {
  it('serves the original from memory after the first download and asks the gate only for paid work', async () => {
    const { render, download, readContent, gate } = setup();
    const first = await render('m1', null, gate);
    const second = await render('m1', null, gate);

    expect(first.body.toString()).toBe('orig');
    expect(second.body).toBe(first.body);
    expect(download).toHaveBeenCalledTimes(1);
    expect(readContent).toHaveBeenCalledTimes(1);
    expect(gate).toHaveBeenCalledTimes(1);
    expect(first.etag).toBe('"E1"');
  });

  it('caches each variant, reuses the original for a second variant, and stamps the ETag per variant', async () => {
    const { render, download, resize, gate } = setup();
    const a = await render('m1', w360, gate);
    const b = await render('m1', w360, gate);
    const c = await render('m1', { ...w360, width: 720 }, gate);

    expect(a.body.toString()).toBe('orig@360');
    expect(b).toBe(a);
    expect(c.body.toString()).toBe('orig@720');
    expect(download).toHaveBeenCalledTimes(1);
    expect(resize).toHaveBeenCalledTimes(2);
    // Ein Riegel-Aufruf je gerechneter Variante; der Treffer fragt nicht.
    expect(gate).toHaveBeenCalledTimes(2);
    expect(a.etag).toBe('"E1-w360-q80-webp"');
    expect(c.etag).toBe('"E1-w720-q80-webp"');
  });

  it('coalesces concurrent requests for the same image into one download', async () => {
    let release!: (image: StoredImage) => void;
    const download = vi.fn(() => new Promise<StoredImage>((resolve) => (release = resolve)));
    const { render, gate } = setup({ download });

    const pending = Promise.all([render('m1', null, gate), render('m1', null, gate)]);
    await vi.waitFor(() => expect(download).toHaveBeenCalled());
    release(original());
    const [a, b] = await pending;

    expect(download).toHaveBeenCalledTimes(1);
    expect(gate).toHaveBeenCalledTimes(1);
    expect(a.body).toBe(b.body);
  });

  it('propagates a refusing gate and does not cache the refusal', async () => {
    const { render, download } = setup();
    const refuse = vi.fn(async () => {
      throw new Error('rate_limited');
    });
    await expect(render('m1', null, refuse)).rejects.toThrow('rate_limited');
    expect(download).not.toHaveBeenCalled();

    const ok = await render('m1', null, async () => {});
    expect(ok.body.toString()).toBe('orig');
  });

  it('falls back to the original when resizing fails, with the original ETag', async () => {
    const resize = vi.fn(async () => {
      throw new Error('unsupported');
    });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { render, gate } = setup({ resize });
    const image = await render('m1', w360, gate);
    spy.mockRestore();

    expect(image.body.toString()).toBe('orig');
    expect(image.etag).toBe('"E1"');
  });

  it('refuses a bucket object that is not an image', async () => {
    const download = vi.fn(async () => ({ ...original(), contentType: 'text/html' }));
    const { render, gate } = setup({ download });
    await expect(render('m1', null, gate)).rejects.toThrow('not an image');
  });

  it('re-reads the Firestore document after five minutes and follows a new object path', async () => {
    let hash = 'aaa';
    const readContent = vi.fn(async (id: string) => content(id, hash));
    const download = vi.fn(async (path: string) => original(path.includes('bbb') ? 'new' : 'old'));
    const { render, gate, advance } = setup({ readContent, download });

    expect((await render('m1', null, gate)).body.toString()).toBe('old');
    hash = 'bbb';
    advance(4 * 60_000);
    expect((await render('m1', null, gate)).body.toString()).toBe('old');
    advance(2 * 60_000);
    expect((await render('m1', null, gate)).body.toString()).toBe('new');
    expect(readContent).toHaveBeenCalledTimes(2);
  });
});

describe('MemoCache', () => {
  it('evicts the least recently used entry once full', () => {
    const cache = new MemoCache<number>(2, Infinity, () => 0);
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.peek('a')).toBe(1); // a wird frisch, b ist jetzt das aelteste
    cache.set('c', 3);
    expect(cache.peek('b')).toBeUndefined();
    expect(cache.peek('a')).toBe(1);
    expect(cache.peek('c')).toBe(3);
    expect(cache.size).toBe(2);
  });

  it('forgets an expired entry and does not remember a failed load', async () => {
    let now = 0;
    const cache = new MemoCache<string>(10, 100, () => now);
    cache.set('k', 'v');
    now = 100;
    expect(cache.peek('k')).toBeUndefined();

    await expect(cache.get('k', async () => Promise.reject(new Error('boom')))).rejects.toThrow(
      'boom'
    );
    expect(await cache.get('k', async () => 'fresh')).toBe('fresh');
  });
});
