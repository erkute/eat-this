// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { armArticleMotion } from './articleMotion';

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;
let observed: { callback: Callback; targets: Element[] }[] = [];

class FakeObserver {
  targets: Element[] = [];
  constructor(public callback: Callback) {
    observed.push(this);
  }
  observe(el: Element) {
    this.targets.push(el);
  }
  disconnect() {}
  unobserve() {}
}

function article() {
  document.body.innerHTML = `
    <div data-page="news-article">
      <div data-article-content>
        <p>Einstieg</p>
        <h2 id="goldies">goldies</h2>
        <span data-motion="spot"><span data-motion="print"></span><a data-motion="pop">Zur Map</a></span>
      </div>
    </div>`;
  return document.querySelector<HTMLElement>('[data-page="news-article"]')!;
}

const entry = (target: Element, isIntersecting: boolean, top: number) => ({
  target,
  isIntersecting,
  boundingClientRect: { top } as DOMRect,
  rootBounds: { top: 0, bottom: 800 } as DOMRect,
});

const frames = () => new Promise((resolve) => setTimeout(resolve, 1200));

beforeEach(() => {
  observed = [];
  globalThis.IntersectionObserver = FakeObserver as unknown as typeof IntersectionObserver;
  window.matchMedia = vi.fn(() => ({ matches: false }) as MediaQueryList);
});

afterEach(() => {
  document.documentElement.removeAttribute('data-article-intro');
});

describe('armArticleMotion', () => {
  it('stays still with reduced motion', () => {
    window.matchMedia = vi.fn(() => ({ matches: true }) as MediaQueryList);
    const root = article();
    armArticleMotion(root);
    expect(observed).toHaveLength(0);
    expect(root.querySelector('h2')!.style.visibility).toBe('');
  });

  it('plays once and ignores boundary crossings caused by its own transform', async () => {
    const root = article();
    const cleanup = armArticleMotion(root);
    const heading = root.querySelector<HTMLElement>('h2')!;
    const { callback } = observed[0];

    callback([entry(heading, false, 1400)]);
    expect(heading.style.visibility).toBe('hidden');

    callback([entry(heading, true, 600)]);
    callback([entry(heading, false, 1200)]);
    await frames();
    expect(heading.style.visibility).toBe('visible');
    expect(heading.style.transform).not.toContain('scale(1.08');

    callback([entry(heading, false, 1200)]);
    await frames();
    expect(heading.style.visibility).toBe('visible');

    cleanup();
    expect(heading.style.visibility).toBe('');
    expect(heading.style.transform).toBe('');
  });

  it('shows at once what the reader has already scrolled past', () => {
    const root = article();
    armArticleMotion(root);
    const heading = root.querySelector<HTMLElement>('h2')!;
    observed[0].callback([entry(heading, false, -900)]);
    expect(heading.style.visibility).toBe('visible');
  });

  // Die Vorschau der Desktop-App und Tabs im Hintergrund lassen keine
  // Animation laufen — dort darf nichts versteckt werden, sonst bliebe es
  // unsichtbar. Scharf wird erst, wenn der Tab sichtbar ist.
  it('hides nothing in a hidden tab and arms once it shows', () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    const root = article();
    const cleanup = armArticleMotion(root);
    const heading = root.querySelector<HTMLElement>('h2')!;
    expect(observed).toHaveLength(0);
    expect(heading.style.visibility).toBe('');

    visibility.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(observed).toHaveLength(1);
    expect(heading.style.visibility).toBe('hidden');
    cleanup();
    visibility.mockRestore();
  });

  it('lets the intro mark go once the intro has run, and on leaving', () => {
    vi.useFakeTimers();
    document.documentElement.setAttribute('data-article-intro', '');
    const cleanup = armArticleMotion(article());
    expect(document.documentElement.hasAttribute('data-article-intro')).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(document.documentElement.hasAttribute('data-article-intro')).toBe(false);

    document.documentElement.setAttribute('data-article-intro', '');
    cleanup();
    expect(document.documentElement.hasAttribute('data-article-intro')).toBe(false);
    vi.useRealTimers();
  });

  // Am Telefon ist „Weitere Ausgaben" ein Querscroller mit Einrasten: er
  // rastete auf das noch versetzte Heft ein und lief beim Austeilen mit
  // (03.10.2026). Solange die Hefte unterwegs sind, rastet nichts ein.
  it('keeps the dealt rail from snapping until the issues have landed', async () => {
    document.body.innerHTML = `
      <div data-page="news-article">
        <ul data-motion="deal"><li>27</li><li>26</li></ul>
      </div>`;
    const root = document.querySelector<HTMLElement>('[data-page="news-article"]')!;
    const rail = root.querySelector<HTMLElement>('[data-motion="deal"]')!;
    const cleanup = armArticleMotion(root);
    expect(rail.style.scrollSnapType).toBe('none');

    observed[0].callback([entry(rail, true, 600)]);
    await frames();
    expect(rail.style.scrollSnapType).toBe('');

    observed[0].callback([entry(rail, false, 1200)]);
    await frames();
    expect(rail.style.scrollSnapType).toBe('');

    cleanup();
    expect(rail.style.scrollSnapType).toBe('');
  });
});
