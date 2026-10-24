// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
const mocks = vi.hoisted(() => ({ timeline: vi.fn(), cleanups: [] as Array<() => void> }));
vi.mock('gsap', () => ({ default: {
  matchMedia: () => ({ add: (_query: string, setup: () => () => void) => mocks.cleanups.push(setup()), revert: () => mocks.cleanups.splice(0).forEach(fn => fn()) }),
  set: vi.fn(), killTweensOf: vi.fn(), timeline: mocks.timeline,
} }));
import HubFragRemy from './HubFragRemy';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
it('waits for the portrait to decode before playing its entrance in view', async () => {
  const callbacks: IntersectionObserverCallback[] = [];
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { callbacks.push(callback); }
    observe() {} disconnect() {}
  });
  const tl = { fromTo: vi.fn(), to: vi.fn(), call: vi.fn(), kill: vi.fn() };
  tl.fromTo.mockReturnValue(tl); tl.to.mockReturnValue(tl); tl.call.mockReturnValue(tl);
  mocks.timeline.mockReturnValue(tl);
  const { container } = render(<NextIntlClientProvider locale="de" messages={{}}><HubFragRemy /></NextIntlClientProvider>);
  act(() => callbacks.forEach(cb => cb([{ isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry], {} as IntersectionObserver)));
  expect(mocks.timeline).not.toHaveBeenCalled();
  let decoded!: () => void;
  const image = container.querySelector('img')!;
  Object.defineProperty(image, 'decode', { value: () => new Promise<void>(resolve => { decoded = resolve; }) });
  fireEvent.load(image);
  expect(mocks.timeline).not.toHaveBeenCalled();
  await act(async () => { decoded(); });
  expect(mocks.timeline).toHaveBeenCalledOnce();
});
