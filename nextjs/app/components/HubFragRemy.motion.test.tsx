// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
const mocks = vi.hoisted(() => ({ timeline: vi.fn(), cleanups: [] as Array<() => void> }));
vi.mock('gsap', () => ({ default: {
  matchMedia: () => ({
    add: (queries: Record<string, string>, setup: (context: { conditions: Record<string, boolean> }) => (() => void) | undefined) => {
      const conditions = Object.fromEntries(Object.entries(queries).map(([name, query]) => [name, window.matchMedia(query).matches]));
      const dispose = setup({ conditions });
      if (dispose) mocks.cleanups.push(dispose);
    },
    revert: () => mocks.cleanups.splice(0).forEach(fn => fn()),
  }),
  set: vi.fn(), killTweensOf: vi.fn(), timeline: mocks.timeline,
} }));
import HubFragRemy from './HubFragRemy';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
it.each([false, true])('waits for the portrait to decode before playing its entrance in view (mobile: %s)', async (mobile) => {
  const callbacks: IntersectionObserverCallback[] = [];
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('max-width') ? mobile : true }));
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
