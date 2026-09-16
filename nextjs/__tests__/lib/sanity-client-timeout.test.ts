import { describe, it, expect } from 'vitest';
import { client } from '@/lib/sanity';

/**
 * Wächter für zwei Werte, die ohne Zutun still auf die Voreinstellung
 * zurückfallen: `timeout` wären dann FÜNF Minuten je hängender Abfrage
 * (@sanity/client), `maxRetries` ohne Deckel fünf Versuche aus get-it. Beides
 * zusammen hat serverseitige Renders minutenlang an einer toten Verbindung
 * hängen lassen (Sentry JAVASCRIPT-5, 2E, 6J und Geschwister, 16.09.2026).
 */
describe('Sanity-Client: Zeitlimit und Wiederholungen', () => {
  const config = client.config();

  it('bricht eine hängende Abfrage nach 10 Sekunden ab', () => {
    expect(config.timeout).toBe(10_000);
  });

  it('deckelt die Wiederholungen, damit vier Versuche unter einer Minute bleiben', () => {
    expect(config.maxRetries).toBe(3);

    const attempts = (config.maxRetries ?? 0) + 1;
    const timeout = config.timeout ?? 0;
    // get-its Backoff: 100 * 2^n + bis zu 100 ms Zufall, hier großzügig gerundet.
    const backoffCeiling = 100 * (2 ** attempts - 1) + 100 * attempts;
    expect(attempts * timeout + backoffCeiling).toBeLessThan(60_000);
  });
});
