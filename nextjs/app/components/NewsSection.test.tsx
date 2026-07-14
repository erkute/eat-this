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
  Link: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
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
  it('serves responsive images and prioritizes only the lead story', () => {
    const html = renderToStaticMarkup(<NewsSection articles={articles} locale="de" />);

    expect(html).toContain('src="https://cdn.sanity.io/lead.webp"');
    expect(html).toContain('sizes="(max-width: 700px) 100vw, 900px"');
    expect(html).toContain('data-priority="true"');
    expect(html).toContain('src="https://cdn.sanity.io/latest.webp"');
    expect(html).toContain(
      'sizes="(max-width: 700px) calc(100vw - 32px), (max-width: 1040px) 38vw, 342px"'
    );
    expect(html.match(/data-priority=/g)).toHaveLength(1);
    expect(html).not.toContain('background-image');
  });
});
