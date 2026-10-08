import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  projectId: 'eat-this-8a13b' as string | undefined,
  doc: { data: undefined as Record<string, unknown> | undefined },
  set: vi.fn(),
  save: vi.fn(),
  exists: vi.fn(),
  download: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  getAdminProjectId: () => mocks.projectId,
  getAdminFirestore: () => ({
    collection: () => ({
      doc: () => ({
        get: async () => ({ data: () => mocks.doc.data }),
        set: async (value: Record<string, unknown>, options: unknown) => {
          mocks.set(value, options);
          mocks.doc.data = { ...mocks.doc.data, ...value };
        },
      }),
    }),
  }),
  getAdminStorage: () => ({
    bucket: () => ({
      file: (path: string) => ({
        exists: async () => [mocks.exists(path)],
        save: async (data: Buffer, options: unknown) => mocks.save(path, data, options),
        download: async () => [await mocks.download(path)],
      }),
    }),
  }),
}));

import { MustEatCardError, firebaseServesDataset, writeMustEatCard } from './card-admin.server';

const TEXT = { dish: 'Banh Mi Vegan', description: 'Baguette, Tofu', descriptionEn: 'Baguette, tofu', price: '' };

async function card(width: number, height: number) {
  return sharp({ create: { width, height, channels: 4, background: { r: 255, g: 198, b: 0, alpha: 0 } } })
    .png()
    .toBuffer();
}

describe('Must-Eat-Karte aus dem Studio', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.projectId = 'eat-this-8a13b';
    mocks.doc.data = undefined;
    mocks.exists.mockReturnValue(false);
    mocks.download.mockResolvedValue(await card(1026, 1410));
  });

  it('schreibt nur ins Firebase-Projekt, das zum Datensatz gehört', () => {
    expect(firebaseServesDataset('ehwjnjr2', 'production')).toBe(true);
    expect(firebaseServesDataset('tqgkp8uc', 'staging')).toBe(false);
    mocks.projectId = 'eat-this-staging-8a13b';
    expect(firebaseServesDataset('tqgkp8uc', 'staging')).toBe(true);
    expect(firebaseServesDataset('ehwjnjr2', 'production')).toBe(false);
    expect(firebaseServesDataset('ehwjnjr2', 'staging')).toBe(false);
  });

  it('legt eine neue Karte als WebP unter ihrem Hash ab und verknüpft den Spot', async () => {
    const state = await writeMustEatCard({ id: 'card-1', restaurantId: 'spot-1', text: TEXT, image: await card(2052, 2820) });

    const [path, data, options] = mocks.save.mock.calls[0];
    expect(path).toMatch(/^premium\/must-eats\/card-1\/[0-9a-f]{64}\.webp$/);
    expect((await sharp(data).metadata()).width).toBe(1200);
    expect((await sharp(data).metadata()).hasAlpha).toBe(true);
    expect(options).toMatchObject({ metadata: { contentType: 'image/webp', cacheControl: 'private, no-store' } });

    const [written] = mocks.set.mock.calls[0];
    expect(written).toMatchObject({ ...TEXT, restaurantId: 'spot-1', imageObjectPath: path, schemaVersion: 1 });
    expect(written.recordSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(state).toMatchObject({ exists: true, restaurantId: 'spot-1' });
    expect(state.preview).toMatch(/^data:image\/webp;base64,/);
  });

  it('behält beim Textändern das bisherige Bild', async () => {
    mocks.doc.data = { ...TEXT, imageObjectPath: 'premium/must-eats/card-1/abc.webp', imageContentType: 'image/webp', imageSha256: 'abc' };
    await writeMustEatCard({ id: 'card-1', restaurantId: 'spot-1', text: { ...TEXT, dish: 'Banh Mi' }, image: null });
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.set.mock.calls[0][0]).toMatchObject({ dish: 'Banh Mi', imageObjectPath: 'premium/must-eats/card-1/abc.webp' });
  });

  it('verlangt Text, ein Bild für neue Karten und eine Mindestgröße', async () => {
    await expect(writeMustEatCard({ id: 'card-1', restaurantId: 'spot-1', text: { ...TEXT, descriptionEn: ' ' }, image: null })).rejects.toBeInstanceOf(MustEatCardError);
    await expect(writeMustEatCard({ id: 'card-1', restaurantId: 'spot-1', text: TEXT, image: null })).rejects.toThrow('Bild');
    await expect(writeMustEatCard({ id: 'card-1', restaurantId: 'spot-1', text: TEXT, image: await card(300, 400) })).rejects.toThrow('zu klein');
    await expect(writeMustEatCard({ id: 'card-1', restaurantId: 'spot-1', text: TEXT, image: Buffer.from('kein bild') })).rejects.toThrow('lesbares Bild');
    expect(mocks.set).not.toHaveBeenCalled();
  });
});
