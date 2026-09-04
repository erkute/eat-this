// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MapRestaurant } from '@/lib/types';
import { useMapFilters } from '../useMapFilters';

/**
 * The picker counts. Before them both lists were built from the whole
 * catalogue with nothing said about what any row would return: a Bezirk
 * holding five spots still offered every cuisine in Berlin, and eighteen of
 * those rows were guaranteed zeroes you only discovered by tapping.
 *
 * What has to hold: each row is counted against the OTHER chips, and its own
 * chip is lifted while counting — otherwise picking "Neukölln" would make
 * every district but Neukölln read 0 and the picker would be useless for
 * switching. Paywalled spots count like every other spot: they stand in the
 * list too, so a number that left them out would predict the wrong list.
 */

let nextId = 0;
function spot(partial: Partial<MapRestaurant>): MapRestaurant {
  nextId += 1;
  return {
    _id: `r${nextId}`,
    _createdAt: '2026-01-01',
    name: `Spot ${nextId}`,
    slug: `spot-${nextId}`,
    isClosed: false,
    lat: 52.5,
    lng: 13.4,
    mustEatCount: 0,
    ...partial,
  } as MapRestaurant;
}

const ROWS: MapRestaurant[] = [
  spot({
    bezirk: { name: 'Mitte' },
    priceRange: { currency: 'EUR', min: 20, max: 30 },
    categories: [{ name: 'Pizza', slug: 'pizza' }],
  }),
  spot({
    bezirk: { name: 'Mitte' },
    priceRange: { currency: 'EUR', min: 20, max: 30 },
    categories: [{ name: 'Dinner', slug: 'dinner' }],
  }),
  spot({
    bezirk: { name: 'Mitte' },
    priceRange: { currency: 'EUR', min: 10, max: 20 },
    categories: [{ name: 'Dinner', slug: 'dinner' }],
  }),
  spot({
    bezirk: { name: 'Neukölln' },
    priceRange: { currency: 'EUR', min: 10, max: 20 },
    categories: [{ name: 'Pizza', slug: 'pizza' }],
  }),
  spot({
    bezirk: { name: 'Wedding' },
    priceRange: { currency: 'EUR', min: 5, max: 10 },
    categories: [{ name: 'Dinner', slug: 'dinner' }],
  }),
] as MapRestaurant[];

/* Behind the paywall: one more cheap spot in Wedding, two 20-€-Spots in Mitte —
   und einer ab 100 €, eine Preisstufe, die der freie Satz gar nicht hat. */
const LOCKED: MapRestaurant[] = [
  spot({
    bezirk: { name: 'Wedding' },
    priceRange: { currency: 'EUR', min: 5, max: 10 },
    categories: [{ name: 'Dinner', slug: 'dinner' }],
  }),
  spot({
    bezirk: { name: 'Mitte' },
    priceRange: { currency: 'EUR', min: 20, max: 30 },
    categories: [{ name: 'Pizza', slug: 'pizza' }],
  }),
  spot({
    bezirk: { name: 'Mitte' },
    priceRange: { currency: 'EUR', min: 20, max: 30 },
    categories: [{ name: 'Pizza', slug: 'pizza' }],
  }),
  spot({
    bezirk: { name: 'Neukölln' },
    priceRange: { currency: 'EUR', min: 100 },
    categories: [{ name: 'Dinner', slug: 'dinner' }],
  }),
] as MapRestaurant[];

function mount() {
  return renderHook(() =>
    useMapFilters({ restaurants: ROWS, lockedRestaurants: LOCKED, location: null })
  );
}

