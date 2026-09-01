import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
  // The spot cards link through MapIntentLink, which prefetches the map route.
  useRouter: () => ({ push: () => {}, prefetch: () => {} }),
}));
vi.mock('@/lib/PortableTextRenderer', () => ({
  extractHeadings: () => [],
  PortableTextRenderer: ({
    renderSpotCard,
  }: {
    renderSpotCard?: (block: {
      _type: 'spotCard';
      restaurantName: string;
      restaurantSlug: string;
      district: string;
      cuisineType: string;
    }) => ReactNode;
  }) =>
    renderSpotCard?.({
      _type: 'spotCard',
      restaurantName: 'Sofi',
      restaurantSlug: 'sofi',
      district: 'Mitte',
      cuisineType: 'Bakery',
    }) ?? null,
}));
vi.mock('@/app/components/SiteFooter', () => ({ default: () => <footer role="contentinfo" /> }));
vi.mock('@/app/components/NewsArticleShare', () => ({ default: () => null }));
vi.mock('@/app/components/Breadcrumbs', () => ({ default: () => <nav aria-label="Breadcrumb" /> }));

import NewsArticleShell from '@/app/components/NewsArticleShell';

describe('NewsArticleShell semantics', () => {
  it('exposes one main landmark containing the editorial article', () => {
    const html = renderToStaticMarkup(
      <NewsArticleShell
        article={{
          _id: 'news-1',
          slug: 'pizza-in-berlin',
          title: 'Pizza in Berlin',
          titleDe: 'Pizza in Berlin',
          date: '2026-07-14',
          content: [],
          contentDe: [],
        }}
        locale="de"
        isActive
      />
    );

    expect(html.match(/<main\b/g)).toHaveLength(1);
    expect(html).toMatch(/<main\b[^>]*><article>/);
    expect(html).toContain('<h1');
    // Die Kartenfläche führt auf die Map — Name und Knopf beide. Der gefolgte
    // Link auf die Spot-Seite sitzt auf der Meta-Zeile darüber, damit die
    // Guides ihre Relevanz überhaupt an Restaurantseiten weitergeben. Das
    // nofollow prüft der Shell-Test, der Link-Mock hier reicht nur href und
    // className durch.
    expect(html.match(/href="\/map\?r=sofi"/g)).toHaveLength(2);
    expect(html).toContain('href="/restaurant/sofi"');
  });
});
