import { afterEach, describe, expect, it, vi } from 'vitest';
import { isExcludedAnalyticsIp } from './excludedIps.server';

afterEach(() => vi.unstubAllEnvs());

describe('private analytics network exclusion', () => {
  it('leaves ordinary traffic alone without configuration', () => {
    vi.stubEnv('STATS_EXCLUDE_IPS', '');
    expect(isExcludedAnalyticsIp('192.0.2.4')).toBe(false);
  });

  it('matches IPv4 and its IPv6-mapped representation without excluding neighbours', () => {
    vi.stubEnv('STATS_EXCLUDE_IPS', '192.0.2.4');
    expect(isExcludedAnalyticsIp('192.0.2.4')).toBe(true);
    expect(isExcludedAnalyticsIp('::ffff:192.0.2.4')).toBe(true);
    expect(isExcludedAnalyticsIp('192.0.2.5')).toBe(false);
  });

  it('matches IPv6 privacy addresses within the configured subnet, regardless of notation', () => {
    vi.stubEnv('STATS_EXCLUDE_IPS', ' 192.0.2.4, 2001:db8:1234:5678::/64 ');
    expect(isExcludedAnalyticsIp('2001:0db8:1234:5678:abcd:ef01:2345:6789')).toBe(true);
    expect(isExcludedAnalyticsIp('2001:db8:1234:5678::1')).toBe(true);
    expect(isExcludedAnalyticsIp('2001:db8:1234:5679::1')).toBe(false);
  });

  it('supports exact IPv6 addresses without widening their scope', () => {
    vi.stubEnv('STATS_EXCLUDE_IPS', '2001:db8::1');
    expect(isExcludedAnalyticsIp('2001:0db8:0:0:0:0:0:1')).toBe(true);
    expect(isExcludedAnalyticsIp('2001:db8::2')).toBe(false);
  });

  it.each(['not-an-ip', '192.0.2.4/33', '2001:db8::/129', '192.0.2.4/-1', '192.0.2.4/0/extra'])(
    'rejects invalid configuration without exposing addresses: %s', (value) => {
      vi.stubEnv('STATS_EXCLUDE_IPS', value);
      expect(() => isExcludedAnalyticsIp('192.0.2.4')).toThrow('Invalid STATS_EXCLUDE_IPS configuration');
    }
  );
});
