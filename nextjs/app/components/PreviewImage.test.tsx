// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import PreviewImage from './PreviewImage';

const src = 'https://cdn.sanity.io/images/p/d/photo.jpg?rect=10,20,800,1000&w=800&h=1000&fit=crop&crop=center';
const srcSet = `${src} 800w`;
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('preserves the crop and a real photo in server HTML without starting full-size requests', () => {
  const html = renderToString(<PreviewImage src={src} srcSet={srcSet} sizes="400px" alt="Gericht" />);
  expect(html).toContain('rect=10,20,800,1000&amp;w=160&amp;h=200');
  expect(html).toContain('alt="Gericht"');
  expect(html).not.toContain('srcSet');
});

it('upgrades once near the viewport and keeps the full image when leaving it', () => {
  let notify!: IntersectionObserverCallback;
  const disconnect = vi.fn();
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { notify = callback; }
    observe() {}
    disconnect = disconnect;
  });
  const { getByAltText } = render(<PreviewImage src={src} srcSet={srcSet} alt="Gericht" />);
  const img = getByAltText('Gericht');
  const intersect = (isIntersecting: boolean) => act(() => notify([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver));
  intersect(false);
  expect(img.getAttribute('srcset')).toBeNull();
  intersect(true);
  expect(img.getAttribute('src')).toBe(src);
  expect(img.getAttribute('srcset')).toBe(srcSet);
  expect(disconnect).toHaveBeenCalled();
  intersect(false);
  expect(img.getAttribute('src')).toBe(src);
});

it('uses full resolution when observation is unavailable', () => {
  vi.stubGlobal('IntersectionObserver', undefined);
  const { getByAltText } = render(<PreviewImage src={src} srcSet={srcSet} alt="Gericht" />);
  expect(getByAltText('Gericht').getAttribute('srcset')).toBe(srcSet);
});

it('leaves local images and already small Sanity variants unchanged', () => {
  for (const image of ['/photo.webp', 'https://cdn.sanity.io/images/p/d/photo.jpg?w=120']) {
    const html = renderToString(<PreviewImage src={image} alt="Gericht" />);
    expect(html).toContain(`src="${image}"`);
    expect(html).not.toContain('data-preview-image');
  }
});
