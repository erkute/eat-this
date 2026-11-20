// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bookGeometry,
  canOpenMagazine,
  coverAngle,
  edgeAt,
  onPage,
  openMagazine,
  pageRects,
} from './magazineOpen';

const classes = {
  overlay: 'overlay',
  table: 'table',
  edge: 'edge',
  book: 'book',
  paper: 'paper',
  shadow: 'shadow',
  gutter: 'gutter',
  strip: 'strip',
  front: 'front',
  back: 'back',
  skin: 'skin',
  inside: 'inside',
  backFolio: 'backFolio',
  backMark: 'backMark',
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
  // jsdom decodes no images.
  HTMLImageElement.prototype.decode = () => Promise.resolve();
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
    // Cover and article side by side, 28px to spare on each edge.
    expect(2 * g.w * g.spread).toBeCloseTo(390 - 56);
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

describe('edgeAt', () => {
  const page = { x: 100, y: 200, w: 180, h: 240 };

  it('lays each table edge flush against the page', () => {
    expect(edgeAt('left', page, 390, 844)).toBe('translate(-290px, 0px)');
    expect(edgeAt('right', page, 390, 844)).toBe('translate(280px, 0px)');
    expect(edgeAt('top', page, 390, 844)).toBe('translate(0px, -644px)');
    expect(edgeAt('bottom', page, 390, 844)).toBe('translate(0px, 440px)');
  });

  it('moves every edge out of the window once the page is the window', () => {
    const full = { x: 0, y: 0, w: 390, h: 844 };
    expect(edgeAt('left', full, 390, 844)).toBe('translate(-390px, 0px)');
    expect(edgeAt('right', full, 390, 844)).toBe('translate(390px, 0px)');
    expect(edgeAt('top', full, 390, 844)).toBe('translate(0px, -844px)');
    expect(edgeAt('bottom', full, 390, 844)).toBe('translate(0px, 844px)');
  });
});

describe('the cover turn', () => {
  it('lies flat at both ends of the turn', () => {
    for (const across of [0, 0.5, 1]) {
      expect(coverAngle(0, across)).toBe(0);
      expect(coverAngle(1, across)).toBeCloseTo(180);
    }
  });

  it('peels past vertical at the free edge while the spine is still lifting', () => {
    expect(coverAngle(0.25, 0)).toBeCloseTo(45);
    expect(coverAngle(0.25, 0.5)).toBeGreaterThan(45);
    expect(coverAngle(0.25, 1)).toBeGreaterThan(90);
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
    let overlayHeldAtNavigation = false;
    let coverAtZoom: { strips: number; inside: number } | undefined;
    Element.prototype.animate = function (_keyframes, timing) {
      if (this.className === classes.book && typeof timing === 'object' && timing.duration === 480) {
        coverAtZoom = {
          strips: this.querySelectorAll('.strip').length,
          inside: this.querySelectorAll(':scope > .inside').length,
        };
      }
      return animate();
    };
    const navigate = vi.fn(() => {
      overlayHeldAtNavigation = document.querySelector('.overlay .table') !== null;
      return setTimeout(() => {
        article = land('doener');
      }, 20);
    });

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
    // Each of the six strips turns; its faces swap by backface visibility.
    // The spread and zoom also move the page, the four table edges and the
    // fold shadow.
    expect(animate).toHaveBeenCalledTimes(2 + 6 + 8 + 10);
    expect(document.querySelector('.table')).toBeNull();
    expect(coverAtZoom).toEqual({ strips: 0, inside: 1 });
    // The article stands where it stands, without a transform left behind.
    expect(overlayHeldAtNavigation).toBe(true);
    expect(article?.style.transform).toBe('');
    expect(article?.style.transformOrigin).toBe('');
    expect(article?.style.clipPath).toBe('');
    expect(article?.style.backgroundColor).toBe('');
    expect(document.querySelector('.paper')).toBeNull();
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

  it('restores the canvas and article ground when opening fails after navigation', async () => {
    const { link, cover } = magazine();
    const article = land('pasta');
    article.style.backgroundColor = 'rgb(240, 240, 240)';
    const finished = () =>
      ({ finished: Promise.resolve(), cancel: vi.fn() }) as unknown as Animation;
    animate
      .mockImplementationOnce(finished)
      .mockImplementationOnce(finished)
      .mockImplementationOnce(() => {
        throw new Error('turn interrupted');
      });
    const navigate = vi.fn();
    expect(openMagazine({ link, cover, slug: 'pasta', navigate, classes })).toBe(true);
    await vi.waitFor(() => expect(document.querySelector('.overlay')).toBeNull());
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(article.style.backgroundColor).toBe('rgb(240, 240, 240)');
    expect(document.querySelector('.paper')).toBeNull();
    expect(article.style.transform).toBe('');
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
