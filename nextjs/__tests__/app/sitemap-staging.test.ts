import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.mock('@/lib/sanity', () => ({ client: { fetch: mocks.fetch } }));

describe('sitemap.ts', () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_ENV;

  beforeEach(() => {
    mocks.fetch.mockReset();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_ENV = ORIGINAL;
  });

  it('staging: returns empty array without hitting Sanity', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging';
    vi.resetModules();
    const mod = await import('@/app/sitemap');
    const result = await mod.default();
    expect(result).toEqual([]);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('production: lists guides and excludes closed or untranslated duplicate URLs', async () => {
    process.env.NEXT_PUBLIC_ENV = 'production';
    mocks.fetch
      .mockResolvedValueOnce([
        { slug: 'live-spot', descriptionEn: 'English copy' },
        { slug: 'phantom-bar', descriptionEn: 'English copy' },
      ])
      .mockResolvedValueOnce([
        { slug: 'nur-deutsch', updatedAt: '2026-07-13T10:00:00Z', hasEnContent: false },
        { slug: 'translated', updatedAt: '2026-07-14T10:00:00Z', hasEnContent: true },
      ])
      .mockResolvedValueOnce([{ slug: 'mitte', descriptionEn: 'Mitte in English' }])
      .mockResolvedValueOnce([{ slug: 'pizza' }]);

    vi.resetModules();
    const mod = await import('@/app/sitemap');
    const result = await mod.default();

    const urls = result.map((entry) => entry.url);
    expect(urls.some((url) => url.endsWith('/restaurant/live-spot'))).toBe(true);
    expect(urls.some((url) => url.endsWith('/restaurant/phantom-bar'))).toBe(false);
    expect(urls.filter((url) => url.includes('/guides/'))).toHaveLength(4);

    const guide = result.find((entry) => entry.url.endsWith('/guides/beste-pizza-berlin'));
    expect(guide?.alternates?.languages?.en).toMatch(/\/en\/guides\/beste-pizza-berlin$/);

    const germanOnly = result.find((entry) => entry.url.endsWith('/news/nur-deutsch'));
    const translated = result.find((entry) => entry.url.endsWith('/news/translated'));
    expect(germanOnly?.alternates).toBeUndefined();
    expect(translated?.alternates?.languages?.en).toMatch(/\/en\/news\/translated$/);

    expect(mocks.fetch.mock.calls[0]?.[0]).toContain('isOpen != false');
    expect(mocks.fetch.mock.calls[0]?.[0]).toContain('isClosed != true');
  });
});
