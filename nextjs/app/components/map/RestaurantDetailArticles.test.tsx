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

import RestaurantDetailArticles from './RestaurantDetailArticles';

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
  renderToStaticMarkup(<RestaurantDetailArticles articles={articles} locale={locale} />);

describe('RestaurantDetailArticles (Map-Sheet)', () => {
  // Die meisten Spots kommen in keinem Text vor — dann keine leere Überschrift.
  it('renders nothing without articles', () => {
    expect(render([])).toBe('');
  });

  it('links every article in query order', () => {
    const html = render([
      card(),
      card({ _id: 'a2', slug: 'restaurants-mitte', titleDe: 'Essen gehen in Mitte' }),
      card({ _id: 'a3', slug: 'beste-cafes-berlin', titleDe: 'Die besten Cafés' }),
    ]);
    const first = html.indexOf('/news/kolo-coffee-berlin');
    const second = html.indexOf('/news/restaurants-mitte');
    const third = html.indexOf('/news/beste-cafes-berlin');
    expect(first).toBeGreaterThan(-1);
    expect(first).toBeLessThan(second);
    expect(second).toBeLessThan(third);
    expect(html.match(/<li>/g)).toHaveLength(3);
  });

  it('speaks German on DE and English on EN', () => {
    const de = render([card()]);
    expect(de).toContain('Im Magazin');
    expect(de).toContain('Wo ich jetzt meinen Kaffee trinke');
    expect(de).toContain('27. August 2026');

    const en = render([card()], 'en');
    expect(en).toContain('In the magazine');
    expect(en).toContain('Where I Drink My Coffee Now');
    expect(en).not.toContain('Wo ich jetzt meinen Kaffee trinke');
  });

  it('survives a missing image and a missing date', () => {
    const html = render([
      card({ imageUrl: undefined, date: undefined }),
      card({ _id: 'a2', slug: 'x', imageUrl: undefined, date: undefined }),
    ]);
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<time');
  });
});
