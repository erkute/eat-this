import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CUTOUT_LOOKS, PHOTO_LOOKS, type CoverData, type CoverLook } from '@/lib/magazineCover';
import MagazineCover, { formatMonth } from './MagazineCover';

const title = 'Burger in Berlin: 6 Buden für verschiedene Lebenslagen';
const base = {
  title,
  image: 'https://cdn.sanity.io/images/p/d/burger-1600x1280.jpg?w=800',
  issue: 20,
  date: '2026-08-26',
  locale: 'de' as const,
  sizes: '300px',
};
const dish: CoverData = {
  dish: true,
  cutout: 'https://cdn.sanity.io/images/p/d/cut-1600x1280.png',
  cutoutWidth: 1600,
  cutoutHeight: 1280,
  box: { x: 0.19, y: 0.23, w: 0.6, h: 0.55 },
  palette: { dominant: { background: '#ddd', foreground: '#000' }, dark: '#5a4a3a', light: '#ddd' },
};

const render = (props: Partial<Parameters<typeof MagazineCover>[0]> = {}) =>
  renderToStaticMarkup(<MagazineCover {...base} {...props} />);
const as = (look: CoverLook) => render({ cover: { ...dish, look } });

describe('MagazineCover', () => {
  it.each([...PHOTO_LOOKS, ...CUTOUT_LOOKS])('%s carries the whole headline as text', (look) => {
    const html = as(look);
    expect(html).toContain(`data-cover-look="${look}"`);
    expect(html).toContain(`>${title}<`);
  });

  it.each([...PHOTO_LOOKS, ...CUTOUT_LOOKS])('%s keeps every image silent', (look) => {
    for (const img of as(look).match(/<img[^>]*>/g) ?? []) expect(img).toContain('alt=""');
  });

  it('crops the cut-out to the dish for the cut-out looks', () => {
    expect(as('still')).toContain('rect=304,294,960,704');
    expect(as('perfect')).toContain('rect=304,294,960,704');
  });

  it('lays photo and cut-out over each other in front of the logo', () => {
    const html = as('front');
    expect(html).toContain('cut-1600x1280.png?w=');
    expect(html).toContain('burger-1600x1280.jpg?w=');
  });

  it('tints the LOVE logo from the photo', () => {
    expect(as('love')).toContain('--fill:#5a4a3a');
  });

  it('sets the plate headline straight, not round a circle', () => {
    const html = as('plate');
    expect(html).not.toContain('<svg');
    expect(html).toContain('Auf dem Teller · Issue 20 · August 2026');
    expect(render({ cover: { look: 'plate' }, locale: 'en' })).toContain('On the plate · Issue 20');
  });

  it('prints the issue and month, never the full date', () => {
    const html = as('field');
    expect(html).toContain('Issue 20');
    expect(html).toContain('August 2026');
    expect(html).not.toContain('26. August');
  });

  it('falls back to a photo look when a cut-out look has nothing cut out', () => {
    expect(render({ cover: { look: 'still' } })).not.toContain('data-cover-look="still"');
  });

  it('loads the page lead at once', () => {
    const html = render({ priority: true });
    expect(html).toContain('fetchPriority="high"');
    expect(html).toContain('loading="eager"');
  });

  it("waits with its images when it is not the page's lead", () => {
    const html = render({ cover: dish });
    expect(html).not.toContain('loading="eager"');
    expect(html).not.toContain('fetchPriority');
  });

  it('marks itself for MagazineLink', () => {
    expect(render()).toContain('data-magazine-cover=""');
  });

  it('formats the month in the page language and skips bad dates', () => {
    expect(formatMonth('2026-09-01', 'en')).toBe('September 2026');
    expect(formatMonth('2026-07-14', 'de')).toBe('Juli 2026');
    expect(formatMonth('kein Datum', 'de')).toBe('');
    expect(formatMonth(null, 'de')).toBe('');
  });
});
