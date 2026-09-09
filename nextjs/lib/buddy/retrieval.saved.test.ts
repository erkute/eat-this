// nextjs/lib/buddy/retrieval.saved.test.ts
import { describe, it, expect, vi } from 'vitest';
import { spotsBySlugs, buildSavedSpotsQuery, SAVED_SPOTS_LIMIT } from './retrieval';

const row = (slug: string, extra: Record<string, unknown> = {}) => ({
  _id: `r-${slug}`,
  name: slug,
  slug,
  cuisineType: 'Bar',
  bezirk: 'Kreuzberg',
  shortDescription: null,
  tip: null,
  mapsUrl: null,
  image: null,
  priceRange: { min: 10, max: 20, currency: 'EUR' },
  openingHours: null,
  ...extra,
});

describe('spotsBySlugs', () => {
  it('holt die Merkliste und macht Karten daraus', async () => {
    const fetch = vi.fn(async () => [row('bar-basta')]);
    const spots = await spotsBySlugs(['bar-basta'], 'de', undefined, { client: { fetch } });

    expect(fetch).toHaveBeenCalledWith(buildSavedSpotsQuery(), {
      slugs: ['bar-basta'],
      locale: 'de',
    });
    // Das rohe Preis-Objekt wird zum Label, openingHours/Koordinaten fallen raus.
    expect(spots[0].priceRange).toBe('10–20 €');
    expect(spots[0]).not.toHaveProperty('openingHours');
  });

  it('lässt dauerhaft geschlossene Läden gar nicht erst durch', () => {
    // Ein Tipp auf einen Laden, den es nicht mehr gibt, ist keiner — die
    // Merkliste kann ihn aber noch enthalten.
    expect(buildSavedSpotsQuery()).toContain('isClosed != true');
    expect(buildSavedSpotsQuery()).toContain('isOpen == true');
  });

  it('sortiert nach Entfernung, sobald der Standort bekannt ist', async () => {
    const fetch = vi.fn(async () => [
      row('weit', { lat: 52.6, lng: 13.4 }),
      row('nah', { lat: 52.5, lng: 13.4 }),
    ]);
    const spots = await spotsBySlugs(
      ['weit', 'nah'],
      'de',
      { lat: 52.5, lng: 13.4 },
      {
        client: { fetch },
      }
    );
    expect(spots.map((s) => s.slug)).toEqual(['nah', 'weit']);
    expect(spots[0].distanceLabel).toBeTruthy();
  });

  it('fragt gar nicht erst, wenn nichts geherzt ist', async () => {
    const fetch = vi.fn(async () => []);
    expect(await spotsBySlugs([], 'de', undefined, { client: { fetch } })).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('deckelt die Liste', async () => {
    let seen: string[] = [];
    const fetch = async (_query: string, params?: Record<string, unknown>) => {
      seen = (params?.slugs as string[]) ?? [];
      return [];
    };
    await spotsBySlugs(
      Array.from({ length: SAVED_SPOTS_LIMIT + 10 }, (_, i) => `s${i}`),
      'de',
      undefined,
      { client: { fetch } }
    );
    expect(seen).toHaveLength(SAVED_SPOTS_LIMIT);
  });
});
