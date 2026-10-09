// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MouseEvent } from 'react';
import { rememberDiscoveryImage, takeDiscoveryImage } from './discovery-motion';

function departure(overrides = {}): MouseEvent<HTMLAnchorElement> {
  const anchor = document.createElement('a');
  anchor.href = 'http://localhost/bezirk/mitte';
  return { currentTarget: anchor, button: 0, ...overrides } as MouseEvent<HTMLAnchorElement>;
}
function photo() {
  const image = document.createElement('img');
  Object.defineProperties(image, {
    currentSrc: { value: 'https://cdn.sanity.io/images/p/d/photo.jpg' },
    complete: { value: true },
    naturalWidth: { value: 800 },
  });
  image.getBoundingClientRect = () => ({ x: 20, y: 100, width: 300, height: 400 }) as DOMRect;
  return image;
}
beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false }))
  );
});

describe('discovery image handoff', () => {
  it('only consumes a fresh handoff once and on its actual destination', () => {
    rememberDiscoveryImage(departure(), photo());
    expect(takeDiscoveryImage('/bezirk/mitte')?.rect.width).toBe(300);
    expect(takeDiscoveryImage('/bezirk/mitte')).toBeNull();
    rememberDiscoveryImage(departure(), photo());
    expect(takeDiscoveryImage('/kategorie/pizza')).toBeNull();
  });
  it('keeps modified clicks and reduced motion free of an arrival animation', () => {
    rememberDiscoveryImage(departure({ metaKey: true }), photo());
    expect(takeDiscoveryImage('/bezirk/mitte')).toBeNull();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true }))
    );
    rememberDiscoveryImage(departure(), photo());
    expect(sessionStorage.length).toBe(0);
  });
  it('ignores stale, corrupt and untrusted image handoffs', () => {
    for (const value of [
      'bad json',
      JSON.stringify({ path: '/bezirk/mitte', time: 0 }),
      JSON.stringify({
        path: '/bezirk/mitte',
        time: Date.now(),
        src: 'https://example.com/tracker',
        rect: {},
      }),
    ]) {
      sessionStorage.setItem('eat-this:discovery-arrival', value);
      expect(takeDiscoveryImage('/bezirk/mitte')).toBeNull();
    }
  });
});
