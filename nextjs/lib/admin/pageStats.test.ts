import { describe, expect, it } from 'vitest';
import { measureDay, pageInfo, pageRows, PAGE_GROUPS } from './pageStats';

describe('Besucheraufteilung nach Seitenart', () => {
  it('ordnet jeden der 201 Tagesbesucher genau einer Einstiegsgruppe zu', () => {
    const entryPaths = [
      { key: '/', count: 8 },
      { key: '/news/ein-artikel', count: 86 },
      { key: '/en/restaurant/ein-spot', count: 50 },
      { key: '/kategorie/coffee', count: 32 },
      { key: '/bezirk/mitte', count: 14 },
      { key: '/map', count: 8 },
      { key: '/must-eats', count: 2 },
      { key: '/deck', count: 1 },
    ];
    const rows = pageRows([{ key: '/', count: 21 }, ...entryPaths.slice(1)], entryPaths);
    const grouped = PAGE_GROUPS.map(([key]) =>
      rows.filter((row) => row.group === key).reduce((s, row) => s + row.entries, 0)
    );
    expect(grouped.reduce((s, n) => s + n, 0)).toBe(201);
    expect(rows.find((row) => row.key === '/')).toMatchObject({ entries: 8, views: 21 });
  });
  it('zeigt eine nur später im Besuch aufgerufene Seite mit null Einstiegen', () => {
    expect(pageRows([{ key: '/news/spaeter', count: 1 }], [])).toEqual([
      { key: '/news/spaeter', group: 'articles', locale: 'de', entries: 0, views: 1 },
    ]);
  });
  it.each([
    ['/', 'home'],
    ['/en', 'home'],
    ['/map', 'map'],
    ['/restaurant/spot', 'spots'],
    ['/news', 'magazine'],
    ['/en/news/artikel', 'articles'],
    ['/bezirk', 'districts'],
    ['/bezirk/mitte', 'districts'],
    ['/kategorie', 'categories'],
    ['/en/kategorie/coffee', 'categories'],
    ['/must-eats', 'must-eats'],
    ['/packs', 'packs'],
    ['/pack/coffee', 'packs'],
    ['/profile', 'profile'],
    ['/deck', 'deck'],
    ['/en/about', 'info'],
    ['/contact', 'info'],
    ['/impressum', 'info'],
    ['/datenschutz', 'info'],
    ['/agb', 'info'],
    ['/checkout/success', 'checkout'],
    ['/other', 'other'],
  ])('ordnet %s der richtigen Gruppe zu', (path, group) =>
    expect(pageInfo(path).group).toBe(group)
  );
  it('zeigt fehlende und widersprüchliche Daten, ohne sie passend zu rechnen', () => {
    expect(
      measureDay({
        day: '2026-11-01',
        visitors: 201,
        pageviews: 370,
        entryPaths: { '/': 190 },
        paths: { '/': 380 },
      })
    ).toMatchObject({ recorded: true, visitors: 201, entries: 190, pageviews: 370, views: 380 });
    expect(measureDay({ day: '2026-11-01' }).recorded).toBe(false);
    expect(measureDay({ day: '2026-11-01', pageviews: 0 }).recorded).toBe(true);
  });
});
