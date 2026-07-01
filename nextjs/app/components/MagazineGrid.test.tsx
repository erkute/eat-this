import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock('next/image', () => ({ default: () => <img alt="" /> }));
import MagazineGrid from './MagazineGrid';

const articles = [
  { title: 'Beste Pizza 2026', slug: 'beste-pizza', image: '/a.webp', kicker: 'Guide' },
  { title: 'Neukölln Guide', slug: 'nk-guide', image: '/b.webp', kicker: 'Guide' },
] as any;

describe('MagazineGrid', () => {
  it('links articles to the news route', () => {
    const html = renderToStaticMarkup(<MagazineGrid articles={articles} locale="de" />);
    expect(html).toContain('/news/beste-pizza');
    expect(html).toContain('Beste Pizza 2026');
  });
  it('renders nothing when empty', () => {
    expect(renderToStaticMarkup(<MagazineGrid articles={[]} locale="de" />)).toBe('');
  });
});
