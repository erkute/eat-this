import { describe, it, expect } from 'vitest';
import type { MapRestaurant } from '@/lib/types';
import {
  buildSearchIndex,
  matchesSearch,
  needsFuzzy,
  normalizeForSearch,
  parseQuery,
  suggestSpots,
} from '../spotSearch';

const entryFor = (partial: Partial<MapRestaurant>) =>
  buildSearchIndex([{ _id: 'x', name: 'x', lat: 0, lng: 0, ...partial } as MapRestaurant], []).get(
    'x'
  )!;

describe('normalizeForSearch', () => {
  it('bringt alle Strassen-Schreibweisen auf eine Form', () => {
    for (const s of ['Weserstraße', 'Weserstrasse', 'Weserstr.', 'weserstr']) {
      expect(normalizeForSearch(s), s).toBe('weserstr');
    }
  });
});

describe('Suche über den gesamten öffentlichen Spot-Inhalt', () => {
  it('findet Gerichte aus dem öffentlichen Suchtext, auch ohne offene Must-Eat-Karte', () => {
    const entry = entryFor({
      name: 'Lunchlokal',
      searchText: 'hausgemachte tomatensuppe tagliatelle',
    });
    for (const query of ['Suppe', 'soup', 'Suppen', 'Nudeln']) {
      expect(matchesSearch(entry, parseQuery(query)), query).toBe(true);
    }
    expect(matchesSearch(entryFor({ cuisineType: 'Bakery' }), parseQuery('Suppe'))).toBe(false);
  });

  it('durchsucht Bezirk und Kiez gemeinsam statt nur einen davon', () => {
    const entry = entryFor({ bezirk: { name: 'Pankow' }, district: 'Prenzlauer Berg' });
    for (const query of ['Pankow', 'Prenzlauer Berg', 'Pberg']) {
      expect(matchesSearch(entry, parseQuery(query)), query).toBe(true);
    }
  });

  it('kombiniert Gericht, Straße, Hausnummer und Bezirk auch mit Kommas', () => {
    const entry = entryFor({
      searchText: 'döner mit hausgemachtem brot',
      address: 'Weserstraße 21',
      bezirk: { name: 'Neukölln' },
    });
    expect(matchesSearch(entry, parseQuery('Doener, Weserstr. 21, Neukoelln'))).toBe(true);
  });
});

describe('matchesSearch, Tippfehler-Durchgang', () => {
  const pizza = entryFor({ name: 'Standard Serious Pizza' });
  const hit = (q: string) => matchesSearch(pizza, parseQuery(q), true);

  it('verzeiht je Wort einen Buchstaben: ersetzt, fehlend, zu viel, vertauscht', () => {
    expect(hit('seroius')).toBe(true);
    expect(hit('piza')).toBe(true);
    expect(hit('pizzza')).toBe(true);
    expect(hit('pzizza')).toBe(true);
  });

  it('verzeiht keine zwei', () => {
    expect(hit('pazzo')).toBe(false);
    expect(hit('pasta')).toBe(false);
  });

  it('ist ohne den Rückfall exakt', () => {
    expect(matchesSearch(pizza, parseQuery('piza'))).toBe(false);
  });
});

describe('needsFuzzy', () => {
  const index = buildSearchIndex(
    [
      { _id: 'a', name: 'Standard Serious Pizza' },
      { _id: 'b', name: 'Bonanza Coffee' },
    ].map((r) => ({ lat: 0, lng: 0, ...r }) as MapRestaurant),
    []
  );

  /* Eine Regel für Liste und Vorschläge (useMapFilters, suggestSpots): die
     Vorschläge zeigen, was das Abschicken in die Liste holt. */
  it('verzeiht erst, wenn exakt im ganzen Katalog nichts passt', () => {
    expect(needsFuzzy(index, parseQuery('piza'))).toBe(true);
    expect(needsFuzzy(index, parseQuery('pizza'))).toBe(false);
  });

  it('braucht ohne Anfrage keinen Rückfall', () => {
    expect(needsFuzzy(index, [])).toBe(false);
  });
});

describe('suggestSpots', () => {
  const spots = [
    { _id: 'a', name: 'Standard Serious Pizza', cuisineType: 'Italian' },
    { _id: 'b', name: 'Zola', cuisineType: 'Italian', bezirk: { name: 'Kreuzberg' } },
    { _id: 'c', name: 'Pizza Nostra', cuisineType: 'Italian' },
    { _id: 'd', name: 'Bonanza Coffee', cuisineType: 'Coffee' },
  ].map((r) => ({ lat: 0, lng: 0, ...r }) as MapRestaurant);
  const index = buildSearchIndex(spots, []);
  const ids = (q: string, opts?: Parameters<typeof suggestSpots>[3]) =>
    suggestSpots(spots, index, q, opts).map((r) => r._id);

  it('schlägt nichts vor, solange nichts getippt ist', () => {
    expect(ids('')).toEqual([]);
    expect(ids('   ')).toEqual([]);
  });

  it('stellt Namen, die mit dem Getippten anfangen, vor Treffer in anderen Feldern', () => {
    /* „pizza": beide Pizza-Namen vorn, nach Namen sortiert. */
    expect(ids('pizza')).toEqual(['c', 'a']);
    /* „kreuzberg" trifft nur den Bezirk. */
    expect(ids('kreuzberg')).toEqual(['b']);
  });

  it('fällt auf Tippfehler zurück, wenn exakt nichts passt', () => {
    expect(ids('bonanaza')).toEqual(['d']);
  });

  it('zeigt alle Treffer und hält sich an den Filter des Aufrufers', () => {
    expect(ids('italienisch')).toHaveLength(3);
    expect(ids('pizza', { keep: (r) => r._id !== 'c' })).toEqual(['a']);
  });
});

