import { describe, it, expect, vi, beforeEach } from 'vitest';

const sentry = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock('@sentry/nextjs', () => ({ captureException: sentry.captureException }));

import { metadataSource } from './metadataSource';

describe('metadataSource', () => {
  beforeEach(() => sentry.captureException.mockClear());

  it('reicht den gelesenen Wert unverändert durch', async () => {
    await expect(metadataSource(async () => ({ name: 'Gazzo' }))).resolves.toEqual({
      name: 'Gazzo',
    });
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it('macht aus einem Transportfehler ein null statt eines Wurfs', async () => {
    // Genau die Fehlerform aus Produktion: get-its Socket-Timeout gegen die
    // Sanity-CDN (Sentry JAVASCRIPT-6J).
    const socketTimeout = new Error('Socket timed out on request to https://…apicdn.sanity.io/…');

    await expect(
      metadataSource(() => Promise.reject(socketTimeout))
    ).resolves.toBeNull();
  });

  it('meldet den Fehler weiter an Sentry, als behandelte Warnung', async () => {
    const boom = new Error('fetch failed');

    await metadataSource(() => Promise.reject(boom));

    expect(sentry.captureException).toHaveBeenCalledWith(boom, {
      level: 'warning',
      tags: { metadata_source: 'sanity' },
    });
  });

  it('gibt ein legitimes null der Quelle unverändert zurück, ohne Sentry zu behelligen', async () => {
    // „Dokument gibt es nicht" ist kein Fehler — die Aufrufstellen behandeln
    // beide Fälle gleich, aber nur einer gehört ins Fehlerprotokoll.
    await expect(metadataSource(async () => null)).resolves.toBeNull();
    expect(sentry.captureException).not.toHaveBeenCalled();
  });
});
