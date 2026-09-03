import { describe, expect, it } from 'vitest';
import { opportunitiesOf, pathOf, summarizeSearch, totalsOf, type ApiRow } from './searchConsole';

const day = (date: string, clicks: number, impressions: number, position: number): ApiRow => ({
  keys: [date],
  clicks,
  impressions,
  ctr: impressions ? clicks / impressions : 0,
  position,
});

describe('totalsOf', () => {
  it('rechnet CTR und Position neu, statt Tageswerte zu mitteln', () => {
    // Ein Tag mit 4.000 Impressionen auf Position 12 und einer mit 40 auf
    // Position 2: der ungewichtete Schnitt (7) laege weit daneben.
    const totals = totalsOf([
      { key: 'a', clicks: 20, impressions: 4000, ctr: 0.005, position: 12 },
      { key: 'b', clicks: 4, impressions: 40, ctr: 0.1, position: 2 },
    ]);

    expect(totals.clicks).toBe(24);
    expect(totals.impressions).toBe(4040);
    expect(totals.ctr).toBeCloseTo(24 / 4040, 6);
    expect(totals.position).toBeCloseTo((12 * 4000 + 2 * 40) / 4040, 6);
  });

  it('bleibt bei null Impressionen bei null statt NaN', () => {
    expect(totalsOf([])).toEqual({ clicks: 0, impressions: 0, ctr: 0, position: 0 });
  });
});

describe('pathOf', () => {
  it('kuerzt die Seite auf den Pfad', () => {
    expect(pathOf('https://www.eatthisdot.com/en/kategorie/lunch')).toBe('/en/kategorie/lunch');
    expect(pathOf('https://www.eatthisdot.com/')).toBe('/');
  });

  it('laesst stehen, was keine URL ist', () => {
    expect(pathOf('eatthisdot.com ohne Schema')).toBe('eatthisdot.com ohne Schema');
  });
});

describe('opportunitiesOf', () => {
  it('nimmt nur oft gezeigte Anfragen auf Position 4 bis 20, nach Impressionen', () => {
    const rows = opportunitiesOf([
      { key: 'ganz oben', clicks: 9, impressions: 300, ctr: 0.03, position: 2.1 },
      { key: 'chance gross', clicks: 2, impressions: 983, ctr: 0.002, position: 6.7 },
      { key: 'chance klein', clicks: 1, impressions: 60, ctr: 0.016, position: 14 },
      { key: 'rauschen', clicks: 0, impressions: 12, ctr: 0, position: 9 },
      { key: 'unsichtbar', clicks: 0, impressions: 500, ctr: 0, position: 45 },
    ]);

    expect(rows.map((r) => r.key)).toEqual(['chance gross', 'chance klein']);
  });
});

describe('summarizeSearch', () => {
  const input = {
    property: 'sc-domain:eatthisdot.com',
    range: { start: '2026-08-06', end: '2026-09-02', days: 28 },
    byDay: [day('2026-09-02', 23, 4225, 12.5), day('2026-09-01', 24, 4242, 12.6)],
    byDayBefore: [day('2026-08-05', 6, 1003, 10.8)],
    byQuery: [
      { keys: ['bari berlin menu'], clicks: 9, impressions: 106, ctr: 0.085, position: 5.2 },
      { keys: ['gemello'], clicks: 1, impressions: 947, ctr: 0.001, position: 6.4 },
      { keys: [''], clicks: 100, impressions: 100, ctr: 1, position: 1 },
    ],
    byPage: [
      {
        keys: ['https://www.eatthisdot.com/en/kategorie/lunch'],
        clicks: 24,
        impressions: 2650,
        ctr: 0.009,
        position: 10.3,
      },
    ],
    fetchedAt: '2026-09-03T20:00:00.000Z',
  };

  it('sortiert die Tage aufsteigend und summiert sie', () => {
    const result = summarizeSearch(input);

    expect(result.days.map((d) => d.day)).toEqual(['2026-09-01', '2026-09-02']);
    expect(result.totals.clicks).toBe(47);
    expect(result.before?.clicks).toBe(6);
  });

  it('laesst die Vorperiode weg, wenn dort nichts lag', () => {
    expect(summarizeSearch({ ...input, byDayBefore: [] }).before).toBeNull();
  });

  it('zeigt Seiten als Pfad und laesst leere Schluessel weg', () => {
    const result = summarizeSearch(input);

    expect(result.pages[0].key).toBe('/en/kategorie/lunch');
    expect(result.queries.map((q) => q.key)).toEqual(['bari berlin menu', 'gemello']);
    // Beide liegen zwischen Position 4 und 20 mit genug Impressionen — nach
    // Impressionen sortiert, nicht nach Klicks.
    expect(result.opportunities.map((q) => q.key)).toEqual(['gemello', 'bari berlin menu']);
  });
});
