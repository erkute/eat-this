import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { NewsArticle } from '@/lib/types';

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    className,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className} {...rest}>
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
  it('links the newest article as the front cover and a short „Lesen"', () => {
    const html = render();
    expect(html.match(/href="\/news\/story-1"/g)).toHaveLength(2);
    expect(html).toContain('>Lesen</a>');
    expect(html).toContain('aria-label="Lesen: Geschichte 1"');
    expect(html).toContain('Aktuelle Ausgabe');
  });

  it('loads only the front cover ahead of everything else', () => {
    const html = render();
    expect(html.match(/fetchPriority="high"/g)?.length).toBeGreaterThan(0);
    // The front cover is the one eager photo; every other cover waits.
    const eagerPhotos = html.match(/<img[^>]*story-\d\.webp[^>]*loading="eager"/g) ?? [];
    expect(eagerPhotos).toHaveLength(1);
    expect(eagerPhotos[0]).toContain('story-1.webp');
  });

  it('lays the two issues before it underneath, silent and without a link', () => {
    const html = render();
    const pile = html.match(/<span class="[^"]*pileCover[^"]*"[^>]*>/g) ?? [];
    expect(pile).toHaveLength(2);
    for (const cover of pile) expect(cover).toContain('aria-hidden="true"');
  });
});

describe('NewsSection — issue numbers', () => {
  it('counts down from the number of articles, the oldest is Issue 1', () => {
    const html = render();
    expect(html).toContain('Issue 5 · Juli 2026');
    expect(html).toContain('Issue 1 · Juli 2026');
    expect(html).not.toContain('Issue 6');
    expect(html).toContain('Aktuelle Ausgabe<span');
  });

  it('prints the month in the page language', () => {
    expect(render(articles, 'en')).toContain('Issue 5 · July 2026');
  });
});

describe('NewsSection — back issues', () => {
  it('lists every older article once as a cover on the shelf', () => {
    const html = render();
    const shelf = html.slice(html.indexOf('Frühere Ausgaben'));
    for (const n of [2, 3, 4, 5]) {
      expect(shelf.match(new RegExp(`href="/news/story-${n}"`, 'g'))).toHaveLength(1);
    }
    expect(shelf).not.toContain('href="/news/story-1"');
  });

  it('puts the rubric on the cover and leaves it out when there is none', () => {
    const html = render([story(1), story(2, { categoryLabelDe: 'Guides' }), story(3)]);
    const shelf = html.slice(html.indexOf('Frühere Ausgaben'));
    expect(shelf.match(/>Guides</g)).toHaveLength(1);
    expect(shelf.match(/class="[^"]*flash/g)).toHaveLength(1);
  });

  it('prints the whole headline, never cut', () => {
    const long =
      'Essen und Trinken in Schöneberg – 9 Adressen von acht Uhr morgens bis vier Uhr nachts';
    expect(render([story(1), story(2, { titleDe: long })])).toContain(long);
  });

  it('drops the shelf when there is only the current issue', () => {
    expect(render([story(1)])).not.toContain('Frühere Ausgaben');
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