describe('useMapFilters option counts', () => {
  it('counts every row of an untouched picker', () => {
    const { result } = mount();
    const { byValue, withoutDimension } = result.current.optionCounts;

    // 5 free + 4 locked spots, counted as one catalogue.
    expect(byValue.bezirk.get('Mitte')).toBe(5);
    expect(byValue.bezirk.get('Neukölln')).toBe(2);
    expect(byValue.price.get('20')).toBe(4);
    expect(byValue.category.get('dinner')).toBe(5);
    expect(withoutDimension.bezirk).toBe(9);
  });

  it('narrows the other pickers once a chip is set', () => {
    const { result } = mount();
    act(() => result.current.setBezirk('Mitte'));

    const { byValue, withoutDimension } = result.current.optionCounts;
    // Mitte hält vier 20-€-Spots und einen 10-€-Spot, und gar nichts unter 10 —
    // die Zeile, die früher aussah wie jede andere.
    expect(byValue.price.get('20')).toBe(4);
    expect(byValue.price.get('10')).toBe(1);
    expect(byValue.price.get('u10')).toBeUndefined();
    expect(withoutDimension.price).toBe(5);
  });

  it('lifts a pickers own chip so it can still be switched', () => {
    const { result } = mount();
    act(() => result.current.setBezirk('Mitte'));

    // Counted with the Bezirk chip lifted: every district keeps its own total,
    // or the Bezirk picker would read 3 / 0 / 0 and offer no way out of Mitte.
    const { byValue, withoutDimension } = result.current.optionCounts;
    expect(byValue.bezirk.get('Mitte')).toBe(5);
    expect(byValue.bezirk.get('Neukölln')).toBe(2);
    expect(byValue.bezirk.get('Wedding')).toBe(2);
    expect(withoutDimension.bezirk).toBe(9);
  });

  it('combines the remaining chips', () => {
    const { result } = mount();
    act(() => result.current.setBezirk('Mitte'));
    act(() => result.current.setCategory('dinner'));

    // Mitte + Dinner = der 20-€-Spot und der 10-€-Spot.
    const { byValue } = result.current.optionCounts;
    expect(byValue.price.get('20')).toBe(1);
    expect(byValue.price.get('10')).toBe(1);
  });

  it('ignores the search box, which overrides the chips rather than narrowing them', () => {
    const { result } = mount();
    act(() => result.current.setSearch('zzz-nothing-matches'));

    // The list is empty under that query, but the counts describe what the
    // chips give once it is cleared — which is what the paused chip rail says.
    expect(result.current.displayedRestaurants).toHaveLength(0);
    expect(result.current.optionCounts.byValue.bezirk.get('Mitte')).toBe(5);
  });
});

/**
 * The paywalled half of the catalogue. It used to be invisible up here: the
 * pickers were built and counted from the free set alone, so a cuisine only
 * locked spots carry had no row at all, and a row whose every hit was locked
 * read 0 while the map underneath showed its dots.
 */
describe('useMapFilters with the paywalled spots in', () => {
  it('offers a price step that only locked spots carry', () => {
    const { result } = mount();

    expect(result.current.priceBucketIds).toContain('100');
    expect(result.current.optionCounts.byValue.price.get('100')).toBe(1);
  });

  it('still knows a real zero when it sees one', () => {
    const { result } = mount();
    act(() => result.current.setBezirk('Mitte'));

    // Nichts ab 100 € in Mitte, weder frei noch gesperrt: keine Zeile.
    expect(result.current.optionCounts.byValue.price.get('100')).toBeUndefined();
  });

  it('hands the list every match and the map only the free ones', () => {
    const { result } = mount();
    act(() => result.current.setPrice('u10'));

    // Ein freier Spot unter 10 €, einer gesperrt. Die Liste zeigt beide; der
    // freie Satz hinter den Markern behält den einen.
    expect(result.current.displayedRestaurants).toHaveLength(1);
    expect(result.current.displayedLockedRestaurants).toHaveLength(1);
    expect(result.current.listRestaurants).toHaveLength(2);
  });

  it('has nothing extra to show someone who owns the whole map', () => {
    const { result } = renderHook(() => useMapFilters({ restaurants: ROWS, location: null }));

    expect(result.current.priceBucketIds).not.toContain('100');
    expect(result.current.listRestaurants).toHaveLength(ROWS.length);
  });
});

/**
 * The order of the list itself. It used to have none: it inherited the order
 * the map payload was assembled in — curated spots, the round-robin district
 * fill, and then whatever the home page surfaces, appended at the end. Tapping
 * a dish on the home page therefore landed you on the very last row of 340
 * when you closed it again.
 */
