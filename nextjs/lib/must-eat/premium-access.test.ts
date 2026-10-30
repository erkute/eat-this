import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPremiumAccessToken, readPremiumAccessToken } from './premium-access';

describe('premium access capability', () => {
  beforeEach(() => {
    vi.stubEnv('PREMIUM_ACCESS_SIGNING_KEY', 'test-signing-key-with-enough-entropy');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('grants exactly the IDs it was issued for, and only to its subject', () => {
    const token = createPremiumAccessToken(['m2', 'm1', 'm2'], 'user-1', {
      nowMs: 1_000_000,
      ttlSeconds: 60,
    });

    const access = readPremiumAccessToken(token, 'user-1', 1_030_000);
    expect(access.has('m1')).toBe(true);
    expect(access.has('m2')).toBe(true);
    expect(access.has('m3')).toBe(false);
    expect(readPremiumAccessToken(token, 'user-2', 1_030_000).has('m1')).toBe(false);
  });

  it('rejects tampering and expiry', () => {
    const token = createPremiumAccessToken(['m1'], 'user-1', {
      nowMs: 1_000_000,
      ttlSeconds: 60,
    });
    const [payload, mac] = token.split('.');

    expect(readPremiumAccessToken(`${payload}x.${mac}`, 'user-1', 1_010_000).has('m1')).toBe(false);
    expect(readPremiumAccessToken(token, 'user-1', 1_061_000).has('m1')).toBe(false);
  });

  // Browser verwerfen Cookies ueber 4096 Byte (Name + Wert) ohne Meldung.
  it('stays far below the browser cookie limit with hundreds of long card IDs', () => {
    const ids = Array.from(
      { length: 300 },
      (_, i) => `must-eat-gorilla-baeckerei-neukoelln-cinnamon-roll-${i}`
    );
    const token = createPremiumAccessToken(ids, 'aVeryLongFirebaseUid1234567890');

    expect('__Host-eatthis_premium_access='.length + token.length).toBeLessThan(4096);
    const access = readPremiumAccessToken(token, 'aVeryLongFirebaseUid1234567890');
    expect(ids.every((id) => access.has(id))).toBe(true);
  });
});
