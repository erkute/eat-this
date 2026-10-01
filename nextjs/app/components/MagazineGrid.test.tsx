import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock('next/image', () => ({ default: () => null }));
import MagazineGrid, { headlineSize } from './MagazineGrid';

const articles = [
  {
    title: 'Beste Pizza 2026',
    slug: 'beste-pizza',
    image: '/a.webp',
    kicker: 'Guide',
    date: '2026-09-25',
    issue: 27,
  },
  { title: 'Neukölln Guide', slug: 'nk-guide', image: '/b.webp', kicker: 'Guide', issue: 26 },
] as any;

describe('MagazineGrid', () => {
  it('links articles to the news route', () => {
    const html = renderToStaticMarkup(<MagazineGrid articles={articles} locale="de" />);
    expect(html).toContain('/news/beste-pizza');
    expect(html).toContain('Beste Pizza 2026');
    expect(html).toContain('Auf dem Teller');
    expect(html).not.toContain('Alle Artikel');
    expect(html).not.toContain('href="/news" class="hv-link"');
  });
  it('prints issue number and month like a magazine, never the full date', () => {
    const html = renderToStaticMarkup(<MagazineGrid articles={articles} locale="de" />);
    // The issue counts from the oldest article, not the stack position.
    expect(html).toContain('Issue 27 · September 2026');
    expect(html).toContain('Issue 26');
    expect(html).toContain('September 2026');
    expect(html).not.toContain('25. September 2026');
  });
  it('loads the masthead lazily, so it never competes with the hero', () => {
    const html = renderToStaticMarkup(<MagazineGrid articles={articles} locale="de" />);
    expect(html).not.toContain('rel="preload"');
  });
  it('sizes long headlines down instead of cutting them', () => {
    const long = 'Crapulix: Handgemachte Croissants und Canelés in Steglitz';
    expect(headlineSize(long)).toBeLessThan(headlineSize('Beste Pizza 2026'));
    expect(headlineSize('x'.repeat(200))).toBe(5.4);
    expect(headlineSize('Kurz')).toBe(7.6);
  });
  it('renders nothing when empty', () => {
    expect(renderToStaticMarkup(<MagazineGrid articles={[]} locale="de" />)).toBe('');
  });
});
