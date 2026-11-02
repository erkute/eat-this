// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, expect, it, vi } from 'vitest';
const widget = vi.hoisted(() => ({ load: vi.fn().mockResolvedValue({}) }));
vi.mock('./buddy/loadBuddyWidget', () => ({ loadBuddyWidget: widget.load }));
vi.mock('gsap', () => ({ default: { matchMedia: () => ({ add() {}, revert() {} }), killTweensOf() {} } }));
vi.mock('next/image', () => ({ default: () => null }));
import HubFragRemy from './HubFragRemy';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); widget.load.mockClear(); });

it.each([false, true])('leaves the hero clear and warms chat when its stage approaches, reduced motion: %s', async reduced => {
  let notify!: IntersectionObserverCallback;
  const disconnect = vi.fn();
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { notify = callback; }
    observe() {} disconnect = disconnect;
  });
  render(<NextIntlClientProvider locale="de" messages={{}}><HubFragRemy /></NextIntlClientProvider>);
  expect(widget.load).not.toHaveBeenCalled();
  await act(async () => { notify([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver); });
  expect(widget.load).not.toHaveBeenCalled();
  await act(async () => { notify([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver); });
  expect(widget.load).toHaveBeenCalledOnce();
  expect(disconnect).toHaveBeenCalled();
});
