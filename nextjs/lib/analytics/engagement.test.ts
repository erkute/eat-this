import { describe, it, expect } from 'vitest';
import { parseInsight, surfaceForPath, summarizeInsights, totalInsights } from './engagement';
describe('anonyme Nutzungsaggregate', () => {
  it('trennt Artikel, Magazin und Map und verwirft private/interne Routen', () => {
    expect(surfaceForPath('/en/news/test')).toBe('article');
    expect(surfaceForPath('/news')).toBe('magazine');
    expect(surfaceForPath('/map')).toBe('map');
    for (const path of ['/admin/stats', '/profile', '/news/vorschau/id', '/deck/uid'])
      expect(surfaceForPath(path)).toBeNull();
  });
  it('nimmt nur feste Signale und grobe Zellen an; keine Texte oder Suchbegriffe', () => {
    const value = parseInsight({
      path: '/news/test',
      insight: 'click',
      device: 'phone',
      signals: ['engaged', 'engaged', 'private_search'],
      section: 'content',
      x: 1,
      y: 0,
      target: 'meine private Suche',
    });
    expect(value).toMatchObject({ signals: ['engaged'], click: { cell: '19_0', target: 'other' } });
    expect(JSON.stringify(value)).not.toContain('private');
    expect(
      parseInsight({
        path: '/map',
        insight: 'click',
        device: 'phone',
        section: 'content',
        x: 0.5,
        y: 0.5,
      })
    ).toBeNull();
  });
  it('summiert nur beobachtete Aufrufe und lässt historische Messlücken leer', () => {
    const empty = summarizeInsights([]);
    expect(empty.since).toBeNull();
    expect(empty.pages).toEqual([]);
    const counts = { view: 3, engaged: 2, spot: 1 };
    const result = summarizeInsights([
      {
        day: '2026-11-02',
        surfaces: { map: { phone: counts } },
        pages: { '/map': { surface: 'map', devices: { phone: counts } } },
      },
    ]);
    expect(totalInsights(result.surfaces.map)).toMatchObject(counts);
    expect(result.pages).toHaveLength(1);
  });
});