describe('Bezirke und Kieze', () => {
  const spots = [
    { _id: 'k1', name: 'Zola', bezirk: { name: 'Kreuzberg' }, district: 'Kreuzberg' },
    { _id: 'k2', name: 'Kreuzberger Himmel', bezirk: { name: 'Kreuzberg' } },
    /* Der Bezirk steht nur in der Beschreibung (Katalog 27.10.2026). */
    {
      _id: 'm1',
      name: 'Bonanza Coffee Mitte',
      bezirk: { name: 'Mitte' },
      searchText: 'Single Origins aus der eigenen Kreuzberger Röstung',
    },
    {
      _id: 'n1',
      name: 'TiER',
      bezirk: { name: 'Neukölln' },
      searchText: 'wie das Bellman in Kreuzberg',
    },
    { _id: 'n2', name: 'Mittelmeer Grill', bezirk: { name: 'Neukölln' } },
    {
      _id: 'p1',
      name: 'Pizza Nostra',
      bezirk: { name: 'Pankow' },
      district: 'Prenzlauer Berg',
      searchText: 'pizza wie in kreuzberg',
    },
  ].map((r) => ({ lat: 0, lng: 0, ...r }) as MapRestaurant);
  const index = buildSearchIndex(spots, []);
  const hits = (q: string) =>
    spots.filter((r) => matchesSearch(index.get(r._id)!, parseQuery(q, index))).map((r) => r._id);

  it('meint mit einem Bezirk, wo der Spot liegt, nicht wo seine Beschreibung hinzeigt', () => {
    expect(hits('Kreuzberg')).toEqual(['k1', 'k2']);
    expect(hits('X-Berg')).toEqual(['k1', 'k2']);
    expect(hits('neukoelln')).toEqual(['n1', 'n2']);
    expect(hits('nkln')).toEqual(['n1', 'n2']);
  });

  it('trifft Ortswörter auch am Anfang eines Namens, während man ihn tippt', () => {
    expect(hits('Mitte')).toEqual(['m1', 'n2']);
  });

  it('erkennt Kiez und Bezirk zusammen mit anderen Wörtern', () => {
    expect(hits('Pberg')).toEqual(['p1']);
    expect(hits('Pizza Pankow')).toEqual(['p1']);
    expect(hits('pizza kreuzberg')).toEqual([]);
  });

  it('lässt Wörter, die kein Bezirk sind, weiter im ganzen Text suchen', () => {
    expect(hits('Röstung')).toEqual(['m1']);
    expect(hits('bellman')).toEqual(['n1']);
  });

  it('liest einen vertippten Bezirk als den Bezirk', () => {
    expect(hits('Kreutzberg')).toEqual(['k1', 'k2']);
    expect(hits('Neuköln')).toEqual(['n1', 'n2']);
  });

  it('schlägt nur die Spots im Bezirk vor', () => {
    expect(suggestSpots(spots, index, 'kreuzberg').map((r) => r._id)).toEqual(['k2', 'k1']);
  });
});