describe('useMapFilters list order', () => {
  const ROW_ZOLA = spot({ name: 'Zola', mustEatCount: 0 });
  const ROW_ADANA = spot({ name: 'Adana', mustEatCount: 0 });
  const ROW_MUSTAFA = spot({ name: 'Mustafa', mustEatCount: 2 });
  const LOCKED_BUNKER = spot({ name: 'Bunker', mustEatCount: 3 });

  it('leads with the spots carrying Must Eats, then goes alphabetical', () => {
    const { result } = renderHook(() =>
      useMapFilters({
        restaurants: [ROW_ZOLA, ROW_ADANA, ROW_MUSTAFA],
        lockedRestaurants: [LOCKED_BUNKER],
        location: null,
      })
    );

    // Bunker is paywalled and still first: one list, one rule.
    expect(result.current.listRestaurants.map((r) => r.name)).toEqual([
      'Bunker',
      'Mustafa',
      'Adana',
      'Zola',
    ]);
  });

  it('does not park an appended spot at the end', () => {
    // applyFreeSurface appends whatever the home page teases to the visible
    // set. That is a build step, not a ranking, and must not reach the list.
    const appended = spot({ name: 'Gazzo', mustEatCount: 1 });
    const { result } = renderHook(() =>
      useMapFilters({
        restaurants: [ROW_ZOLA, ROW_ADANA, ROW_MUSTAFA, appended],
        location: null,
      })
    );

    expect(result.current.listRestaurants.at(-1)?.name).not.toBe('Gazzo');
    expect(result.current.listRestaurants[1].name).toBe('Gazzo');
  });

  it('lets a location outrank everything', () => {
    const near = spot({ name: 'Zola', lat: 52.5, lng: 13.4, mustEatCount: 0 });
    const far = spot({ name: 'Mustafa', lat: 52.6, lng: 13.62, mustEatCount: 9 });
    const { result } = renderHook(() =>
      useMapFilters({ restaurants: [far, near], location: { lat: 52.5, lng: 13.4 } })
    );

    // Nine Must Eats do not beat standing in front of the door.
    expect(result.current.listRestaurants.map((r) => r.name)).toEqual(['Zola', 'Mustafa']);
  });

  it('lets the map centre outrank the visitor once the map has been moved', () => {
    const nearMe = spot({ name: 'Zola', lat: 52.5, lng: 13.4, mustEatCount: 0 });
    const nearMap = spot({ name: 'Mustafa', lat: 52.6, lng: 13.62, mustEatCount: 0 });
    const { result } = renderHook(() =>
      useMapFilters({
        restaurants: [nearMe, nearMap],
        location: { lat: 52.5, lng: 13.4 },
        listCenter: { lat: 52.6, lng: 13.62 },
      })
    );

    // The list says what the map shows, not where the phone is.
    expect(result.current.listRestaurants.map((r) => r.name)).toEqual(['Mustafa', 'Zola']);
    // The markers' own order still works from the visitor.
    expect(result.current.displayedRestaurants.map((r) => r.name)).toEqual(['Zola', 'Mustafa']);
  });
});

/**
 * Die zwei Regeln, die den Chip-Rail am 27.08.2026 gekürzt haben: Bezirke erst
 * ab fünf Spots, und ein Spot ohne gepflegten Preis fällt in keine Stufe.
 */
describe('useMapFilters, gekürzte Auswahllisten', () => {
  it('bietet nur Bezirke mit mindestens fünf Spots an', () => {
    const { result } = mount();

    // Mitte hat fünf, Neukölln und Wedding je zwei.
    expect(result.current.bezirkNames).toEqual(['Mitte']);
    // Gezählt wird trotzdem über alle — die Spots verschwinden nicht.
    expect(result.current.listRestaurants).toHaveLength(9);
  });

  it('steckt einen Spot ohne Preis in keine Stufe', () => {
    const ohnePreis = spot({ bezirk: { name: 'Mitte' }, categories: [] });
    const { result } = renderHook(() =>
      useMapFilters({ restaurants: [...ROWS, ohnePreis], location: null })
    );

    const summe = [...result.current.optionCounts.byValue.price.values()].reduce(
      (a, b) => a + b,
      0
    );
    expect(summe).toBe(ROWS.length);
    expect(result.current.listRestaurants).toHaveLength(ROWS.length + 1);
  });

  it('hält die Preisstufen in der Reihenfolge billig → teuer', () => {
    const { result } = mount();

    expect(result.current.priceBucketIds).toEqual(['u10', '10', '20', '100']);
  });
});

