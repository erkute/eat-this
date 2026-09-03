import { describe, expect, it } from 'vitest';
import { isAutomated } from './botFilter';

const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
/** What a real Android phone sends since Chrome 110: model reduced to "K". */
const ANDROID =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36';
/* Lighthouse 12's emulated phone, exactly as it arrives - no "Chrome-Lighthouse"
 * suffix. Verified 03.09.2026 against a local echo page and in the edge log. */
const LIGHTHOUSE =
  'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36';

describe('isAutomated', () => {
  it.each([
    ['a desktop browser', CHROME],
    ['a phone browser', IPHONE],
    ['a current Android browser', ANDROID],
  ])('counts %s', (_label, ua) => {
    expect(isAutomated(ua)).toBe(false);
  });

  it.each([
    'Googlebot/2.1 (+http://www.google.com/bot.html)',
    'SentryUptimeBot/1.0 (+http://docs.sentry.io/)',
    'python-requests/2.31.0',
    'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
    'GPTBot/1.2',
    'curl/8.4.0',
    'DuckAssistBot/1.2; (+http://duckduckgo.com/duckassistbot.html)',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/152.0.0.0 Safari/537.36',
  ])('drops the declared crawler %s', (ua) => {
    expect(isAutomated(ua)).toBe(true);
  });

  it('drops an empty user agent', () => {
    expect(isAutomated('')).toBe(true);
    expect(isAutomated(null)).toBe(true);
  });

  /* Lighthouse runs JavaScript, so it reaches /api/count exactly like a
   * browser. Our own CI alone is 36 loads per URL on a busy day; unfiltered
   * they stood in the dashboard as the five most-read pages. */
  describe('Lighthouse', () => {
    it('drops the emulated phone regardless of the address it comes from', () => {
      expect(isAutomated(LIGHTHOUSE)).toBe(true);
    });

    it('still drops the older string that carried the marker', () => {
      expect(isAutomated(`${LIGHTHOUSE} Chrome-Lighthouse`)).toBe(true);
    });

    it('does not mistake the reduced Android UA for it', () => {
      expect(isAutomated(ANDROID)).toBe(false);
    });
  });
});