describe('Alltagswörter, die so an keinem Spot stehen', () => {
  const finds = (query: string, spot: Partial<MapRestaurant>) =>
    matchesSearch(entryFor(spot), parseQuery(query));

  it.each([
    ['Nudeln', { searchText: 'hausgemachte pasta' }],
    ['nudel', { cuisineType: 'Japanese / Ramen' }],
    ['noodles', { searchText: 'ravioli di carne' }],
    ['Döner', { searchText: 'halloumi-döner' }],
    ['Pho', { cuisineType: 'Vietnamese' }],
    ['asiatisch', { cuisineType: 'Korean' }],
    ['asiatisch', { cuisineType: 'Thai' }],
    ['Currywurst', { cuisineType: 'German / Fast Food' }],
    ['Schnitzel', { cuisineType: 'Austrian' }],
    ['Falafel', { cuisineType: 'Israeli' }],
    ['Hummus', { cuisineType: 'Middle Eastern' }],
    ['Dumplings', { cuisineType: 'Chinese' }],
    ['Kuchen', { cuisineType: 'Bakery' }],
    ['Torte', { cuisineType: 'Desserts' }],
    ['Fleisch', { cuisineType: 'Steakhouse' }],
    ['Eiscafé', { cuisineType: 'Ice Cream' }],
    ['Mittagessen', { categories: [{ name: 'Lunch', nameEn: 'Lunch', slug: 'lunch' }] }],
    ['Abendessen', { categories: [{ name: 'Dinner', nameEn: 'Dinner', slug: 'dinner' }] }],
  ] as [string, Partial<MapRestaurant>][])('„%s" findet %o', (query, spot) => {
    expect(finds(query, spot)).toBe(true);
  });

  it('bleibt schmal: Nudeln holen keine Bäckerei, Asiatisch kein Italienisch', () => {
    expect(finds('nudeln', { cuisineType: 'Bakery' })).toBe(false);
    expect(finds('nudeln', { cuisineType: 'Italian / Pizza' })).toBe(false);
    expect(finds('asiatisch', { cuisineType: 'Italian' })).toBe(false);
  });

  it('stellt das ganze Wort vor den Wortanfang und das Etikett vor den Text', () => {
    const spots = [
      { _id: 'barn', name: 'The Barn', cuisineType: 'Café', lat: 0, lng: 0 },
      { _id: 'wax', name: 'Wax On Bar', cuisineType: 'Bar', lat: 0, lng: 0 },
      { _id: 'pizza', name: 'Pizzeria', searchText: 'pizza | eis', lat: 0, lng: 0 },
      { _id: 'duo', name: 'Duo', cuisineType: 'Ice Cream', lat: 0, lng: 0 },
    ] as MapRestaurant[];
    const index = buildSearchIndex(spots, []);
    expect(suggestSpots(spots, index, 'bar').map((r) => r.name)).toEqual([
      'Wax On Bar',
      'The Barn',
    ]);
    expect(suggestSpots(spots, index, 'eis').map((r) => r.name)).toEqual(['Duo', 'Pizzeria']);
  });

  /* Betreiber, 30.10.2026: „Döner" und „Nudeln" holten Spots ohne beides. */
  it('holt keine Spots, die das Wort nur zufällig enthalten', () => {
    expect(finds('döner', { cuisineType: 'Turkish', searchText: 'meze und lahmacun' })).toBe(false);
    expect(finds('döner', { cuisineType: 'Café', searchText: 'turkish eggs' })).toBe(false);
    expect(finds('döner', { cuisineType: 'Bar', searchText: 'der londoner sam orrock' })).toBe(
      false
    );
    expect(finds('nudeln', { cuisineType: 'Italian' })).toBe(false);
    expect(finds('nudeln', { cuisineType: 'Ice Cream', searchText: 'italienisches eis' })).toBe(
      false
    );
    expect(finds('nudeln', { cuisineType: 'Ice Cream', searchText: 'spaghetti-eis' })).toBe(false);
    expect(finds('pho', { searchText: 'no photos' })).toBe(false);
    expect(finds('eis', { name: 'Speiselokal', searchText: 'eiskaffee und eistee' })).toBe(false);
    expect(finds('eis', { searchText: 'zum schluss ein eis' })).toBe(true);
    expect(finds('piz', { name: 'Gazzo', cuisineType: 'Italian / Pizza' })).toBe(true);
  });
});

describe('Alltagswörter (Katalog 30.10.2026)', () => {
  it('findet dasselbe Essen auf Deutsch und Englisch', () => {
    const chicken = entryFor({ searchText: 'fried chicken mit kimchi' });
    for (const q of ['Hähnchen', 'Huhn', 'chicken']) {
      expect(matchesSearch(chicken, parseQuery(q)), q).toBe(true);
    }
    const pancakes = entryFor({ searchText: 'buttermilk pancakes am wochenende' });
    expect(matchesSearch(pancakes, parseQuery('Pfannkuchen'))).toBe(true);
  });

  it('meint mit einem Kaffeegetränk das Café', () => {
    const cafe = entryFor({ name: 'Oslo Kaffebar', cuisineType: 'Coffee' });
    for (const q of ['Cappuccino', 'Espresso', 'Latte']) {
      expect(matchesSearch(cafe, parseQuery(q)), q).toBe(true);
    }
  });

  it('lässt ein kurzes Wort nicht mitten im Wort treffen', () => {
    expect(matchesSearch(entryFor({ searchText: 'rindfleisch mit reis' }), parseQuery('eis'))).toBe(
      false
    );
    expect(
      matchesSearch(entryFor({ searchText: 'das team grillt steak' }), parseQuery('tea'))
    ).toBe(false);
    expect(matchesSearch(entryFor({ cuisineType: 'Ice Cream' }), parseQuery('eis'))).toBe(true);
  });

  it('sucht nicht im Land der Adresse', () => {
    const entry = entryFor({ address: 'Weinbergsweg 24, 10119 Berlin, Deutschland' });
    expect(matchesSearch(entry, parseQuery('deutsch'))).toBe(false);
    expect(matchesSearch(entry, parseQuery('Weinbergsweg 24'))).toBe(true);
  });
});
