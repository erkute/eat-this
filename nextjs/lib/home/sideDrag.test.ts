// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { armSideDrag, settleIndex, type SideDragGeometry } from './sideDrag';

describe('settleIndex', () => {
  // Karten 200px breit, fünf Stück.
  it('lands on the nearest card without momentum', () => {
    expect(settleIndex(1.4, 0, 200, 5)).toBe(1);
    expect(settleIndex(1.6, 0, 200, 5)).toBe(2);
  });

  it('carries a flick on by its speed', () => {
    // 3 px/ms tragen 540px weiter: fast drei Karten.
    expect(settleIndex(1, 3, 200, 5)).toBe(4);
  });

  it('turns at least one card on a quick short flick', () => {
    // 0,2 Karten Weg, aber schnell: blättert weiter statt zurückzufedern.
    expect(settleIndex(1.2, 0.5, 200, 5)).toBe(2);
    expect(settleIndex(0.8, -0.5, 200, 5)).toBe(0);
  });

  it('springs back from a slow short drag', () => {
    expect(settleIndex(1.2, 0.2, 200, 5)).toBe(1);
  });

  it('never leaves the stage', () => {
    expect(settleIndex(3.9, 5, 200, 5)).toBe(4);
    expect(settleIndex(0.1, -5, 200, 5)).toBe(0);
  });
});

describe('armSideDrag', () => {
  let surface: HTMLDivElement;
  let scrollTo: ReturnType<typeof vi.fn>;
  let disarm: () => void;
  let reduced = true;
  // Bühne mit fünf Karten, 500px Scroll pro Karte, Karte 1 steht gerade in
  // der Mitte (Karte 0 lag 500px weiter oben).
  const geometry: SideDragGeometry = { start: -500, step: 500, count: 5, finger: 200 };

  const pointer = (
    type: string,
    x: number,
    y: number,
    { id = 1, kind = 'touch', t = 0 }: { id?: number; kind?: string; t?: number } = {}
  ) => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
    Object.defineProperties(event, {
      pointerId: { value: id },
      pointerType: { value: kind },
      isPrimary: { value: true },
      timeStamp: { value: t },
    });
    surface.dispatchEvent(event);
  };

  beforeEach(() => {
    reduced = true;
    surface = document.createElement('div');
    document.body.appendChild(surface);
    scrollTo = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    Object.defineProperty(window, 'scrollY', { value: 1000, configurable: true });
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce') && reduced,
    })) as unknown as typeof window.matchMedia;
    disarm = armSideDrag(surface, () => geometry);
  });

  afterEach(() => {
    disarm();
    surface.remove();
  });

  it('marks the surface for `touch-action: pan-y` (globals.css)', () => {
    expect(surface.hasAttribute('data-side-drag')).toBe(true);
  });

  it('moves the page scroll along with a sideways drag', () => {
    pointer('pointerdown', 300, 400);
    pointer('pointermove', 290, 400); // übernimmt hier
    pointer('pointermove', 190, 400); // 100px nach links = halbe Karte vor
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 1250, behavior: 'instant' });
  });

  it('does not jump when the stage has not pinned yet', () => {
    disarm();
    // Die Bühne steht noch 100px unter ihrer Pin-Linie (Karte -0,2).
    disarm = armSideDrag(surface, () => ({ ...geometry, start: 100 }));
    pointer('pointerdown', 300, 400);
    pointer('pointermove', 290, 400);
    pointer('pointermove', 289, 400);
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 1002.5, behavior: 'instant' });
  });

  it('leaves a vertical swipe alone', () => {
    pointer('pointerdown', 300, 400);
    pointer('pointermove', 302, 380);
    pointer('pointermove', 250, 300);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('ignores the mouse — it has a wheel', () => {
    pointer('pointerdown', 300, 400, { kind: 'mouse' });
    pointer('pointermove', 100, 400, { kind: 'mouse' });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('settles on a whole card when the finger lets go', () => {
    pointer('pointerdown', 300, 400, { t: 0 });
    pointer('pointermove', 290, 400, { t: 300 });
    pointer('pointermove', 150, 400, { t: 600 }); // 0,7 Karten, langsam
    pointer('pointerup', 150, 400, { t: 900 });
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 1500, behavior: 'instant' });
  });

  it('swallows the click that follows a drag, not a plain tap', () => {
    const clicked = vi.fn();
    surface.addEventListener('click', clicked);
    pointer('pointerdown', 300, 400);
    pointer('pointerup', 300, 400);
    surface.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(clicked).toHaveBeenCalledTimes(1);

    pointer('pointerdown', 300, 400);
    pointer('pointermove', 280, 400);
    pointer('pointerup', 200, 400);
    surface.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it('cleans up after itself', () => {
    disarm();
    expect(surface.hasAttribute('data-side-drag')).toBe(false);
    pointer('pointerdown', 300, 400);
    pointer('pointermove', 100, 400);
    expect(scrollTo).not.toHaveBeenCalled();
    disarm = () => {};
  });
});
