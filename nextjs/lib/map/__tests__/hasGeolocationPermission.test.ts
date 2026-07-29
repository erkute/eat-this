// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { hasGeolocationPermission } from '../useUserLocation';

/**
 * The gate that keeps the map from raising the system location dialog on first
 * paint. Getting this wrong is expensive and invisible in review: iOS remembers
 * a "Don't Allow" per site, so one unprompted ask kills the feature for that
 * visitor for good. Every branch here must fail CLOSED — no grant, no request.
 */
function stubPermissions(value: unknown) {
  Object.defineProperty(navigator, 'permissions', {
    value,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  stubPermissions(undefined);
  vi.restoreAllMocks();
});

describe('hasGeolocationPermission', () => {
  it('is true only for an already-granted permission', async () => {
    stubPermissions({ query: vi.fn().mockResolvedValue({ state: 'granted' }) });
    await expect(hasGeolocationPermission()).resolves.toBe(true);
  });

  it('is false while the permission is still unanswered', async () => {
    // 'prompt' is the state that would POP the dialog — the whole point.
    stubPermissions({ query: vi.fn().mockResolvedValue({ state: 'prompt' }) });
    await expect(hasGeolocationPermission()).resolves.toBe(false);
  });

  it('is false for a denied permission', async () => {
    stubPermissions({ query: vi.fn().mockResolvedValue({ state: 'denied' }) });
    await expect(hasGeolocationPermission()).resolves.toBe(false);
  });

  it('is false where the Permissions API is missing', async () => {
    stubPermissions(undefined);
    await expect(hasGeolocationPermission()).resolves.toBe(false);
  });

  it('is false when the geolocation descriptor is unsupported', async () => {
    // Older WebKit rejects rather than resolving for unknown descriptors.
    stubPermissions({ query: vi.fn().mockRejectedValue(new TypeError('unsupported')) });
    await expect(hasGeolocationPermission()).resolves.toBe(false);
  });

  it('never touches geolocation itself — querying must not prompt', async () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });
    stubPermissions({ query: vi.fn().mockResolvedValue({ state: 'granted' }) });

    await hasGeolocationPermission();

    expect(getCurrentPosition).not.toHaveBeenCalled();
  });
});
