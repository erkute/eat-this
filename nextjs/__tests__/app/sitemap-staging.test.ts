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

  it('production: excludes closed, untranslated duplicate and retired URLs', async () => {
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
    // The three guides 308 to their category pages (next.config.ts) — a
    // redirect in the sitemap is exactly the mixed signal that put them and
    // /kategorie/* against each other in the first place.
    expect(urls.filter((url) => url.includes('/guides/'))).toHaveLength(0);

    const germanOnly = result.find((entry) => entry.url.endsWith('/news/nur-deutsch'));
    const translated = result.find((entry) => entry.url.endsWith('/news/translated'));
    expect(germanOnly?.alternates).toBeUndefined();
    expect(translated?.alternates?.languages?.en).toMatch(/\/en\/news\/translated$/);

    expect(mocks.fetch.mock.calls[0]?.[0]).toContain('isOpen != false');
    expect(mocks.fetch.mock.calls[0]?.[0]).toContain('isClosed != true');
  });

  it('dates every URL, and lets a fresher article beat the template date', async () => {
    process.env.NEXT_PUBLIC_ENV = 'production';
    mocks.fetch
      .mockResolvedValueOnce([{ slug: 'live-spot' }])
      .mockResolvedValueOnce([
        // Older than the template revision — the template change is what
        // last touched this page, so that date wins.
        { slug: 'alt', updatedAt: '2026-07-13T10:00:00Z', hasEnContent: false },
        // Edited after it — the human edit is the later change.
        { slug: 'frisch', updatedAt: '2099-01-01T10:00:00Z', hasEnContent: false },
      ])
      .mockResolvedValueOnce([{ slug: 'mitte' }])
      .mockResolvedValueOnce([{ slug: 'pizza' }]);

    vi.resetModules();
    const { TEMPLATE_REVISED } = await import('@/lib/constants');
    const mod = await import('@/app/sitemap');
    const result = await mod.default();

    // A URL without lastmod is a URL Google has no reason to re-fetch.
    expect(result.filter((entry) => !entry.lastModified)).toEqual([]);

    const lastmod = (suffix: string) =>
      result.find((entry) => entry.url.endsWith(suffix))?.lastModified;
    expect(lastmod('/restaurant/live-spot')).toBe(TEMPLATE_REVISED);
    expect(lastmod('/bezirk/mitte')).toBe(TEMPLATE_REVISED);
    expect(lastmod('/kategorie/pizza')).toBe(TEMPLATE_REVISED);
    expect(lastmod('/news/alt')).toBe(TEMPLATE_REVISED);
    expect(lastmod('/news/frisch')).toBe('2099-01-01T10:00:00Z');
  });

  it('keeps the template date a plain past date', async () => {
    vi.resetModules();
    const { TEMPLATE_REVISED } = await import('@/lib/constants');
    // A bare YYYY-MM-DD, never a full timestamp, and never ahead of today —
    // a lastmod in the future is the fastest way to make Google stop
    // believing the field. That it must not be computed from `new Date()`
    // is a rule no assertion can express; it lives in the constant's comment.
    expect(TEMPLATE_REVISED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(TEMPLATE_REVISED <= new Date().toISOString().slice(0, 10)).toBe(true);
  });
});
