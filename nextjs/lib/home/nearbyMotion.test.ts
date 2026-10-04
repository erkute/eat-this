// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  COUNTER_GLYPHS,
  COUNTER_REEL,
  createNearbyEntrance,
  reelPercent,
  rememberCards,
} from './nearbyMotion';

afterEach(() => vi.unstubAllGlobals());

describe('rememberCards', () => {
  it('merkt sich nichts bei reduzierter Bewegung — die Karten springen um', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }));
    const board = document.createElement('div');
    expect(await rememberCards(board)).toBeNull();
  });

  it('spielt den Weg und beginnt die Leiste wieder vorne', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const board = document.createElement('div');
    board.innerHTML =
      '<div data-flip-id="a"></div><ul data-nearby-rail><li data-flip-id="b"></li></ul>';
    document.body.appendChild(board);
    const flip = await rememberCards(board);
    expect(flip).not.toBeNull();
    // Die Nächste wechselt: „b" kommt in den großen Platz, „a" in die Leiste.
    board.innerHTML =
      '<div data-flip-id="b"></div><ul data-nearby-rail><li data-flip-id="a"></li></ul>';
    const rail = board.querySelector('ul')!;
    rail.scrollTo = vi.fn();
    flip!.play(board);
    expect(rail.scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'instant' });
    board.remove();
  });
});

describe('Zählwerk', () => {
  it('hat jedes Zeichen mehrmals auf der Walze, eins pro Zeile', () => {
    const lines = COUNTER_REEL.split('\n');
    expect(lines.length % COUNTER_GLYPHS.length).toBe(0);
    expect(lines.slice(0, COUNTER_GLYPHS.length)).toEqual(COUNTER_GLYPHS);
  });

  it('stellt Zeichen i um i Zeilen nach oben', () => {
    const rows = COUNTER_REEL.split('\n').length;
    expect(reelPercent(0)).toBeCloseTo(0);
    expect(reelPercent(3)).toBeCloseTo((-3 * 100) / rows);
  });
});

describe('createNearbyEntrance', () => {
  const board = () => {
    const el = document.createElement('div');
    el.innerHTML =
      '<div data-nearby-spread><div data-flip-id="a"><a><span class="hv-photo"></span><span data-stamp></span></a></div>' +
      '<ul data-nearby-rail><li><a><span class="hv-photo"></span><span data-stamp></span></a></li>' +
      '<li><a><span class="hv-photo"></span><span data-stamp></span></a></li></ul></div>';
    document.body.appendChild(el);
    return el;
  };

  it('lässt die Karten bei reduzierter Bewegung einfach liegen', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }));
    const el = board();
    expect(createNearbyEntrance(el)).toBeNull();
    expect(el.hasAttribute('data-dealing')).toBe(false);
    el.remove();
  });

  it('öffnet den Scrollfächer bei Tastaturfokus und räumt die Transformationen auf', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('no-preference'),
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
    }));
    vi.stubGlobal('scrollTo', vi.fn());
    const el = board();
    const entrance = createNearbyEntrance(el)!;
    expect(entrance).not.toBeNull();
    const card = el.querySelector('a')!;
    expect(card.style.transform).not.toBe('');
    card.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(card.style.transform).not.toContain('rotate');
    entrance.dispose();
    expect(card.style.transform).toBe('');
    el.remove();
  });
});
