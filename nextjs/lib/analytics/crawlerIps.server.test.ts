import { expect, it } from 'vitest';
import { isKnownCrawlerIp } from './crawlerIps.server';

it.each(['104.210.140.128', '104.210.140.143', '::ffff:104.210.140.130'])(
  'erkennt eine veröffentlichte Crawler-Adresse: %s',
  (ip) => {
    expect(isKnownCrawlerIp(ip)).toBe(true);
  }
);
it.each(['104.210.140.127', '104.210.140.144', '84.13.22.9', '2001:db8::1', 'invalid'])(
  'schließt andere Anschlüsse nicht pauschal aus: %s',
  (ip) => {
    expect(isKnownCrawlerIp(ip)).toBe(false);
  }
);
