import { describe, expect, it } from 'vitest';
import type { MapRestaurant } from '@/lib/types';
import { translations, type Lang } from '@/lib/i18n/translations';
import { PRICE_BUCKETS, priceBucketLabelKey, priceBucketOf } from '../priceBuckets';

const bucketOf = (min?: number) =>
  priceBucketOf({ priceRange: min === undefined ? undefined : { min } } as Pick<
    MapRestaurant,
    'priceRange'
  >);

describe('priceBucketOf', () => {
  it('schneidet am Einstiegspreis, nicht an der Spanne', () => {
    // Google liefert genau diese acht Einstiegspreise (prod, 29.08.2026).
    expect(bucketOf(1)).toBe('u10');
    expect(bucketOf(10)).toBe('10');
    expect(bucketOf(20)).toBe('20');
    expect(bucketOf(30)).toBe('20');
    expect(bucketOf(40)).toBe('40');
    expect(bucketOf(50)).toBe('40');
    expect(bucketOf(60)).toBe('40');
    expect(bucketOf(100)).toBe('100');
  });

  it('hält die offenen Spannen ab 100 € vom oberen Mittelfeld getrennt', () => {
    // Der Grund für die fünfte Stufe: „ab 50 €" warf acht Läden mit 50/60 €
    // Einstieg mit 49 offenen Spannen ab 100 € in einen Topf.
    expect(bucketOf(99)).toBe('40');
    expect(bucketOf(100)).not.toBe('40');
    expect(bucketOf(250)).toBe('100');
  });

  it('deckt mit seinen Grenzen jeden Einstiegspreis des Katalogs ab', () => {
    // Keine Grenze schneidet mitten durch eine Gruppe: die Werte sind diskret.
    for (const min of [1, 10, 20, 30, 40, 50, 60, 100]) {
      expect(bucketOf(min), String(min)).not.toBeNull();
    }
  });

  it('steckt einen Spot ohne Preis in keine Stufe', () => {
    expect(bucketOf(undefined)).toBeNull();
  });
});

describe('Beschriftung der Preisstufen', () => {
  for (const lang of ['de', 'en'] as Lang[]) {
    it(`gibt jeder Stufe in ${lang} echten Text statt des Schlüssels`, () => {
      const map = translations[lang].map as unknown as Record<string, string>;
      for (const bucket of PRICE_BUCKETS) {
        const key = priceBucketLabelKey(bucket.id);
        expect(key, bucket.id).toBe(bucket.labelKey);
        const [namespace, name] = key.split('.');
        expect(namespace, key).toBe('map');
        expect(map[name], key).toBeTruthy();
      }
    });
  }

  it('beschriftet keine zwei Stufen gleich', () => {
    const de = translations.de.map as unknown as Record<string, string>;
    const labels = PRICE_BUCKETS.map((b) => de[b.labelKey.split('.')[1]]);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
