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
    // Die Spot-Karte trägt beide Ziele: der Name verlinkt gefolgt auf die
    // Spot-Seite (sonst geben die Guides ihre Relevanz an keine Restaurantseite
    // weiter – Google rankte dann den Guide für Marken-Queries einzelner
    // Spots), der Knopf öffnet weiter die Map wie ein Tap in der App. Das
    // nofollow auf dem Map-Link prüft der Shell-Test – der Link-Mock hier
    // reicht nur href und className durch.
    expect(html).toContain('href="/restaurant/sofi"');
    expect(html).toContain('href="/map?r=sofi"');
  });
});
