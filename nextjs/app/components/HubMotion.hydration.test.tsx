// @vitest-environment jsdom
import { Suspense, useEffect, type AnchorHTMLAttributes } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';

const gate = vi.hoisted(() => ({ waiting: false, pending: null as Promise<void> | null }));

vi.mock('@gsap/react', () => ({
  useGSAP: (callback: () => () => void) => useEffect(() => callback(), [callback]),
}));
vi.mock('gsap', () => ({
  default: {
    registerPlugin: vi.fn(),
    set: vi.fn(),
    matchMedia: () => ({
      add: (_conditions: unknown, callback: (context: unknown) => void) =>
        callback({ conditions: { motion: true, desk: true } }),
      revert: vi.fn(),
    }),
  },
}));
vi.mock('@/lib/auth', () => ({ useLoginModal: () => ({ open: vi.fn() }) }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ lang: 'de', t: (key: string) => key }) }));
vi.mock('@/i18n/navigation', () => ({
  Link: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} />,
}));
vi.mock('./MapIntentLink', () => {
  const DelayedLink = (props: AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (gate.waiting) throw gate.pending;
    return <a {...props} />;
  };
  return {
    default: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <Suspense fallback={null}>
        <DelayedLink {...props} />
      </Suspense>
    ),
  };
});
vi.mock('./MustEatsOnboarding', () => ({ default: () => null }));
vi.mock('./HomeMapDataContext', () => {
  const data = {
    restaurants: [],
    categories: [],
    totalCount: 0,
    revealedMustEatIds: ['open-card'],
    mustEats: [
      {
        _id: 'open-card',
        dish: 'Test dish',
        image: '/card.webp',
        restaurant: { _id: 'spot', name: 'Test spot', slug: 'test-spot', lat: 52.5, lng: 13.4 },
      },
    ],
  };
  return { useHomeMapData: () => ({ initialMapData: data, visibleMapData: data, uid: null }) };
});
import HubMotion from './HubMotion';
import HubMustEatsTeaser from './HubMustEatsTeaser';

afterEach(() => {
  gate.waiting = false;
  gate.pending = null;
  cleanup();
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-consent-pending');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('preloads only nearby individual photos after the consent question closes', async () => {
  document.documentElement.setAttribute('data-consent-pending', '');
  document.body.innerHTML = '<section data-hub-magazine><img loading="lazy" src="/cover.webp"><img loading="lazy" src="/distant.webp"></section>';
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
  const observed: Element[] = [];
  let notify!: IntersectionObserverCallback;
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { notify = callback; }
    observe(target: Element) { observed.push(target); }
    unobserve() {}
    disconnect() {}
  });
  render(<HubMotion />);
  const [near, distant] = document.querySelectorAll('img');
  expect(observed).toEqual([]);
  expect(near.loading ?? near.getAttribute('loading')).toBe('lazy');
  await act(async () => { document.documentElement.removeAttribute('data-consent-pending'); });
  expect(observed).toEqual([near, distant]);
  act(() => notify([{
    target: near,
    isIntersecting: true,
    intersectionRatio: 1,
    boundingClientRect: near.getBoundingClientRect(),
    intersectionRect: near.getBoundingClientRect(),
    rootBounds: null,
    time: 0,
  }], {} as IntersectionObserver));
  expect(near.loading).toBe('eager');
  expect(distant.loading ?? distant.getAttribute('loading')).toBe('lazy');
});

it.each([false, true])(
  'hydrates the cards safely with delayed child links: %s',
  async (delayLinks) => {
    const observations: (() => void)[] = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(private callback: IntersectionObserverCallback) {}
        observe(target: Element) {
          observations.push(() =>
            this.callback(
              [{ target, isIntersecting: false } as IntersectionObserverEntry],
              this as unknown as IntersectionObserver
            )
          );
        }
        unobserve() {}
        disconnect() {}
      }
    );
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      {},
    ] as unknown as DOMRectList);
    const content = <HubMustEatsTeaser />;
    const container = document.createElement('div');
    container.innerHTML = renderToString(content);
    document.body.append(container);
    render(<HubMotion />);
    act(() => observations.splice(0).forEach((notify) => notify()));
    let release!: () => void;
    gate.pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    gate.waiting = delayLinks;
    const errors = vi.fn();
    let root!: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(container, content, { onRecoverableError: errors });
    });
    try {
      expect(errors).not.toHaveBeenCalled();
      act(() => observations.splice(0).forEach((notify) => notify()));
      expect(container.querySelector('[data-deal-back]')).not.toBeNull();
      await act(async () => {
        gate.waiting = false;
        release();
      });
      expect(errors).not.toHaveBeenCalled();
    } finally {
      await act(async () => root.unmount());
    }
  }
);
