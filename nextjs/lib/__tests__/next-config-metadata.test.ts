import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

/**
 * Der Waechter fuer die Metadaten im `<head>`.
 *
 * Next streamt `<title>` und `<link rel="canonical">` in den Body und blockt
 * nur fuer User-Agents, die `htmlLimitedBots` trifft. Auf Firebase App Hosting
 * kommt am Origin bei JEDER Anfrage der blanke UA `Google` an — Nexts
 * Standardliste verlangt aber einen Bindestrich (`[\w-]+-Google`,
 * `Google-[\w-]+`) und trifft ihn nie. Ohne den eigenen Regex landen die
 * Metadaten von `/` und `/map` deshalb hinter `</head>`.
 *
 * Wer die Liste kuerzt oder Nexts Standard wiederherstellt, bricht diesen Test.
 */
describe('htmlLimitedBots', () => {
  const re = nextConfig.htmlLimitedBots;

  it('ist gesetzt — ohne die Option gilt Nexts Standard, der zu kurz greift', () => {
    expect(re).toBeInstanceOf(RegExp);
  });

  it('trifft den blanken User-Agent „Google", den die App-Hosting-Edge schickt', () => {
    expect(re!.test('Google')).toBe(true);
  });

  it('trifft weiterhin die Bots aus Nexts Standardliste', () => {
    for (const ua of [
      'Mediapartners-Google',
      'Google-InspectionTool',
      'Bingbot',
      'Twitterbot',
      'Slackbot',
      'facebookexternalhit',
      'applebot',
      'DuckDuckBot',
    ]) {
      expect(re!.test(ua), ua).toBe(true);
    }
  });

  it('trifft einen gewoehnlichen Browser nicht — echte Besucher bekommen weiter Streaming', () => {
    expect(
      re!.test(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
      )
    ).toBe(false);
  });
});
