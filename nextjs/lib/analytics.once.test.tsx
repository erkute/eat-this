// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://www.eatthisdot.com/" }
import { StrictMode } from 'react';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CheckoutSuccessAnalytics from '@/app/[locale]/checkout/success/CheckoutSuccessAnalytics';
import { useMapLocationFeedback } from '@/lib/map/useMapLocationFeedback';
import { trackEventOnce } from './analytics';

// Isolate measurement from the invitation's separate UI preference and notices.
vi.mock('@/lib/map/useLocationInvite', () => ({ useLocationInvite: () => true }));
vi.mock('@/lib/map/useExplorationSettled', () => ({ useExplorationSettled: () => true }));
vi.mock('@/lib/map/useLocationWelcome', () => ({ useLocationWelcome: vi.fn() }));
vi.mock('@/lib/notice', () => ({ notify: vi.fn() }));

const TEST_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/136.0.0.0 Safari/537.36';
const purchase = {
  transactionId: 'cs_test_first',
  packId: 'category-pizza',
  packName: 'Pizza',
  amountCents: 299,
};
const strict = ({ children }: { children: React.ReactNode }) => <StrictMode>{children}</StrictMode>;
let beacon: ReturnType<typeof vi.fn>;
let storage: ReturnType<typeof vi.spyOn>[];

beforeEach(() => {
  beacon = vi.fn(() => true);
  vi.stubGlobal('navigator', { userAgent: TEST_UA, sendBeacon: beacon });
  window.history.replaceState({}, '', '/checkout/success?session_id=cs_test_first');
  storage = [
    vi.spyOn(window, 'sessionStorage', 'get'),
    vi.spyOn(window, 'localStorage', 'get'),
    ...(['getItem', 'setItem', 'removeItem', 'clear'] as const).map((method) =>
      vi.spyOn(Storage.prototype, method)
    ),
    vi.spyOn(document, 'cookie', 'set'),
  ];
});

afterEach(() => {
  cleanup();
  try {
    for (const spy of storage) expect(spy).not.toHaveBeenCalled();
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});

// jsdom's Blob has no .text(). Inspect the actual beacon, not an analytics mock.
async function sent(index: number) {
  const reader = new FileReader();
  return new Promise<Record<string, string>>((resolve, reject) => {
    reader.onload = () => resolve(JSON.parse(String(reader.result)));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(beacon.mock.calls[index][1] as Blob);
  });
}

describe('document-scoped measurement without browser storage', () => {
  it('deduplicates a purchase across Strict Mode, remount and SPA navigation, while counting a second transaction', async () => {
    const first = render(<CheckoutSuccessAnalytics {...purchase} />, { wrapper: strict });
    expect(beacon).toHaveBeenCalledTimes(1);
    first.rerender(<CheckoutSuccessAnalytics {...purchase} packName="PIZZA" />);
    expect(beacon).toHaveBeenCalledTimes(1);
    first.unmount();

    window.history.pushState({}, '', '/map');
    window.history.pushState({}, '', '/en/checkout/success?session_id=cs_test_first');
    const returned = render(<CheckoutSuccessAnalytics {...purchase} />, { wrapper: strict });
    expect(beacon).toHaveBeenCalledTimes(1);
    returned.rerender(<CheckoutSuccessAnalytics {...purchase} transactionId="cs_test_second" />);
    expect(beacon).toHaveBeenCalledTimes(2);
    returned.rerender(<CheckoutSuccessAnalytics {...purchase} />);
    expect(beacon).toHaveBeenCalledTimes(2);

    expect(await sent(0)).toEqual({ path: '/checkout/success', event: 'purchase', ua: TEST_UA });
    expect(await sent(1)).toEqual({ path: '/en/checkout/success', event: 'purchase', ua: TEST_UA });
  });

  it('counts an eligible location invitation once across Strict Mode, remount and navigation; acceptance counts actions', async () => {
    const options = {
      locale: 'de', isActive: false, sheetView: 'list' as 'list' | 'detail',
      location: null, locationError: null, locateLoading: false,
      mapDataLoading: false, mapDataError: null, onLocateMe: vi.fn(),
    };
    window.history.replaceState({}, '', '/map');
    const first = renderHook((props) => useMapLocationFeedback(props), {
      initialProps: options, wrapper: strict,
    });
    expect(beacon).not.toHaveBeenCalled();
    first.rerender({ ...options, isActive: true });
    expect(beacon).toHaveBeenCalledTimes(1);
    first.rerender({ ...options, isActive: true, sheetView: 'detail' });
    act(() => first.result.current());
    expect(beacon).toHaveBeenCalledTimes(1);
    first.unmount();

    window.history.pushState({}, '', '/packs');
    window.history.pushState({}, '', '/map');
    const returned = renderHook(() => useMapLocationFeedback({ ...options, isActive: true }), {
      wrapper: strict,
    });
    expect(beacon).toHaveBeenCalledTimes(1);
    act(() => returned.result.current());
    act(() => returned.result.current());
    expect(beacon).toHaveBeenCalledTimes(3);
    expect(options.onLocateMe).toHaveBeenCalledTimes(3);
    expect(await sent(0)).toEqual({ path: '/map', event: 'map_location_invite_shown', ua: TEST_UA });
    expect(await sent(1)).toEqual({ path: '/map', event: 'map_location_invite_accepted', ua: TEST_UA });
    expect(await sent(2)).toEqual({ path: '/map', event: 'map_location_invite_accepted', ua: TEST_UA });
  });

  it('deduplicates even when access to both browser stores is blocked', () => {
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    trackEventOnce('purchase_blocked', 'purchase');
    trackEventOnce('purchase_blocked', 'purchase');
    expect(beacon).toHaveBeenCalledTimes(1);
  });

  it('starts fresh when a reload or a new document evaluates the module again', async () => {
    trackEventOnce('purchase_reload', 'purchase');
    trackEventOnce('purchase_reload', 'purchase');
    expect(beacon).toHaveBeenCalledTimes(1);

    // A hard navigation creates a fresh module instance; the store must not survive it.
    vi.resetModules();
    const nextDocument = await import('./analytics');
    nextDocument.trackEventOnce('purchase_reload', 'purchase');
    nextDocument.trackEventOnce('purchase_reload', 'purchase');
    expect(beacon).toHaveBeenCalledTimes(2);
    nextDocument.trackEventOnce('map_location_invite', 'map_location_invite_shown');
    nextDocument.trackEventOnce('map_location_invite', 'map_location_invite_shown');
    expect(beacon).toHaveBeenCalledTimes(3);
  });
});
