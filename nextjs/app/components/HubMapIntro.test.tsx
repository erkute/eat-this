// @vitest-environment jsdom
import type { AnchorHTMLAttributes } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import HubMapIntro from './HubMapIntro';

vi.mock('gsap', () => ({ default: { to: vi.fn(), set: vi.fn(), killTweensOf: vi.fn() } }));
vi.mock('./MapIntentLink', () => ({ default: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} /> }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it('ships the first phone screen in HTML without downloading the hidden slides', () => {
  const html = renderToString(<HubMapIntro locale="de" />);
  expect(html).toContain('iphone-screen-4.webp');
  for (const id of [1, 2, 3]) expect(html).not.toContain(`iphone-screen-${id}.webp`);
});

it('prepares nearby slides once and waits for the next image before autoplay', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const observers: { notify: IntersectionObserverCallback; options: IntersectionObserverInit }[] = [];
  vi.stubGlobal('IntersectionObserver', class {
    constructor(notify: IntersectionObserverCallback, options: IntersectionObserverInit) { observers.push({ notify, options }); }
    observe() {}
    disconnect() {}
  });
  const { container, getByRole } = render(<HubMapIntro locale="de" />);
  const notify = (observer: typeof observers[number], isIntersecting: boolean) => {
    act(() => observer.notify([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver));
  };
  expect(container.querySelectorAll('img')).toHaveLength(1);
  notify(observers.find(o => o.options.rootMargin === '300px 0px')!, true);
  expect(container.querySelectorAll('img')).toHaveLength(4);
  notify(observers.find(o => o.options.threshold === .35)!, true);
  act(() => vi.advanceTimersByTime(2500));
  expect(getByRole('button', { name: 'Die Spot-Liste mit Slice Society, Gazzo und Romeo’s Sandwiches' }).getAttribute('aria-pressed')).toBe('true');
  await act(async () => { fireEvent.load(container.querySelector('img[src*="iphone-screen-1"]')!); });
  act(() => vi.advanceTimersByTime(2500));
  expect(getByRole('button', { name: 'Bar Basta im Detail' }).getAttribute('aria-pressed')).toBe('true');
  notify(observers.find(o => o.options.rootMargin === '300px 0px')!, false);
  expect(container.querySelectorAll('img')).toHaveLength(4);
});
