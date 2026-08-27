import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { RestaurantArticleCard } from '@/lib/types';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import RestaurantArticlesSection from '@/app/components/RestaurantArticlesSection';

const card = (over: Partial<RestaurantArticleCard> = {}): RestaurantArticleCard => ({
  _id: 'a1',
  slug: 'kolo-coffee-berlin',
  title: 'Where I Drink My Coffee Now',
  titleDe: 'Wo ich jetzt meinen Kaffee trinke',
  categoryLabel: 'Guides',
  categoryLabelDe: 'Guides',
  date: '2026-08-27',
  imageUrl: 'https://cdn.example/kolo.jpg',
  ...over,
});

const render = (articles: RestaurantArticleCard[], locale: 'de' | 'en' = 'de') =>
  renderToStaticMarkup(<RestaurantArticlesSection articles={articles} locale={locale} />);

describe('RestaurantArticlesSection', () => {
  // Ohne Artikel darf der Block nicht als leere Überschrift stehen bleiben —
  // 301 der 466 Spots kommen in keinem Text vor.
  it('renders nothing without articles', () => {
    expect(render([])).toBe('');
  });

  it('links each article and keeps the query order', () => {
    const html = render([
      card(),
      card({ _id: 'a2', slug: 'restaurants-mitte', titleDe: 'Essen gehen in Mitte' }),
    ]);
    expect(html.indexOf('/news/kolo-coffee-berlin')).toBeLessThan(
      html.indexOf('/news/restaurants-mitte')
    );
  });

  it('uses the German title and date on DE', () => {
    const html = render([card()]);
    expect(html).toContain('Wo ich jetzt meinen Kaffee trinke');
    expect(html).toContain('27. August 2026');
    expect(html).not.toContain('Where I Drink My Coffee Now');
  });

  it('uses the English title on EN', () => {
    const html = render([card()], 'en');
    expect(html).toContain('Where I Drink My Coffee Now');
    expect(html).not.toContain('Wo ich jetzt meinen Kaffee trinke');
  });

  // Der Zähler steuert das Raster: ein einzelner Artikel soll keine
  // 900px-Bahn werden.
  it('exposes the article count to the grid', () => {
    expect(render([card()])).toContain('data-count="1"');
    expect(render([card(), card({ _id: 'a2', slug: 'x' })])).toContain('data-count="2"');
  });

  it('survives a missing image and a missing date', () => {
    const html = render([card({ imageUrl: undefined, date: undefined })]);
    expect(html).toContain('Wo ich jetzt meinen Kaffee trinke');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<time');
  });
});
