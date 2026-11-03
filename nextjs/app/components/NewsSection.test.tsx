import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { NewsArticle } from '@/lib/types';

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    prefetch,
    className,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    prefetch?: boolean | null;
    className?: string;
  }) => (
    <a href={href} className={className} data-prefetch={String(prefetch)} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('./SiteFooter', () => ({ default: () => <footer role="contentinfo" /> }));

import NewsSection from './NewsSection';

const story = (n: number, over: Partial<NewsArticle> = {}): NewsArticle => ({
  _id: `id-${n}`,
  slug: `story-${n}`,
  title: `Story ${n}`,
  titleDe: `Geschichte ${n}`,
  date: `2026-07-${String(20 - n).padStart(2, '0')}`,
  imageUrl: `https://cdn.sanity.io/story-${n}.webp?w=800`,
  ...over,
});

// Newest first, like getAllNewsArticles.
const articles = [1, 2, 3, 4, 5].map((n) => story(n));

const render = (list: NewsArticle[] = articles, locale: 'de' | 'en' = 'de') =>
  renderToStaticMarkup(<NewsSection articles={list} locale={locale} />);

describe('NewsSection — current issue', () => {
  it('has no search, filters or archive shortcut', () => {
    const html = render();
    expect(html).not.toContain('type="search"');
    expect(html).not.toContain('<select');
    expect(html).not.toContain('href="#news-archive"');
    expect(html).not.toContain('Im Archiv stöbern');
  });

  it('links the newest article as the front cover and a short „Lesen"', () => {
    const html = render();
    expect(html.match(/href="\/news\/story-1"/g)).toHaveLength(2);
    expect(html).toContain('>Lesen</a>');
    expect(html).toContain('aria-label="Lesen: Geschichte 1"');
    expect(html).toContain('Aktuelle Ausgabe');
  });

  it('loads the visible fan eagerly and the story covers lazily', () => {
    const html = render();
    const eagerPhotos = html.match(/<img[^>]*story-\d\.webp[^>]*loading="eager"/g) ?? [];
    expect(eagerPhotos).toHaveLength(3);
    for (const n of [1, 2, 3]) expect(eagerPhotos.some(photo => photo.includes(`story-${n}.webp`))).toBe(true);
  });

});

describe('NewsSection — issue numbers', () => {
  it('counts down from the number of articles, the oldest is Issue 1', () => {
    const html = render();
    expect(html).toContain('data-cover-issue="5"');
    expect(html).toContain('data-cover-issue="1"');
    expect(html).not.toContain('data-cover-issue="6"');
    expect(html).toContain('Aktuelle Ausgabe · Issue 5');
  });

  it('prints the month in the page language', () => {
    const html = render(articles, 'en');
    expect(html).toContain('July 2026');
    expect(html).not.toContain('Juli');
  });
});

describe('NewsSection — back issues', () => {
  it('splits the two recent issues from the archive without duplicating links or renumbering covers', () => {
    const html = render();
    const recent = html.slice(html.indexOf('aria-labelledby="news-recent"'), html.indexOf('aria-labelledby="news-archive"'));
    const archive = html.slice(html.indexOf('aria-labelledby="news-archive"'));
    expect(recent).toContain('href="/news/story-2"');
    expect(recent).toContain('href="/news/story-3"');
    expect(recent).toContain('data-cover-issue="4"');
    expect(recent).toContain('data-cover-issue="3"');
    expect(archive).toContain('href="/news/story-4"');
    expect(archive).not.toContain('href="/news/story-3"');
    expect(archive).toContain('data-cover-issue="1"');
    expect(render(articles.slice(0, 3))).not.toContain('aria-labelledby="news-archive"');
  });

  it('lists every older article once as a cover on the shelf', () => {
    const html = render();
    const shelf = html.slice(html.indexOf('aria-labelledby="news-recent"'));
    for (const n of [2, 3, 4, 5]) {
      expect(shelf.match(new RegExp(`href="/news/story-${n}"`, 'g'))).toHaveLength(1);
    }
    expect(shelf).not.toContain('href="/news/story-1"');
  });

  it('gives each back issue the look its cover data asks for', () => {
    const cover = {
      dish: true,
      cutout: 'https://cdn.sanity.io/cut.png',
      cutoutWidth: 1600,
      cutoutHeight: 2133,
      box: { x: 0.2, y: 0.3, w: 0.5, h: 0.4 },
    };
    const html = render([story(1), story(2, { cover }), story(3)]);
    const shelf = html.slice(html.indexOf('aria-labelledby="news-recent"'));
    // Issue 2 of 3: a dish gets a cut-out look (Fussband), issue 1 without
    // one a photo look (System).
    expect(shelf.match(/data-cover-look="band"/g)).toHaveLength(1);
    expect(shelf.match(/data-cover-look="system"/g)).toHaveLength(1);
  });

  it('prints the whole headline, never cut', () => {
    const long =
      'Essen und Trinken in Schöneberg – 9 Adressen von acht Uhr morgens bis vier Uhr nachts';
    expect(render([story(1), story(2, { titleDe: long })])).toContain(long);
  });

  it('drops the shelf when there is only the current issue', () => {
    expect(render([story(1)])).not.toContain('news-recent');
    expect(render([story(1)])).not.toContain('news-archive');
  });
});

describe('NewsSection — empty', () => {
  it('falls back to the note when there is nothing to show', () => {
    const html = render([]);
    expect(html).toContain('Aktuell keine Artikel');
    expect(html).toContain('<h1');
    expect(html).not.toContain('<ul');
  });
});
