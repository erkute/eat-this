// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ countHome: vi.fn() }));

vi.mock('@/lib/analytics', () => ({ countHome: mocks.countHome }));

import HomeHeatTracker from './HomeHeatTracker';

function rect(top: number, height: number, left = 0, width = 400): DOMRect {
  return {
    top,
    height,
    left,
    width,
    bottom: top + height,
    right: left + width,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}

/** Eine Startseite aus drei Abschnitten, 3000 px hoch, Bildschirm 800 px. */
function mountPage() {
  document.body.innerHTML = `
    <main data-hub>
      <section data-hub-hero><a href="/map" id="cta">Must Eats entdecken</a></section>
      <section data-hub-map-intro><button id="ask" aria-label="Frag Remy">?</button></section>
      <section data-hub-faq><p id="text">Lesetext</p></section>
    </main>`;
  const set = (selector: string, box: DOMRect) => {
    const el = document.querySelector(selector)!;
    el.getBoundingClientRect = () => box;
    el.getClientRects = () => [box] as unknown as DOMRectList;
  };
  set('[data-hub]', rect(0, 3000));
  set('[data-hub-hero]', rect(0, 800));
  set('[data-hub-map-intro]', rect(800, 1000));
  set('[data-hub-faq]', rect(1800, 1200));
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
}

describe('HomeHeatTracker', () => {
  beforeEach(() => {
    mocks.countHome.mockReset();
    mountPage();
  });
  afterEach(() => cleanup());

  it('schickt beim Verlassen einmal Tiefe und erreichte Abschnitte', () => {
    const { unmount } = render(<HomeHeatTracker />);
    unmount();
    expect(mocks.countHome).toHaveBeenCalledTimes(1);
    expect(mocks.countHome).toHaveBeenCalledWith({
      home: 'scroll',
      device: 'phone',
      depth: 800 / 3000,
      reached: ['hero'],
    });
  });

  it('zaehlt einen Klick mit Abschnitt, Position und Ziel', () => {
    render(<HomeHeatTracker />);
    document
      .getElementById('ask')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 100, clientY: 1050 }));
    expect(mocks.countHome).toHaveBeenCalledWith({
      home: 'click',
      device: 'phone',
      section: 'map',
      x: 0.25,
      y: 0.25,
      target: 'Frag Remy',
    });
  });

  it('nimmt fuer einen internen Link den Pfad und zaehlt Klicks auf Text ohne Ziel', () => {
    render(<HomeHeatTracker />);
    // jsdom kann nicht navigieren.
    document.getElementById('cta')!.addEventListener('click', (e) => e.preventDefault());
    document
      .getElementById('cta')!
      .dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 0, clientY: 0 })
      );
    document
      .getElementById('text')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 0, clientY: 1800 }));
    expect(mocks.countHome.mock.calls[0][0]).toMatchObject({ section: 'hero', target: '/map' });
    expect(mocks.countHome.mock.calls[1][0]).toEqual({
      home: 'click',
      device: 'phone',
      section: 'faq',
      x: 0,
      y: 0,
    });
  });
});
