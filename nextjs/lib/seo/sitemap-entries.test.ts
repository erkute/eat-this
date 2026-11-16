import { describe, it, expect, vi } from 'vitest';
import { TEMPLATE_REVISED } from '@/lib/constants';

// Answer each of the four Sanity reads by its document type.
vi.mock('@/lib/sanity-read', () => ({
  readSanity: vi.fn(async (query: string) => {
    if (query.includes('_type == "restaurant"')) {
      return [
        { slug: 'unchanged', descriptionEn: 'x', createdAt: '2026-01-10T08:00:00Z' },
        { slug: 'rewritten', descriptionEn: 'x', createdAt: '2026-01-10T08:00:00Z', revised: '2026-11-16' },
        { slug: 'young', descriptionEn: 'x', createdAt: '2026-10-05T08:00:00Z' },
        { slug: 'young-rewritten', createdAt: '2026-10-05T08:00:00Z', revised: '2026-11-16' },
      ];
    }
    return [];
  }),
}));

const { sitemapEntries } = await import('./sitemap-entries');

const lastmodOf = async (path: string) =>
  (await sitemapEntries()).find((e) => e.url.endsWith(path))?.lastModified;

describe('sitemapEntries – spots', () => {
  it('keeps the template date for a spot whose text was never revised', async () => {
    expect(await lastmodOf('/restaurant/unchanged')).toBe(TEMPLATE_REVISED);
  });

  it('dates a revised spot to its revision', async () => {
    expect(await lastmodOf('/restaurant/rewritten')).toBe('2026-11-16');
  });

  it('dates a spot created after the template to its creation', async () => {
    expect(await lastmodOf('/restaurant/young')).toBe('2026-10-05T08:00:00Z');
  });

  it('takes the revision over the creation when it is later', async () => {
    expect(await lastmodOf('/restaurant/young-rewritten')).toBe('2026-11-16');
  });
});
