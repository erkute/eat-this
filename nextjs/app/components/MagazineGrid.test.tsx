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
import MagazineGrid from './MagazineGrid';

const articles = [
  {
    title: 'Beste Pizza 2026',
    slug: 'beste-pizza',
    image: '/a.webp',
    date: '2026-09-25',
    issue: 27,
    cover: null,
  },
  { title: 'Neukölln Guide', slug: 'nk-guide', image: '/b.webp', issue: 26, cover: null },
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
    expect(html).toContain('data-cover-issue="27"');
    expect(html).toContain('data-cover-issue="26"');
    expect(html).toContain('September 2026');
    expect(html).not.toContain('25. September 2026');
  });
  it('loads the masthead lazily, so it never competes with the hero', () => {
    const html = renderToStaticMarkup(<MagazineGrid articles={articles} locale="de" />);
    expect(html).not.toContain('rel="preload"');
  });
  it('renders nothing when empty', () => {
    expect(renderToStaticMarkup(<MagazineGrid articles={[]} locale="de" />)).toBe('');
  });
});
