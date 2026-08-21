import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { NewsArticle } from '@/lib/types';

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    sizes,
    priority,
    className,
  }: {
    src: string;
    alt: string;
    sizes: string;
    priority?: boolean;
    className?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      sizes={sizes}
      className={className}
      data-priority={priority ? 'true' : undefined}
    />
  ),
}));
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
}));
vi.mock('./Breadcrumbs', () => ({ default: () => <nav aria-label="Breadcrumb" /> }));
vi.mock('./SiteFooter', () => ({ default: () => <footer role="contentinfo" /> }));

import NewsSection from './NewsSection';

const articles: NewsArticle[] = [
  {
    _id: 'lead',
    slug: 'lead-story',
    title: 'Lead story',
    titleDe: 'Titelstory',
    date: '2026-07-14',
    imageUrl: 'https://cdn.sanity.io/lead.webp',
    alt: 'Lead food',
  },
  {
    _id: 'latest',
    slug: 'latest-story',
    title: 'Latest story',
    titleDe: 'Neue Story',
    date: '2026-07-13',
    imageUrl: 'https://cdn.sanity.io/latest.webp',
    alt: 'Latest food',
  },
];

describe('NewsSection images', () => {
  it('serves responsive images and prioritizes only the first tile', () => {
    const html = renderToStaticMarkup(<NewsSection articles={articles} locale="de" />);

    expect(html).toContain('src="https://cdn.sanity.io/lead.webp"');
    expect(html).toContain('src="https://cdn.sanity.io/latest.webp"');
    expect(html.match(/sizes="\(max-width: 960px\) 46vw, 380px"/g)).toHaveLength(2);
    expect(html).toContain('data-priority="true"');
    expect(html.match(/data-priority=/g)).toHaveLength(1);
    expect(html).not.toContain('background-image');
  });
});

describe('NewsSection cards', () => {
  it('lists every story as a tile — no separate lead treatment', () => {
    const html = renderToStaticMarkup(<NewsSection articles={articles} locale="de" />);

    expect(html.match(/href="\/news\//g)).toHaveLength(2);
    expect(html).toContain('href="/news/lead-story"');
    expect(html).toContain('href="/news/latest-story"');
  });

  it('uses the category as the card kicker and omits it when there is none', () => {
    const html = renderToStaticMarkup(
      <NewsSection
        articles={[{ ...articles[0], categoryLabelDe: 'Guides' }, articles[1]]}
        locale="de"
      />
    );

    expect(html).toContain('Guides');
    expect(html).toContain('Titelstory');
  });

  it('prints the publication date under the title as a machine-readable time', () => {
    const html = renderToStaticMarkup(<NewsSection articles={articles} locale="de" />);

    // renderToStaticMarkup emits the JSX casing; HTML attribute names parse
    // case-insensitively, so this is the `datetime` attribute either way.
    expect(html).toMatch(/<time[^>]*dateTime="2026-07-14"[^>]*>14\. Juli 2026<\/time>/i);
    // Title first, date after it — the date is the last line on the tile.
    expect(html.indexOf('Titelstory')).toBeLessThan(html.indexOf('14. Juli 2026'));
  });

  it('omits the date element when an article carries no usable date', () => {
    const html = renderToStaticMarkup(
      <NewsSection articles={[{ ...articles[0], date: '' }]} locale="de" />
    );

    expect(html).not.toContain('<time');
  });

  it('falls back to the empty note when there is nothing to show', () => {
    const html = renderToStaticMarkup(<NewsSection articles={[]} locale="de" />);

    expect(html).toContain('Aktuell keine Artikel');
    expect(html).not.toContain('<ul');
  });
});
