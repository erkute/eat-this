import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getArticleBySlug: vi.fn(),
  getAllNewsArticles: vi.fn(),
}));

vi.mock('next-intl/server', () => ({ setRequestLocale: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('@/lib/sanity.server', () => ({
  getArticleBySlug: mocks.getArticleBySlug,
  getAllArticleSlugs: vi.fn(),
  getAllNewsArticles: mocks.getAllNewsArticles,
}));
vi.mock('@/app/components/NewsArticleShell', () => ({ default: () => null }));

import NewsArticlePage from '@/app/[locale]/(spa)/news/[slug]/page';
import { articleBySlugQuery } from '@/lib/queries';

beforeEach(() => {
  mocks.getArticleBySlug.mockReset();
  mocks.getAllNewsArticles.mockReset();
});

describe('news article JSON-LD', () => {
  it('uses Sanity updatedAt for dateModified', async () => {
    expect(articleBySlugQuery).toContain('"updatedAt": _updatedAt');
    mocks.getArticleBySlug.mockResolvedValueOnce({
      _id: 'news-1',
      slug: 'pizza-in-berlin',
      title: 'Pizza in Berlin',
      titleDe: 'Pizza in Berlin',
      excerpt: 'Pizza.',
      excerptDe: 'Pizza.',
      content: [{ _type: 'block' }],
      contentDe: [{ _type: 'block' }],
      date: '2026-07-10T08:00:00Z',
      updatedAt: '2026-07-14T09:30:00Z',
    });
    mocks.getAllNewsArticles.mockResolvedValueOnce([]);

    const element = await NewsArticlePage({
      params: Promise.resolve({ locale: 'de', slug: 'pizza-in-berlin' }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('"datePublished":"2026-07-10T08:00:00Z"');
    expect(html).toContain('"dateModified":"2026-07-14T09:30:00Z"');
  });

  // Unter /news liegen immergrüne Guides und Kolumnen, keine Meldungen.
  // `NewsArticle` behauptet Aktualität und macht eine Zusage Richtung Top
  // Stories, für die diese Seite weder angemeldet ist noch eine
  // Erscheinungsfrequenz hat.
  it('declares Article, not NewsArticle', async () => {
    mocks.getArticleBySlug.mockResolvedValueOnce({
      _id: 'news-1',
      slug: 'beste-baeckereien-berlin',
      title: 'The best bakeries in Berlin',
      titleDe: 'Die besten Bäckereien in Berlin',
      excerpt: 'Brot.',
      excerptDe: 'Brot.',
      content: [{ _type: 'block' }],
      contentDe: [{ _type: 'block' }],
      date: '2026-08-26T08:00:00Z',
    });
    mocks.getAllNewsArticles.mockResolvedValueOnce([]);

    const element = await NewsArticlePage({
      params: Promise.resolve({ locale: 'de', slug: 'beste-baeckereien-berlin' }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('"@type":"Article"');
    // Gezielt auf den Typ im JSON-LD, nicht auf das blosse Wort: die Komponente
    // heisst NewsArticleShell, ihr Klassenname liesse die Pruefung sonst
    // fehlschlagen, sobald jemand den Mock in dieser Datei entfernt.
    expect(html).not.toContain('"@type":"NewsArticle"');
  });
});
