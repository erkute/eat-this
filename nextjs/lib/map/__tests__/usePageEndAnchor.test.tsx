// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isAtPageEnd, usePageEndAnchor } from '../usePageEndAnchor';

/* Die Zahlen aus dem Simulator (iPhone 17, Wen Cheng 1): Seite 3060px, Leiste
   schmal = 754px Viewport, breit = 714px. */
const PAGE = 3060;
const set = (prop: 'innerHeight' | 'scrollY', value: number) =>
  Object.defineProperty(window, prop, { configurable: true, value });
const scrollTo = vi.fn((opts: ScrollToOptions) => set('scrollY', opts.top ?? 0));
const fire = (type: string) => window.dispatchEvent(new Event(type));

describe('isAtPageEnd', () => {
  it('zählt das Ende mit ein paar Pixeln Luft', () => {
    expect(isAtPageEnd(2306, PAGE, 754)).toBe(true);
    expect(isAtPageEnd(2305, PAGE, 754)).toBe(true);
    expect(isAtPageEnd(2306, PAGE, 714)).toBe(false);
  });
});

describe('usePageEndAnchor', () => {
  let phone = true;

  beforeEach(() => {
    phone = true;
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: PAGE,
    });
    window.matchMedia = vi.fn(() => ({ matches: phone }) as MediaQueryList);
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    scrollTo.mockClear();
    set('innerHeight', 754);
    set('scrollY', 0);
  });

  afterEach(() => vi.restoreAllMocks());

  /* Gescrollt bis ans Ende, bei schmaler Leiste. */
  const scrollToEnd = () => {
    set('scrollY', PAGE - 754);
    fire('scroll');
  };

  it('holt das Ende über die Leiste, wenn Safari sie am Ende aufklappt', () => {
    renderHook(() => usePageEndAnchor(true));
    scrollToEnd();

    set('innerHeight', 714);
    fire('resize');

    expect(scrollTo).toHaveBeenCalledWith({ top: PAGE - 714, behavior: 'instant' });
  });

  it('folgt der Leiste über jeden Zwischenschritt ihrer Animation', () => {
    renderHook(() => usePageEndAnchor(true));
    scrollToEnd();

    for (const h of [730, 717, 714]) {
      set('innerHeight', h);
      fire('resize');
    }

    expect(window.scrollY).toBe(PAGE - 714);
  });

  it('lässt die Seite in Ruhe, wenn sie nicht am Ende stand', () => {
    renderHook(() => usePageEndAnchor(true));
    set('scrollY', 1200);
    fire('scroll');

    set('innerHeight', 714);
    fire('resize');

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('wartet, solange ein Finger auf dem Glas liegt', () => {
    renderHook(() => usePageEndAnchor(true));
    scrollToEnd();
    fire('touchstart');

    set('innerHeight', 714);
    fire('resize');
    expect(scrollTo).not.toHaveBeenCalled();

    fire('touchend');
    expect(scrollTo).toHaveBeenCalledWith({ top: PAGE - 714, behavior: 'instant' });
  });

  it('gilt nur auf dem Telefon und nur auf der aktiven Karte', () => {
    phone = false;
    const desktop = renderHook(() => usePageEndAnchor(true));
    scrollToEnd();
    set('innerHeight', 714);
    fire('resize');
    desktop.unmount();

    phone = true;
    set('innerHeight', 754);
    renderHook(() => usePageEndAnchor(false));
    scrollToEnd();
    set('innerHeight', 714);
    fire('resize');

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
