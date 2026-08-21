import { describe, expect, it } from 'vitest';
import { isAutomated } from './botFilter';

const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const AZURE_CRAWLER =
  'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36';

describe('isAutomated', () => {
  it.each([
    ['a desktop browser', CHROME, '84.13.22.9'],
    ['a phone browser', IPHONE, '2a02:3100::1'],
  ])('counts %s', (_label, ua, ip) => {
    expect(isAutomated(ua, ip)).toBe(false);
  });

  it.each([
    'Googlebot/2.1 (+http://www.google.com/bot.html)',
    'SentryUptimeBot/1.0 (+http://docs.sentry.io/)',
    'python-requests/2.31.0',
    'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
    'GPTBot/1.2',
    'curl/8.4.0',
  ])('drops the declared crawler %s', (ua) => {
    expect(isAutomated(ua, '35.204.169.245')).toBe(true);
  });

  it('drops an empty user agent', () => {
    expect(isAutomated('', '84.13.22.9')).toBe(true);
    expect(isAutomated(null, '84.13.22.9')).toBe(true);
  });

  /* The disguised crawler is the whole reason this file is not a one-line UA
   * regex: it runs JavaScript, so it reaches /api/count like a real browser
   * would, and on 19.08.2026 it was already 2533 requests a day. */
  describe('the Azure render crawler', () => {
    it.each([
      '20.61.4.9',
      '4.223.11.2',
      '40.87.1.1',
      '52.166.9.9',
      '57.152.3.4',
      '64.236.7.8',
      '135.119.2.3',
      '168.62.9.9',
      '172.183.4.5',
    ])('drops its faked UA from %s', (ip) => {
      expect(isAutomated(AZURE_CRAWLER, ip)).toBe(true);
    });

    /* Both halves have to match. A real person on that phone must still be
     * counted, and something else hosted on Azure is not this crawler. */
    it('keeps a real moto g power owner on a normal network', () => {
      expect(isAutomated(AZURE_CRAWLER, '84.13.22.9')).toBe(false);
    });

    it('keeps an ordinary browser on an Azure address', () => {
      expect(isAutomated(CHROME, '20.61.4.9')).toBe(false);
    });

    it('is not fooled by a similar prefix outside the ranges', () => {
      expect(isAutomated(AZURE_CRAWLER, '201.61.4.9')).toBe(false);
      expect(isAutomated(AZURE_CRAWLER, '172.16.4.5')).toBe(false);
    });
  });
});
