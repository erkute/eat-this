// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bookGeometry,
  canOpenMagazine,
  edgeOnAt,
  onPage,
  openMagazine,
  pageRects,
} from './magazineOpen';

const classes = {
  overlay: 'overlay',
  table: 'table',
  book: 'book',
  page: 'page',
  shadow: 'shadow',
  gutter: 'gutter',
  strip: 'strip',
  front: 'front',
  back: 'back',
  skin: 'skin',
  inside: 'inside',
  backFolio: 'backFolio',
  backMark: 'backMark',
  capTop: 'capTop',
  capBottom: 'capBottom',
};

function magazine() {
  const link = document.createElement('a');
  const cover = document.createElement('span');
  cover.setAttribute('data-magazine-cover', '');
  const folio = document.createElement('span');
  folio.setAttribute('data-cover-folio', '');
  folio.textContent = 'Issue 3 · April 2026';
  cover.append(folio);
  link.append(cover);
  document.body.append(link);
  return { link, cover };
}

function land(slug: string) {
  const page = document.createElement('div');
  page.dataset.page = 'news-article';
  page.dataset.articleSlug = slug;
  document.body.append(page);
  return page;
}

const animate = vi.fn(
  () => ({ finished: Promise.resolve(), cancel: vi.fn() }) as unknown as Animation
);

beforeEach(() => {
  document.body.innerHTML = '';
  Element.prototype.animate = animate;
  window.matchMedia = vi.fn(() => ({ matches: false }) as MediaQueryList);
  globalThis.CSS ??= { escape: (s: string) => s } as typeof CSS;
});

afterEach(() => {
  animate.mockClear();
  // @ts-expect-error — jsdom has no Web Animations; tests add and remove it.
  delete Element.prototype.animate;
});

describe('bookGeometry', () => {
  it('shrinks the opened spread on a phone until both pages fit', () => {
    const g = bookGeometry(390, 844);
    expect(g.w).toBeCloseTo(296.4);
    expect(g.h).toBeCloseTo(395.2);
    expect(g.left).toBeCloseTo((390 - g.w) / 2);
    // Cover and article side by side, 16px to spare on each edge.
    expect(2 * g.w * g.spread).toBeCloseTo(390 - 32);
    expect(g.shift).toBeCloseTo((g.w * g.spread) / 2);
  });

  it('centres the whole spread on a wide window and ends exactly on it', () => {
    const g = bookGeometry(1440, 900);
    expect(g.h).toBeCloseTo(666);
    expect(g.spread).toBe(1);
    expect(g.shift).toBeCloseTo(g.w / 2);
    expect(g.scaleX * g.w).toBeCloseTo(1440);
    expect(g.scaleY * g.h).toBeCloseTo(900);
  });
});

describe('the article on the page', () => {
  it('opens the page as the right half of a centred spread and ends on the window', () => {
    const g = bookGeometry(1440, 900);
    const r = pageRects(g, 1440, 900);
    expect(r.closed).toEqual({ x: g.left, y: g.top, w: g.w, h: g.h });
    // The spine sits in the middle of the window.
    expect(r.open.x).toBeCloseTo(720);
    expect(r.open.w).toBeCloseTo(g.w);
    expect(r.full).toEqual({ x: 0, y: 0, w: 1440, h: 900 });
  });

  it('lays a wide first screen across the page, from the top', () => {
    const m = onPage({ x: 720, y: 117, w: 500, h: 666 }, 1440, 900);
    expect(m.k).toBeCloseTo(500 / 1440);
    expect(m.x).toBeCloseTo(720);
    expect(m.y).toBe(117);
  });

  it('fits a tall phone screen whole, centred, with margins either side', () => {
    const m = onPage({ x: 195, y: 300, w: 180, h: 240 }, 390, 844);
    expect(m.k).toBeCloseTo(240 / 844);
    expect(m.x).toBeCloseTo(195 + (180 - m.k * 390) / 2);
    expect(m.x).toBeGreaterThan(195);
  });

  it('is the article itself, unshrunk, once the page is the window', () => {
    expect(onPage({ x: 0, y: 0, w: 390, h: 844 }, 390, 844)).toEqual({ k: 1, x: 0, y: 0 });
  });
});

describe('the cover bends like a magazine, not a board', () => {
  it('turns its spine strip evenly, edge-on at half way', () => {
    expect(edgeOnAt(0)).toBeCloseTo(0.5, 3);
  });

  it('lets the outer strips lead, so the cover curves while it turns', () => {
    expect(edgeOnAt(1)).toBeLessThan(edgeOnAt(0));
    expect(edgeOnAt(2)).toBeLessThan(edgeOnAt(1));
    expect(edgeOnAt(2)).toBeGreaterThan(0.3);
  });
});

describe('canOpenMagazine', () => {
  it('stays shut with reduced motion', () => {
    window.matchMedia = vi.fn(() => ({ matches: true }) as MediaQueryList);
    expect(canOpenMagazine()).toBe(false);
  });

  it('stays shut without Web Animations', () => {
    // @ts-expect-error — simulate a browser without them.
    delete Element.prototype.animate;
    expect(canOpenMagazine()).toBe(false);
  });
});

describe('openMagazine', () => {
  it('lifts, waits for the article, opens and leaves no trace', async () => {
    const { link, cover } = magazine();
    let article: HTMLElement | undefined;
    const navigate = vi.fn(() =>
      setTimeout(() => {
        article = land('doener');
      }, 20)
    );

    expect(openMagazine({ link, cover, slug: 'doener', navigate, classes })).toBe(true);
    expect(document.querySelector('.overlay')).not.toBeNull();
    expect(link.style.visibility).toBe('hidden');
    // The inside of the cover carries the same issue line as the front.
    expect(document.querySelector('.backFolio')?.textContent).toBe('Issue 3 · April 2026');
    // The route changes only once the table covers the page.
    expect(navigate).not.toHaveBeenCalled();
    // One magazine at a time.
    expect(openMagazine({ link, cover, slug: 'doener', navigate, classes })).toBe(false);

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(document.querySelector('.overlay')).toBeNull());
    expect(link.style.visibility).toBe('');
    // lift + table; per cover strip its turn and both faces (3 × 3);
    // centring + article onto the page; entering + article + gutter
    expect(animate).toHaveBeenCalledTimes(2 + 9 + 2 + 3);
    // The article stands where it stands, without a transform left behind.
    expect(article?.style.transform).toBe('');
    expect(article?.style.transformOrigin).toBe('');
    expect(article?.style.clipPath).toBe('');
  });

  it('still leads to the article when the animation breaks', async () => {
    const { link, cover } = magazine();
    animate.mockImplementationOnce(() => {
      throw new Error('no animation');
    });
    const navigate = vi.fn();
    expect(openMagazine({ link, cover, slug: 'kaffee', navigate, classes })).toBe(true);
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(document.querySelector('.overlay')).toBeNull());
    expect(link.style.visibility).toBe('');
  });

  it('opens again once the first one has landed', async () => {
    const { link, cover } = magazine();
    land('eis');
    const navigate = vi.fn();
    expect(openMagazine({ link, cover, slug: 'eis', navigate, classes })).toBe(true);
    await vi.waitFor(() => expect(document.querySelector('.overlay')).toBeNull());
    expect(openMagazine({ link, cover, slug: 'eis', navigate, classes })).toBe(true);
    await vi.waitFor(() => expect(document.querySelector('.overlay')).toBeNull());
  });
});
