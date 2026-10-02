import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MagazineCover, { formatMonth, headlineSize } from './MagazineCover';

const base = {
  title: 'Die 5 besten Pizzerien in Berlin',
  image: 'https://cdn.sanity.io/pizza.webp?w=800',
  kicker: 'Guides',
  issue: 24,
  date: '2026-09-01',
  locale: 'de' as const,
  sizes: '300px',
};

describe('MagazineCover', () => {
  it('prints issue and month at the top, never the full date', () => {
    const html = renderToStaticMarkup(<MagazineCover {...base} />);
    expect(html).toContain('Issue 24 · September 2026');
    expect(html).not.toContain('1. September');
  });

  it('prints only the month for a draft that has no issue yet', () => {
    const html = renderToStaticMarkup(<MagazineCover {...base} issue={null} />);
    expect(html).toContain('>September 2026<');
    expect(html).not.toContain('Issue');
  });

  it('carries the whole headline and the rubric', () => {
    const html = renderToStaticMarkup(<MagazineCover {...base} />);
    expect(html).toContain('>Die 5 besten Pizzerien in Berlin<');
    expect(html).toContain('>Guides<');
  });

  it('keeps the photo silent — the link is named by the headline', () => {
    expect(renderToStaticMarkup(<MagazineCover {...base} />)).toMatch(
      /class="[^"]*photo[^"]*"[^>]*alt=""/
    );
  });

  it('hides the copy of a cover that only lies underneath', () => {
    const html = renderToStaticMarkup(<MagazineCover {...base} decorative />);
    expect(html).toMatch(/class="[^"]*lines[^"]*" aria-hidden="true"/);
  });

  it('loads the page lead at once', () => {
    const html = renderToStaticMarkup(<MagazineCover {...base} priority />);
    expect(html).toContain('fetchPriority="high"');
    expect(html).toContain('loading="eager"');
  });

  it('marks itself for MagazineLink', () => {
    expect(renderToStaticMarkup(<MagazineCover {...base} />)).toContain('data-magazine-cover=""');
  });

  it("waits with photo and masthead when it is not the page's lead", () => {
    const html = renderToStaticMarkup(<MagazineCover {...base} />);
    expect(html).not.toContain('loading="eager"');
    expect(html).not.toContain('fetchPriority');
  });

  it('sizes long headlines down instead of cutting them', () => {
    const long = 'Crapulix: Handgemachte Croissants und Canelés in Steglitz';
    expect(headlineSize(long)).toBeLessThan(headlineSize('Beste Pizza 2026'));
    expect(headlineSize('x'.repeat(200))).toBe(5.4);
    expect(headlineSize('Kurz')).toBe(7.6);
  });

  it('formats the month in the page language and skips bad dates', () => {
    expect(formatMonth('2026-09-01', 'en')).toBe('September 2026');
    expect(formatMonth('2026-07-14', 'de')).toBe('Juli 2026');
    expect(formatMonth('kein Datum', 'de')).toBe('');
    expect(formatMonth(null, 'de')).toBe('');
  });
});
