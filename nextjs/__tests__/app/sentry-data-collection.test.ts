import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { SENTRY_DATA_COLLECTION } from '@/lib/sentry/dataCollection';

/* Lässt eine Sentry-Konfiguration `dataCollection` weg, sammelt das SDK seit
 * Version 11 Nutzerdaten, Cookies und Bodies – ohne Fehler, ohne Warnung. */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

describe('Sentry sammelt keine personenbezogenen Daten', () => {
  it.each(['lib/sentry/client-sdk.ts', 'sentry.server.config.ts', 'sentry.edge.config.ts'])(
    '%s nutzt die gemeinsame Einstellung',
    (file) => {
      expect(read(file)).toContain('dataCollection: SENTRY_DATA_COLLECTION');
    }
  );

  it('schaltet Nutzerdaten, Cookies, Bodies und KI-Inhalte ab', () => {
    expect(SENTRY_DATA_COLLECTION.userInfo).toBe(false);
    expect(SENTRY_DATA_COLLECTION.cookies).toBe(false);
    expect(SENTRY_DATA_COLLECTION.httpBodies).toEqual([]);
    expect(SENTRY_DATA_COLLECTION.genAI).toEqual({ inputs: false, outputs: false });
    expect(SENTRY_DATA_COLLECTION.databaseQueryData).toBe(false);
  });
});
