import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { NewsArticle, PortableTextBlock } from '@/lib/types';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: () => {}, prefetch: () => {} }),
}));
vi.mock('@/app/components/SiteFooter', () => ({ default: () => <footer role="contentinfo" /> }));
vi.mock('@/app/components/Breadcrumbs', () => ({ default: () => <nav aria-label="Breadcrumb" /> }));

import NewsArticleShell from '@/app/components/NewsArticleShell';

const para = (text: string, key = text.slice(0, 8)): PortableTextBlock =>
  ({
    _type: 'block',
    _key: key,
    style: 'normal',
    children: [{ _type: 'span', text }],
  }) as unknown as PortableTextBlock;

const h2 = (text: string): PortableTextBlock =>
  ({
    _type: 'block',
    _key: `h-${text}`,
    style: 'h2',
    children: [{ _type: 'span', text }],
  }) as unknown as PortableTextBlock;

const mustEat = (restaurantName: string): PortableTextBlock =>
  ({
    _type: 'mustEatCard',
    _key: `me-${restaurantName}`,
    mustEatId: `id-${restaurantName}`,
    restaurantName,
    district: 'Schöneberg',
  }) as unknown as PortableTextBlock;

const spot = (restaurantName: string, restaurantSlug: string): PortableTextBlock =>
  ({
    _type: 'spotCard',
    _key: `spot-${restaurantSlug}`,
    restaurantName,
    restaurantSlug,
    district: 'Kreuzberg',
    cuisineType: 'Ice Cream',
  }) as unknown as PortableTextBlock;

function render(content: PortableTextBlock[], over: Partial<NewsArticle> = {}): string {
  return renderToStaticMarkup(
    <NewsArticleShell
      article={{
        _id: 'news-1',
        slug: 'doener',
        title: 'Döner in Berlin',
        titleDe: 'Döner in Berlin',
        date: '2026-04-24',
        content,
        contentDe: content,
        ...over,
      }}
      locale="de"
      isActive
    />
  );
}

describe('NewsArticleShell', () => {
  const opening = 'Ich bin in Berlin aufgewachsen.';

  it('drops the lede when the excerpt repeats the opening paragraph', () => {
    const html = render([para(opening)], { excerptDe: opening, excerpt: opening });
    // The opening survives once — as the article's first paragraph, not twice.
    expect(html.split(opening)).toHaveLength(2);
  });

  it('ignores punctuation and case when comparing lede and opening', () => {
    const html = render([para('„Döner ist Berlin“ — sagen sie.')], {
      excerptDe: 'Döner ist Berlin - sagen sie',
      excerpt: 'Döner ist Berlin - sagen sie',
    });
    expect(html).not.toContain('Döner ist Berlin - sagen sie');
  });

  it('keeps a lede that actually says something else', () => {
    const html = render([para(opening)], {
      excerptDe: 'Fünf Läden, kein Ranking.',
      excerpt: 'Fünf Läden, kein Ranking.',
    });
    expect(html).toContain('Fünf Läden, kein Ranking.');
  });

  it('names each must-eat band after its restaurant so two never read alike', () => {
    const html = render([mustEat('Hasir'), mustEat('Bursa Uludağ Kebapçısı')]);
    expect(html).toContain('Hasir');
    // normalizeName strips the diacritics the display font can't render.
    expect(html).toContain('Bursa Uludag Kebapcisi');
    expect(html).toContain('href="/map?me=id-Hasir"');
  });

  it('sends the spot card to the map, not to the restaurant page', () => {
    const html = render([spot('Spumante', 'spumante')]);
    expect(html).toContain('href="/map?r=spumante"');
    expect(html).not.toContain('/restaurant/spumante');
    expect(html).toContain('Auf die Map');
  });

  it('lists the h2 chapters in the rail', () => {
    const html = render([h2('Saucen'), para('x'), h2('Und jetzt zum traurigen Teil')]);
    expect(html).toContain('href="#saucen"');
    expect(html).toContain('href="#und-jetzt-zum-traurigen-teil"');
  });

  it('reports a reading estimate of at least a minute', () => {
    expect(render([para('Kurz.')])).toContain('1 Min. Lesezeit');
  });
});
