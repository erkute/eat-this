import { describe, expect, it } from 'vitest';
import type { MapRestaurant } from '@/lib/types';
import { stripLockedRestaurants } from '../stripLockedRestaurant';

/**
 * Was der Anon-Payload für einen gesperrten Spot noch tragen muss.
 *
 * Der Test existiert wegen eines Fehlers, der sich nicht als Fehler anfühlte:
 * `priceRange` war hier als „detail-only" gestrichen, und als der Preis den
 * Küchen-Filter ablöste, fielen damit ~270 gesperrte Spots lautlos aus jeder
 * Preisstufe. Der Picker zählte 99 statt 465 und sah dabei völlig plausibel
 * aus. Alles, woran die Karte FILTERT, muss hier überleben.
 */
const locked = (partial: Partial<MapRestaurant>): MapRestaurant =>
  ({
    _id: 'r1',
    _createdAt: '2026-01-01',
    name: 'Gesperrt',
    slug: 'gesperrt',
    isClosed: false,
    lat: 52.5,
    lng: 13.4,
    mustEatCount: 0,
    ...partial,
  }) as MapRestaurant;

describe('stripLockedRestaurants', () => {
  it('behält alles, woran die Karte filtert', () => {
    const [out] = stripLockedRestaurants([
      locked({
        bezirk: { name: 'Mitte', slug: 'mitte' },
        categories: [{ name: 'Dinner', slug: 'dinner' }],
        openingHours: [{ days: 'Mon-Sun', hours: '12:00-23:00' }],
        priceRange: { currency: 'EUR', min: 20, max: 60 },
      }),
    ]);

    expect(out.bezirk?.name).toBe('Mitte');
    expect(out.categories?.[0].slug).toBe('dinner');
    expect(out.openingHours).toHaveLength(1);
    expect(out.priceRange?.min).toBe(20);
  });

  it('nimmt vom Preis nur die Untergrenze mit — an ihr schneiden die Stufen', () => {
    const [out] = stripLockedRestaurants([
      locked({ priceRange: { currency: 'EUR', min: 20, max: 60 } }),
    ]);

    expect(out.priceRange).toEqual({ min: 20 });
  });

  it('lässt die Tier-Felder der Server-Logik draußen', () => {
    const [out] = stripLockedRestaurants([locked({ tierAnon: true, tierSigned: false })]);

    expect('tierAnon' in out).toBe(false);
    expect('tierSigned' in out).toBe(false);
  });

  it('erfindet keinen Preis, wo keiner gepflegt ist', () => {
    const [ohne] = stripLockedRestaurants([locked({})]);
    const [leer] = stripLockedRestaurants([locked({ priceRange: { currency: 'EUR' } })]);

    expect('priceRange' in ohne).toBe(false);
    expect('priceRange' in leer).toBe(false);
  });
});
