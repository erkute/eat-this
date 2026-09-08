import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DAY_KEYS_TTL_MS,
  dayKeys,
  extractDayKeys,
  keyWithinBudget,
  OVERFLOW_PATH,
  resetDayKeysCache,
} from './dayKeyBudget';

beforeEach(() => {
  resetDayKeysCache();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('extractDayKeys', () => {
  it('liest die Schluessel der vier freien Maps', () => {
    const keys = extractDayKeys({
      day: '2026-09-08',
      pageviews: 12,
      paths: { '/': 4, '/map': 8 },
      entryPaths: { '/': 3 },
      continuations: { '/map': 1 },
      referrers: { www_google_com: 2 },
      events: { map_opened: 5 },
    });

    expect([...keys.paths]).toEqual(['/', '/map']);
    expect([...keys.entryPaths]).toEqual(['/']);
    expect([...keys.continuations]).toEqual(['/map']);
    expect([...keys.referrers]).toEqual(['www_google_com']);
  });

  it('kommt mit einem Tag ohne Dokument zurecht', () => {
    expect(extractDayKeys(undefined).paths.size).toBe(0);
  });
});

describe('keyWithinBudget', () => {
  it('laesst einen bekannten Schluessel durch, auch wenn das Budget voll ist', () => {
    const keys = extractDayKeys({ paths: { '/map': 1, '/': 1 } });
    expect(keyWithinBudget(keys, 'paths', '/map', OVERFLOW_PATH, 2)).toBe('/map');
  });

  it('vergibt neue Schluessel bis zum Budget und sammelt den Rest', () => {
    const keys = extractDayKeys(undefined);

    expect(keyWithinBudget(keys, 'paths', '/a', OVERFLOW_PATH, 2)).toBe('/a');
    expect(keyWithinBudget(keys, 'paths', '/b', OVERFLOW_PATH, 2)).toBe('/b');
    expect(keyWithinBudget(keys, 'paths', '/c', OVERFLOW_PATH, 2)).toBe(OVERFLOW_PATH);
    // Der Sammelschluessel selbst frisst kein Budget, und /a bleibt zaehlbar.
    expect(keyWithinBudget(keys, 'paths', '/a', OVERFLOW_PATH, 2)).toBe('/a');
  });

  it('haelt die Maps auseinander', () => {
    const keys = extractDayKeys(undefined);
    keyWithinBudget(keys, 'paths', '/a', OVERFLOW_PATH, 1);

    expect(keyWithinBudget(keys, 'entryPaths', '/a', OVERFLOW_PATH, 1)).toBe('/a');
    expect(keyWithinBudget(keys, 'paths', '/b', OVERFLOW_PATH, 1)).toBe(OVERFLOW_PATH);
  });

  /* Blind neue Schluessel anzulegen ist genau der Fehler, den das Modul
     verhindern soll — wenn das Tagesdokument nicht lesbar war, zaehlt alles
     in den Sammelschluessel. */
  it('sammelt alles, wenn die Schluessel unbekannt sind', () => {
    expect(keyWithinBudget(null, 'paths', '/a', OVERFLOW_PATH, 1000)).toBe(OVERFLOW_PATH);
  });
});

describe('dayKeys', () => {
  it('liest hoechstens einmal je TTL-Fenster', async () => {
    const read = vi.fn().mockResolvedValue({ paths: { '/': 1 } });

    await dayKeys('2026-09-08', read, 1_000);
    await dayKeys('2026-09-08', read, 1_000 + DAY_KEYS_TTL_MS - 1);
    expect(read).toHaveBeenCalledTimes(1);

    await dayKeys('2026-09-08', read, 1_000 + DAY_KEYS_TTL_MS);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('liest neu, sobald der Tag wechselt', async () => {
    const read = vi.fn().mockResolvedValue({});
    await dayKeys('2026-09-08', read, 1_000);
    await dayKeys('2026-09-09', read, 1_100);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('gibt null zurueck, wenn Firestore nicht antwortet', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const read = vi.fn().mockRejectedValue(new Error('unavailable'));

    expect(await dayKeys('2026-09-08', read, 1_000)).toBeNull();
    // Ein gescheiterter Lesevorgang darf nicht als leere Sicht haengenbleiben.
    read.mockResolvedValue({ paths: { '/': 1 } });
    expect((await dayKeys('2026-09-08', read, 1_100))?.paths.has('/')).toBe(true);
  });
});
