import { describe, it, expect, afterEach, vi } from 'vitest';

describe('robots.ts', () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_ENV;
  afterEach(() => {
    process.env.NEXT_PUBLIC_ENV = ORIGINAL;
  });

  it('production: allow / and reference sitemap', async () => {
    process.env.NEXT_PUBLIC_ENV = 'production';
    vi.resetModules();
    const mod = await import('@/app/robots');
    const result = mod.default();
    expect(result.rules).toEqual(
      expect.arrayContaining([
        { userAgent: '*', allow: '/' },
        { userAgent: 'OAI-SearchBot', allow: '/' },
        { userAgent: 'ChatGPT-User', allow: '/' },
        { userAgent: 'GPTBot', allow: '/' },
        { userAgent: 'ClaudeBot', allow: '/' },
        { userAgent: 'Claude-SearchBot', allow: '/' },
        { userAgent: 'Claude-User', allow: '/' },
        { userAgent: 'PerplexityBot', allow: '/' },
        { userAgent: 'Google-Extended', allow: '/' },
        { userAgent: 'Bingbot', allow: '/' },
      ])
    );
    // Genau eine Sitemap: die News-Sitemap ist raus, weil sie bei
    // Evergreen-Guides und Wochen ohne neuen Artikel dauerhaft leer war
    // und in der Search Console als Fehler stand.
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
    expect(result.sitemap).not.toMatch(/news-sitemap/);
  });

  it('staging: disallow all, no sitemap reference', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging';
    vi.resetModules();
    const mod = await import('@/app/robots');
    const result = mod.default();
    expect(result.rules).toEqual({ userAgent: '*', disallow: '/' });
    expect(result.sitemap).toBeUndefined();
  });
});
