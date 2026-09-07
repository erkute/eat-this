import { describe, expect, it } from 'vitest';
import {
  dayDetailsOf,
  moversOf,
  opportunitiesOf,
  pathOf,
  summarizeSearch,
  totalsOf,
  type ApiRow,
  type SearchInput,
} from './searchConsole';

const day = (date: string, clicks: number, impressions: number, position: number): ApiRow => ({
  keys: [date],
  clicks,
  impressions,
  ctr: impressions ? clicks / impressions : 0,
  position,
});

describe('totalsOf', () => {
  it('rechnet CTR und Position neu, statt Tageswerte zu mitteln', () => {
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

describe('moversOf', () => {
  it('trennt Aufwind und Abwind nach Klicks und behaelt die Impressionen daneben', () => {
    const movers = moversOf(
      [
        { key: 'steigt', clicks: 10, impressions: 100, ctr: 0.1, position: 3 },
        { key: 'faellt', clicks: 1, impressions: 90, ctr: 0.01, position: 9 },
        { key: 'gleich', clicks: 5, impressions: 50, ctr: 0.1, position: 5 },
        { key: 'neu', clicks: 2, impressions: 20, ctr: 0.1, position: 4 },
      ],
      [
        { key: 'steigt', clicks: 4, impressions: 80, ctr: 0.05, position: 6 },
        { key: 'faellt', clicks: 7, impressions: 95, ctr: 0.07, position: 4 },
        { key: 'gleich', clicks: 5, impressions: 70, ctr: 0.07, position: 5 },
        { key: 'weg', clicks: 3, impressions: 30, ctr: 0.1, position: 8 },
      ]
    );

    expect(movers.rising.map((m) => m.key)).toEqual(['steigt', 'neu']);
    expect(movers.falling.map((m) => m.key)).toEqual(['faellt', 'weg']);
    expect(movers.rising[0]).toEqual({
      key: 'steigt',
      clicks: 10,
      clicksBefore: 4,
      impressions: 100,
      impressionsBefore: 80,
      position: 3,
      positionBefore: 6,
      diff: 6,
    });
    // Ohne Klick-Differenz keine Bewegung — auch wenn die Impressionen sich rührten.
    expect([...movers.rising, ...movers.falling].some((m) => m.key === 'gleich')).toBe(false);
  });
});

describe('dayDetailsOf', () => {
  it('nimmt den frischesten Tag mit Daten und den davor, mit exakten Tagessummen', () => {
    const totals = new Map([
      ['2026-09-04', { clicks: 30, impressions: 3000, ctr: 0.01, position: 10 }],
      ['2026-09-05', { clicks: 20, impressions: 2000, ctr: 0.01, position: 11 }],
      // Der 06. ist bei Google noch leer — er darf nicht der „frischeste" sein.
      ['2026-09-06', { clicks: 0, impressions: 0, ctr: 0, position: 0 }],
    ]);
    const details = dayDetailsOf(
      [
        { keys: ['2026-09-05', 'bari berlin'], clicks: 5, impressions: 50, ctr: 0.1, position: 4 },
        { keys: ['2026-09-05', 'gemello'], clicks: 8, impressions: 80, ctr: 0.1, position: 5 },
        { keys: ['2026-09-04', 'bari berlin'], clicks: 6, impressions: 60, ctr: 0.1, position: 4 },
      ],
      [
        {
          keys: ['2026-09-05', 'https://www.eatthisdot.com/map'],
          clicks: 9,
          impressions: 90,
          ctr: 0.1,
          position: 6,
        },
      ],
      totals
    );

    expect(details.latestDay?.day).toBe('2026-09-05');
    // Die Tagessumme kommt aus der Tagesreihe (inkl. anonymisierter Suchen),
    // nicht aus der Summe der Anfragen (13).
    expect(details.latestDay?.totals.clicks).toBe(20);
    expect(details.latestDay?.queries.map((q) => q.key)).toEqual(['gemello', 'bari berlin']);
    expect(details.latestDay?.pages[0].key).toBe('/map');
    expect(details.previousDay?.day).toBe('2026-09-04');
    expect(details.previousDay?.pages).toEqual([]);
  });

  it('bleibt ohne Daten bei null', () => {
    expect(dayDetailsOf([], [], new Map())).toEqual({ latestDay: null, previousDay: null });
  });
});

describe('summarizeSearch', () => {
  const input: SearchInput = {
    property: 'sc-domain:eatthisdot.com',
    range: { start: '2026-08-06', end: '2026-09-02', days: 28 },
    byDay: [day('2026-09-02', 23, 4225, 12.5), day('2026-09-01', 24, 4242, 12.6)],
    byDayBefore: [day('2026-08-05', 6, 1003, 10.8)],
    byQuery: [
      { keys: ['bari berlin menu'], clicks: 9, impressions: 106, ctr: 0.085, position: 5.2 },
      { keys: ['gemello'], clicks: 1, impressions: 947, ctr: 0.001, position: 6.4 },
      { keys: [''], clicks: 100, impressions: 100, ctr: 1, position: 1 },
    ],
    byQueryBefore: [{ keys: ['gemello'], clicks: 4, impressions: 500, ctr: 0.008, position: 5 }],
    byPage: [
      {
        keys: ['https://www.eatthisdot.com/en/kategorie/lunch'],
        clicks: 24,
        impressions: 2650,
        ctr: 0.009,
        position: 10.3,
      },
    ],
    byDevice: [
      { keys: ['MOBILE'], clicks: 40, impressions: 7000, ctr: 0.006, position: 12 },
      { keys: ['DESKTOP'], clicks: 7, impressions: 1467, ctr: 0.005, position: 14 },
    ],
    byCountry: [{ keys: ['deu'], clicks: 45, impressions: 8000, ctr: 0.006, position: 12 }],
    byDateQuery: [
      {
        keys: ['2026-09-02', 'bari berlin menu'],
        clicks: 2,
        impressions: 10,
        ctr: 0.2,
        position: 5,
      },
    ],
    byDatePage: [],
    fetchedAt: '2026-09-03T20:00:00.000Z',
  };

  it('sortiert die Tage aufsteigend und summiert sie', () => {
    const result = summarizeSearch(input);

    expect(result.days.map((d) => d.day)).toEqual(['2026-09-01', '2026-09-02']);
    expect(result.days[0]).toMatchObject({ clicks: 24, impressions: 4242, position: 12.6 });
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
    expect(result.opportunities.map((q) => q.key)).toEqual(['gemello', 'bari berlin menu']);
  });

  it('liefert Geraete, Laender, Bewegungen und den frischesten Tag', () => {
    const result = summarizeSearch(input);

    expect(result.devices.map((d) => d.key)).toEqual(['MOBILE', 'DESKTOP']);
    expect(result.countries[0].key).toBe('deu');
    expect(result.movers.rising[0].key).toBe('bari berlin menu');
    expect(result.movers.falling[0]).toMatchObject({ key: 'gemello', clicks: 1, clicksBefore: 4 });
    expect(result.latestDay?.day).toBe('2026-09-02');
    expect(result.latestDay?.totals.clicks).toBe(23);
    expect(result.latestDay?.queries[0].key).toBe('bari berlin menu');
    expect(result.previousDay?.day).toBe('2026-09-01');
  });
});
