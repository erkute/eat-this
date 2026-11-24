import { describe, expect, it } from 'vitest';
import {
  parseVital,
  summarizeVitals,
  vitalBucket,
  vitalPageType,
  vitalRating,
  type VitalDoc,
} from './webVitals';

describe('vitalPageType', () => {
  it('ordnet Pfade in beiden Sprachen einem Seitentyp zu', () => {
    expect(vitalPageType('/')).toBe('home');
    expect(vitalPageType('/en')).toBe('home');
    expect(vitalPageType('/restaurant/crapulix')).toBe('spot');
    expect(vitalPageType('/en/news/beste-pizza')).toBe('article');
    expect(vitalPageType('/news')).toBe('magazine');
    expect(vitalPageType('/map')).toBe('map');
    expect(vitalPageType('/kategorie/pizza')).toBe('category');
    expect(vitalPageType('/bezirk/neukoelln')).toBe('district');
    expect(vitalPageType('/about')).toBe('other');
  });
  it('verwirft, was keine Route der Seite ist', () => {
    expect(vitalPageType('/wp-admin')).toBeNull();
    expect(vitalPageType(42)).toBeNull();
  });
});

describe('vitalBucket', () => {
  it('rundet auf die Stufe ab und deckelt die letzte', () => {
    expect(vitalBucket('LCP', 2_499)).toBe(24);
    expect(vitalBucket('LCP', 60_000)).toBe(100);
    expect(vitalBucket('INP', 199)).toBe(19);
    expect(vitalBucket('CLS', 0.1)).toBe(10);
    expect(vitalBucket('CLS', 0.07)).toBe(7);
    expect(vitalBucket('CLS', 3)).toBe(100);
  });
});

describe('parseVital', () => {
  const base = { path: '/map', device: 'desktop' };
  it('nimmt einen gültigen Messwert an', () => {
    expect(parseVital({ ...base, vital: 'INP', value: 184 })).toEqual({
      metric: 'INP',
      page: 'map',
      device: 'desktop',
      bucket: 18,
    });
  });
  it('verwirft fremde Kennzahlen, Geräte und unplausible Werte', () => {
    expect(parseVital({ ...base, vital: 'FCP', value: 100 })).toBeNull();
    expect(parseVital({ ...base, vital: 'LCP', value: '100' })).toBeNull();
    expect(parseVital({ ...base, vital: 'LCP', value: Number.NaN })).toBeNull();
    expect(parseVital({ ...base, vital: 'LCP', value: 500_000 })).toBeNull();
    expect(parseVital({ ...base, vital: 'CLS', value: -0.1 })).toBeNull();
    expect(parseVital({ ...base, device: 'watch', vital: 'CLS', value: 0 })).toBeNull();
    expect(
      parseVital({ path: '/wp-login.php', device: 'phone', vital: 'CLS', value: 0 })
    ).toBeNull();
  });
});

describe('summarizeVitals', () => {
  it('rechnet Median und P75 über alle Tage, aufgerundet auf die Stufe', () => {
    const docs: VitalDoc[] = [
      // LCP: zwei Aufrufe in [1,0 s; 1,1 s), einer in [2,0; 2,1), einer in [4,5; 4,6)
      { day: '2026-11-21', hist: { LCP: { spot: { phone: { '10': 2, '20': 1 } } } } },
      { day: '2026-11-20', hist: { LCP: { spot: { phone: { '45': 1 } } } } },
    ];
    const summary = summarizeVitals(docs);
    expect(summary.since).toBe('2026-11-20');
    expect(summary.rows).toHaveLength(1);
    const [row] = summary.rows;
    expect(row).toMatchObject({ page: 'spot', device: 'phone' });
    expect(row.metrics.LCP).toEqual({
      count: 4,
      median: 1_100,
      medianIsLowerBound: false,
      p75: 2_100,
      p75IsLowerBound: false,
    });
    expect(row.metrics.INP).toEqual({
      count: 0,
      median: null,
      medianIsLowerBound: false,
      p75: null,
      p75IsLowerBound: false,
    });
  });
  it('rechnet CLS ohne Fließkomma-Krümel', () => {
    const [row] = summarizeVitals([
      { day: '2026-11-21', hist: { CLS: { home: { desktop: { '0': 3, '12': 1 } } } } },
    ]).rows;
    expect(row.metrics.CLS).toEqual({
      count: 4,
      median: 0.01,
      medianIsLowerBound: false,
      p75: 0.01,
      p75IsLowerBound: false,
    });
  });
  it('unterscheidet die Untergrenze der offenen Stufe von der gleichen Obergrenze davor', () => {
    const [row] = summarizeVitals([
      {
        day: '2026-11-21',
        hist: {
          LCP: { home: { desktop: { '99': 2, '100': 2 } } },
          INP: { home: { desktop: { '100': 4 } } },
          CLS: { home: { desktop: { '99': 3, '100': 1 } } },
        },
      },
    ]).rows;
    expect(row.metrics.LCP).toEqual({
      count: 4,
      median: 10_000,
      medianIsLowerBound: false,
      p75: 10_000,
      p75IsLowerBound: true,
    });
    expect(row.metrics.INP).toEqual({
      count: 4,
      median: 1_000,
      medianIsLowerBound: true,
      p75: 1_000,
      p75IsLowerBound: true,
    });
    expect(row.metrics.CLS).toMatchObject({ p75: 1, p75IsLowerBound: false });
  });
  it('ignoriert kaputte Schlüssel und Zähler', () => {
    const [row] = summarizeVitals([
      {
        day: '2026-11-21',
        hist: { INP: { map: { phone: { x: 5, '-1': 3, '30': -2, '40': 1 } } } },
      },
    ]).rows;
    expect(row.metrics.INP).toEqual({
      count: 1,
      median: 410,
      medianIsLowerBound: false,
      p75: 410,
      p75IsLowerBound: false,
    });
  });
});

describe('vitalRating', () => {
  it('folgt Googles Grenzen', () => {
    expect(vitalRating('LCP', 2_500)).toBe('good');
    expect(vitalRating('LCP', 2_600)).toBe('mid');
    expect(vitalRating('LCP', 4_100)).toBe('poor');
    expect(vitalRating('INP', 200)).toBe('good');
    expect(vitalRating('CLS', 0.26)).toBe('poor');
  });
});
