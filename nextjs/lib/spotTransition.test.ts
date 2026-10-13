// @vitest-environment jsdom
import type { MouseEvent } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { arriveAtSpot, beginSpotTransition } from './spotTransition';

function source(overrides = {}) {
  const link = document.createElement('a');
  link.href = 'http://localhost/restaurant/sofi';
  const event = { currentTarget: link, button: 0, preventDefault: vi.fn(), ...overrides } as unknown as MouseEvent<HTMLAnchorElement>;
  return { link, event };
}
let page: HTMLElement;
let media: { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };
beforeEach(() => {
  vi.useFakeTimers();
  media = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', vi.fn(() => media));
  Element.prototype.animate = vi.fn(() => ({ cancel: vi.fn() }) as unknown as Animation);
  page = document.createElement('main');
  document.body.append(page);
});
afterEach(() => {
  arriveAtSpot(page, '/discard');
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.unstubAllGlobals();
  // @ts-expect-error jsdom only supplies this method through our test double.
  delete Element.prototype.animate;
});

it('keeps native navigation immediate, without preventing clicks or covering content', () => {
  const { event } = source();
  beginSpotTransition(event);
  expect(event.preventDefault).not.toHaveBeenCalled();
  expect(document.body.children).toHaveLength(1);
  expect(Element.prototype.animate).not.toHaveBeenCalled();
  const finish = arriveAtSpot(page, '/restaurant/sofi');
  expect(Element.prototype.animate).toHaveBeenCalledWith([
    { transform: 'translateY(8px)' },
    { transform: 'translateY(0)' },
  ], expect.objectContaining({ duration: 240 }));
  finish();
  expect(page.hasAttribute('data-spot-arrival')).toBe(false);
});

it('preserves modified clicks, downloads, new tabs and reduced motion', () => {
  for (const props of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) {
    beginSpotTransition(source(props).event);
    arriveAtSpot(page, '/restaurant/sofi');
  }
  const { link, event } = source();
  link.target = '_blank';
  beginSpotTransition(event);
  arriveAtSpot(page, '/restaurant/sofi');
  link.target = '';
  link.setAttribute('download', '');
  beginSpotTransition(event);
  arriveAtSpot(page, '/restaurant/sofi');
  link.removeAttribute('download');
  media.matches = true;
  beginSpotTransition(event);
  arriveAtSpot(page, '/restaurant/sofi');
  expect(Element.prototype.animate).not.toHaveBeenCalled();
});

it('ignores expired intent and different destinations', () => {
  beginSpotTransition(source().event);
  vi.advanceTimersByTime(8001);
  arriveAtSpot(page, '/restaurant/sofi');
  beginSpotTransition(source().event);
  arriveAtSpot(page, '/restaurant/elsewhere');
  expect(Element.prototype.animate).not.toHaveBeenCalled();
});

it('consumes intent once so back navigation cannot replay the animation', () => {
  beginSpotTransition(source().event);
  arriveAtSpot(page, '/restaurant/sofi')();
  arriveAtSpot(page, '/restaurant/sofi');
  expect(Element.prototype.animate).toHaveBeenCalledOnce();
});

it('stops immediately when reduced motion changes', () => {
  beginSpotTransition(source().event);
  arriveAtSpot(page, '/restaurant/sofi');
  const finish = media.addEventListener.mock.calls[0][1];
  finish();
  expect(page.hasAttribute('data-spot-arrival')).toBe(false);
  expect(vi.mocked(Element.prototype.animate).mock.results[0].value.cancel).toHaveBeenCalled();
});
