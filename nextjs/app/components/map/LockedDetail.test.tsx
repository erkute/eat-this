import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MapRestaurant } from '@/lib/types';

vi.mock('next-intl', () => ({ useLocale: () => 'de' }));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'map.lockedDetailKicker' ? 'Noch verdeckt' : key),
  }),
}));
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@/lib/map', () => ({ abbreviateBezirk: (s: string | null) => s }));

import LockedDetail from './LockedDetail';

function spot(over: Partial<MapRestaurant> = {}): MapRestaurant {
  return {
    _id: 'r1',
    name: 'Testspot',
    slug: 'testspot',
    lat: 52.52,
    lng: 13.4,
    bezirk: { name: 'Kreuzberg' },
    categories: [{ slug: 'lunch', name: 'Lunch' }],
    mustEatCount: 0,
    ...over,
  } as MapRestaurant;
}

function html(r: MapRestaurant, total = 345) {
  return renderToStaticMarkup(
    <LockedDetail
      restaurant={r}
      totalSpots={total}
      contentRef={null}
      onClose={() => {}}
    />
  );
}

describe('LockedDetail', () => {
  it('never links to the restaurant page', () => {
    /* Those articles exist for search. Telling a paying-curious visitor that
       this spot is readable for free sells against the pack directly above it
       (user decision, 2026-08-19). This is the assertion that decision needs. */
    const out = html(spot());
    expect(out).not.toContain('/restaurant/testspot');
    expect(out).not.toContain('frei lesen');
  });

  it('drops the "you can read it anyway" line', () => {
    expect(html(spot())).not.toContain('nur die Map kostet');
  });

  it('leads with the pack that actually unlocks this spot', () => {
    const out = html(spot());
    expect(out).toContain('/pack/lunch');
    expect(out).toContain('Lunch');
    expect(out).toContain('2,99 €');
  });

  it('offers all-Berlin with its size and price, not a bare slogan', () => {
    const out = html(spot());
    expect(out).toContain('/pack/all-berlin');
    expect(out).toContain('Ganz Berlin · 345 Spots');
    expect(out).toContain('9,99 €');
  });

  it('keeps the line the wording was built around', () => {
    expect(html(spot())).toContain('Liegt noch nicht auf deiner Map.');
  });

  it('falls back to all-Berlin alone when no category pack applies', () => {
    const out = html(spot({ categories: [] }));
    expect(out).toContain('/pack/all-berlin');
    expect(out).not.toContain('/pack/lunch');
  });

  it('states a spot count for all-Berlin only', () => {
    /* A category count invites the comparison that sinks the bundle: Dinner
       alone is 225 of 340 spots and Lunch 205, so "225 Spots · 2,99 €" beside
       the bundle argues against the bundle every time. */
    const out = html(spot());
    const lunchBlock = out.slice(out.indexOf('/pack/lunch'), out.indexOf('/pack/all-berlin'));
    expect(lunchBlock).not.toContain('Spots');
    expect(out.slice(out.indexOf('/pack/all-berlin'))).toContain('Spots');
  });

  it('shows the category pack as its own art', () => {
    expect(html(spot())).toContain('booster_lunch.webp');
  });

  it('fans out all nine packs for all-Berlin, the way /packs does', () => {
    // One generic bag cannot say "everything". Nine can.
    const out = html(spot());
    for (const art of [
      'booster_breakfast',
      'booster_coffee',
      'booster_dinner',
      'booster_drinks',
      'booster_fastfood',
      'booster_finedining',
      'booster_lunch',
      'booster_pizza',
      'booster_sweets',
    ]) {
      expect(out).toContain(`${art}.webp`);
    }
  });

  it('still names the spot — the name is not what the paywall covers', () => {
    expect(html(spot())).toContain('Testspot');
  });
});