/**
 * Was man tippt, ist nicht, was in Sanity steht.
 *
 * Zwei gemeldete Fehlschlaege, zwei verschiedene Ursachen:
 * - „banh mi" fand „Saveur de Bánh Mì" nicht. `includes` vergleicht Zeichen
 *   fuer Zeichen, und `a` ist nicht `á`.
 * - „vietnamesisch" fand keinen der acht vietnamesischen Spots. Der
 *   `cuisineType` steht ENGLISCH in Sanity; das deutsche Label, das man auf
 *   der Karte liest und deshalb auch eintippt, kannte die Suche nicht.
 */
describe('useMapFilters Suche', () => {
  const SUCHZEILEN: MapRestaurant[] = [
    spot({ name: 'Saveur de Bánh Mì Mitte', cuisineType: 'Vietnamese' }),
    spot({ name: 'Monsieur Vuong', cuisineType: 'Vietnamese' }),
    spot({
      name: "KuchenRausch's Feinbäckerei",
      cuisineType: 'Bakery',
      address: 'Kastanienallee 12',
      bezirk: { name: 'Prenzlauer Berg' },
    }),
    spot({ name: 'Zur Bratpfanne', cuisineType: 'German / Fast Food' }),
    spot({ name: 'Osteria Numero 1', cuisineType: 'Italian', bezirk: { name: 'Neukölln' } }),
  ];
  const suche = (q: string) => {
    const { result } = renderHook(() =>
      useMapFilters({ restaurants: SUCHZEILEN, location: null })
    );
    act(() => result.current.setSearch(q));
    return result.current.displayedRestaurants.map((r) => r.name);
  };

  it('findet Bánh Mì, auch ohne die Akzente zu tippen', () => {
    expect(suche('banh mi')).toEqual(['Saveur de Bánh Mì Mitte']);
  });

  it('findet es auch andersherum — Akzente getippt, ohne im Namen', () => {
    // „Neukölln" ist im Datensatz mit Umlaut geschrieben; wer ihn tippt, muss
    // ihn genauso finden wie wer ihn weglaesst.
    expect(suche('neukolln')).toEqual(['Osteria Numero 1']);
    expect(suche('neukölln')).toEqual(['Osteria Numero 1']);
  });

  it('findet die Kueche unter ihrem deutschen Namen', () => {
    expect(suche('vietnamesisch').sort()).toEqual(
      ['Monsieur Vuong', 'Saveur de Bánh Mì Mitte'].sort()
    );
  });

  it('findet sie weiterhin unter dem englischen Rohwert', () => {
    expect(suche('vietnamese').sort()).toEqual(
      ['Monsieur Vuong', 'Saveur de Bánh Mì Mitte'].sort()
    );
  });

  it('findet die Strasse — sie liegt ohnehin im Kartenpayload', () => {
    expect(suche('kastanienallee')).toEqual(["KuchenRausch's Feinbäckerei"]);
  });

  it('findet den Bezirk auch in der Kurzform, die auf den Aufklebern steht', () => {
    expect(suche("p'berg")).toEqual(["KuchenRausch's Feinbäckerei"]);
    expect(suche('prenzlauer')).toEqual(["KuchenRausch's Feinbäckerei"]);
  });

  it('stolpert nicht ueber den Apostroph im Namen', () => {
    // Welches der vier Apostroph-Zeichen im Namen steht, sieht man ihm nicht an.
    expect(suche('kuchenrauschs')).toEqual(["KuchenRausch's Feinbäckerei"]);
  });

  it('erfindet nichts dazu', () => {
    expect(suche('koreanisch')).toEqual([]);
  });
});
