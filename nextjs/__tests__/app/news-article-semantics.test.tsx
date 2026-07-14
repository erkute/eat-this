import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('@/lib/PortableTextRenderer', () => ({ PortableTextRenderer: () => null }));
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
  });
});
