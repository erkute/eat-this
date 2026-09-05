import { describe, it, expect } from 'vitest';
import {
  buildArticleSpotsItemList,
  buildBezirkJsonLd,
  buildHomeJsonLd,
  buildMapJsonLd,
  buildRestaurantJsonLd,
  buildSiteJsonLd,
  serializeJsonLd,
} from '../json-ld';
import { schemaImageUrl } from '../sanity-image-presets';
import { getMapSeoCopy } from '../map/mapSeoCopy';
import type { MapRestaurant, Restaurant, RestaurantCard, SpotCardBlock } from '../types';

describe('serializeJsonLd', () => {
  it('serializes a plain object to JSON string', () => {
    const data = { '@type': 'Restaurant', name: 'Test' };
    const result = serializeJsonLd(data);
    expect(result).toBe('{"@type":"Restaurant","name":"Test"}');
  });

  it('escapes closing script tags to prevent XSS', () => {
    const data = { name: '</script><script>alert(1)</script>' };
    const result = serializeJsonLd(data);
    expect(result).not.toContain('</script>');
    expect(result).toContain('<\\/script>');
  });

  it('handles nested objects', () => {
    const data = { address: { '@type': 'PostalAddress', streetAddress: '123 Main St' } };
    const result = serializeJsonLd(data);
    expect(JSON.parse(result)).toEqual(data);
  });
});

describe('buildRestaurantJsonLd', () => {
  const baseRestaurant: Restaurant = {
    _id: 'r1',
    name: 'Boii Boii',
    slug: 'boii-boii',
    lat: 52.5,
    lng: 13.4,
  };

  const build = (r: Restaurant) =>
    JSON.parse(
      buildRestaurantJsonLd({
        restaurant: r,
        locale: 'de',
        slug: r.slug,
        description: undefined,
        districtsLabel: 'Bezirke',
      })
    );

  it('emits hasMenu when menuUrl is maintained', () => {
    const graph = build({ ...baseRestaurant, menuUrl: 'https://boiiboii.de/menu' });
    const restaurant = graph['@graph'].find(
      (n: { '@type': string }) => n['@type'] === 'Restaurant'
    );
    expect(restaurant.hasMenu).toBe('https://boiiboii.de/menu');
  });

  it('omits hasMenu without menuUrl', () => {
    const graph = build(baseRestaurant);
    const restaurant = graph['@graph'].find(
      (n: { '@type': string }) => n['@type'] === 'Restaurant'
    );
    expect(restaurant).not.toHaveProperty('hasMenu');
  });

  it('uses the explicit cuisine instead of discovery categories', () => {
    const graph = build({
      ...baseRestaurant,
      cuisineType: 'Thai',
      categories: [{ slug: 'dinner', name: 'Abendessen', nameEn: 'Dinner' }],
    });
    const restaurant = graph['@graph'].find(
      (n: { '@type': string }) => n['@type'] === 'Restaurant'
    );
    expect(restaurant.servesCuisine).toBe('Thai');
  });

  it('maps venue-type cuisineTypes to their LocalBusiness subtype without servesCuisine', () => {
    const graph = build({ ...baseRestaurant, cuisineType: 'Bakery' });
    const bakery = graph['@graph'].find((n: { '@type': string }) => n['@type'] === 'Bakery');
    // Eine Bäckerei ist kein Restaurant, und "Bakery" ist keine Küche — der
    // Betriebstyp wandert in @type, servesCuisine entfällt.
    expect(bakery).toBeDefined();
    expect(bakery).not.toHaveProperty('servesCuisine');
    // Die Entitäts-Adresse bleibt typunabhängig stabil.
    expect(bakery['@id']).toContain('#restaurant');
  });

  it('keeps the Imbiss as FastFoodRestaurant with German cuisine', () => {
    const graph = build({ ...baseRestaurant, cuisineType: 'German / Fast Food' });
    const imbiss = graph['@graph'].find(
      (n: { '@type': string }) => n['@type'] === 'FastFoodRestaurant'
    );
    expect(imbiss).toBeDefined();
    expect(imbiss.servesCuisine).toBe('German');
  });

  it('splits a Berlin address into structured postal fields', () => {
    const graph = build({
      ...baseRestaurant,
      address: 'Stargarder Str. 72, 10437 Berlin, Deutschland',
    });
    const restaurant = graph['@graph'].find(
      (n: { '@type': string }) => n['@type'] === 'Restaurant'
    );
    expect(restaurant.address).toEqual({
      '@type': 'PostalAddress',
      streetAddress: 'Stargarder Str. 72',
      postalCode: '10437',
      addressLocality: 'Berlin',
      addressRegion: 'Berlin',
      addressCountry: 'DE',
    });
  });
});

describe('buildBezirkJsonLd', () => {
  const card = (over: Partial<RestaurantCard> = {}): RestaurantCard => ({
    _id: 'r1',
    name: 'Boii Boii',
    slug: 'boii-boii',
    ...over,
  });

  type Node = { '@type': string } & Record<string, unknown>;

  const graphOf = (restaurants: RestaurantCard[], imageUrl?: string): Node[] =>
    JSON.parse(
      buildBezirkJsonLd({
        bezirk: { name: 'Mitte', slug: 'mitte', imageUrl },
        restaurants,
        locale: 'de',
        districtsLabel: 'Bezirke',
      })
    )['@graph'];

  const nodeOf = (graph: Node[], type: string) => graph.find((node) => node['@type'] === type);

  const listItems = (restaurants: RestaurantCard[]) => {
    const list = nodeOf(graphOf(restaurants), 'ItemList') as unknown as {
      itemListElement: { item: Record<string, unknown> }[];
    };
    return list.itemListElement.map((entry) => entry.item);
  };

  it('gives each listed restaurant its photo so Google can attach a thumbnail', () => {
    const [item] = listItems([card({ photo: 'https://cdn.sanity.io/boii.jpg?w=800&q=80' })]);
    // Re-targeted to the schema width — the card projection's 800 px is below
    // what Google serves a large preview from.
    expect(item.image).toBe('https://cdn.sanity.io/boii.jpg?w=1200&auto=format&q=80');
  });

  it('omits image when there is no publishable photo', () => {
    const [item] = listItems([card()]);
    expect(item).not.toHaveProperty('image');
  });

  it("names the district's own picture as the page's primary image", () => {
    const graph = graphOf(
      [card({ photo: 'https://cdn.sanity.io/boii.jpg?w=800' })],
      'https://cdn.sanity.io/mitte.jpg?w=1600'
    );
    const page = nodeOf(graph, 'WebPage') as unknown as {
      primaryImageOfPage: { '@id': string };
      image: { '@id': string };
    };
    const image = nodeOf(graph, 'ImageObject') as unknown as { '@id': string; url: string };

    expect(image.url).toBe('https://cdn.sanity.io/mitte.jpg?w=1200&auto=format&q=80');
    expect(page.primaryImageOfPage).toEqual({ '@id': image['@id'] });
    expect(page.image).toEqual({ '@id': image['@id'] });
  });

  it('falls back to the first listed photo when the district has no picture', () => {
    const graph = graphOf([card(), card({ photo: 'https://cdn.sanity.io/boii.jpg?w=800' })]);
    const image = nodeOf(graph, 'ImageObject') as unknown as { url: string };
    expect(image.url).toBe('https://cdn.sanity.io/boii.jpg?w=1200&auto=format&q=80');
  });

  it('ships no ImageObject at all when nothing is publishable', () => {
    const graph = graphOf([card()]);
    const page = nodeOf(graph, 'WebPage') as unknown as Record<string, unknown>;
    expect(nodeOf(graph, 'ImageObject')).toBeUndefined();
    expect(page).not.toHaveProperty('primaryImageOfPage');
  });
});

describe('schemaImageUrl', () => {
  it('re-points a baked card URL at the 1200 px schema preset', () => {
    expect(schemaImageUrl('https://cdn.sanity.io/a.jpg?w=800&auto=format&q=80')).toBe(
      'https://cdn.sanity.io/a.jpg?w=1200&auto=format&q=80'
    );
  });

  it('passes over anything that is not a Sanity URL', () => {
    expect(schemaImageUrl('https://example.com/a.jpg')).toBeUndefined();
    expect(schemaImageUrl(undefined)).toBeUndefined();
  });
});

describe('buildHomeJsonLd', () => {
  const graph = () => JSON.parse(buildHomeJsonLd([], 'de'))['@graph'];
  const images = () =>
    graph().filter((node: { '@type': string }) => node['@type'] === 'ImageObject');

  it('offers both share-card shapes, wide first', () => {
    const [wide, square] = images();
    expect([wide.width, wide.height]).toEqual([1200, 630]);
    expect([square.width, square.height]).toEqual([1200, 1200]);
    expect(wide.url).toContain('og-card.png');
    expect(square.url).toContain('og-card-square.png');
  });

  it('gives the two cards distinct @ids and references both from the page', () => {
    const [wide, square] = images();
    expect(wide['@id']).not.toBe(square['@id']);
    const page = graph().find((node: { '@type': string }) => node['@type'] === 'WebPage');
    expect(page.image).toEqual([{ '@id': wide['@id'] }, { '@id': square['@id'] }]);
    expect(page.primaryImageOfPage).toEqual({ '@id': wide['@id'] });
  });
});

describe('buildMapJsonLd', () => {
  const spot = (over: Partial<MapRestaurant> = {}): MapRestaurant => ({
    _id: 'r1',
    _createdAt: '2026-01-01',
    name: 'Bar Basta',
    slug: 'bar-basta',
    lat: 52.5,
    lng: 13.4,
    mustEatCount: 1,
    bezirk: { name: 'Mitte' },
    cuisineType: 'European',
    photo: 'https://cdn.sanity.io/images/x/production/abc-800x600.png?w=800',
    ...over,
  });
  const build = (restaurants: MapRestaurant[] = [spot()], locale: 'de' | 'en' = 'de') =>
    JSON.parse(
      buildMapJsonLd({
        locale,
        faqs: getMapSeoCopy(locale).faqs,
        listName: 'Restaurants auf der Berlin Food Map',
        restaurants,
      })
    )['@graph'];
  const node = (graph: { '@type': string }[], type: string) =>
    graph.find((n) => n['@type'] === type) as never;

  it('self-identifies as the /map page and hangs off the site-wide WebSite node', () => {
    const page = node(build(), 'WebPage') as unknown as Record<string, unknown>;
    expect(page.url).toBe('https://www.eatthisdot.com/map');
    expect(page['@id']).toBe('https://www.eatthisdot.com/map#webpage');
    expect(page.isPartOf).toEqual({ '@id': 'https://www.eatthisdot.com/#website' });
    expect((node(build([], 'en'), 'WebPage') as unknown as Record<string, unknown>).url).toBe(
      'https://www.eatthisdot.com/en/map'
    );
  });

  it('mirrors the FAQ the page actually renders, word for word', () => {
    const faq = node(build(), 'FAQPage') as unknown as {
      mainEntity: { name: string; acceptedAnswer: { text: string } }[];
    };
    expect(faq.mainEntity.map((q) => q.name)).toEqual(getMapSeoCopy('de').faqs.map((f) => f.q));
    expect(faq.mainEntity.map((q) => q.acceptedAnswer.text)).toEqual(
      getMapSeoCopy('de').faqs.map((f) => f.a)
    );
  });

  it('lists only the spots it was handed, and calls the order unordered', () => {
    const list = node(build([spot(), spot({ _id: 'r2', name: 'SOFI', slug: 'sofi' })]), 'ItemList');
    const l = list as unknown as {
      numberOfItems: number;
      itemListOrder: string;
      itemListElement: { item: { url: string } }[];
    };
    expect(l.numberOfItems).toBe(2);
    expect(l.itemListOrder).toBe('https://schema.org/ItemListUnordered');
    expect(l.itemListElement.map((e) => e.item.url)).toEqual([
      'https://www.eatthisdot.com/restaurant/bar-basta',
      'https://www.eatthisdot.com/restaurant/sofi',
    ]);
  });

  it('claims nothing it cannot show: no photo key without a publishable photo', () => {
    const list = node(build([spot({ photo: undefined })]), 'ItemList') as unknown as {
      itemListElement: { item: Record<string, unknown> }[];
    };
    expect(list.itemListElement[0].item).not.toHaveProperty('image');
  });

  it('invents no ratings, reviews or prices', () => {
    const raw = buildMapJsonLd({
      locale: 'de',
      faqs: getMapSeoCopy('de').faqs,
      listName: 'x',
      restaurants: [spot()],
    });
    for (const key of ['aggregateRating', 'review', 'ratingValue', 'offers', 'priceRange']) {
      expect(raw).not.toContain(key);
    }
  });

  it('drops the ItemList entirely when the list is empty', () => {
    expect(build([]).some((n: { '@type': string }) => n['@type'] === 'ItemList')).toBe(false);
  });
});

describe('buildSiteJsonLd', () => {
  it('matches WebSite language to the rendered locale and describes the Berlin scope', () => {
    const de = JSON.parse(buildSiteJsonLd('de'));
    const en = JSON.parse(buildSiteJsonLd('en'));
    const deWebsite = de['@graph'].find((node: { '@type': string }) => node['@type'] === 'WebSite');
    const enWebsite = en['@graph'].find((node: { '@type': string }) => node['@type'] === 'WebSite');
    const organization = en['@graph'].find(
      (node: { '@type': string }) => node['@type'] === 'Organization'
    );

    expect(deWebsite.inLanguage).toBe('de-DE');
    expect(enWebsite.inLanguage).toBe('en-US');
    expect(organization.areaServed).toEqual({ '@type': 'City', name: 'Berlin' });
    // The bare name is contested; the Berlin forms are what tells the two apart.
    expect(organization.alternateName).toContain('Eat This Berlin');
    expect(deWebsite.alternateName).toBe('Eat This Berlin');
    expect(organization.description).toContain('Berlin');
    expect(buildSiteJsonLd('en')).not.toContain('SearchAction');
  });
});

describe('buildArticleSpotsItemList', () => {
  const spot = (over: Partial<SpotCardBlock> = {}) => ({
    _type: 'spotCard',
    restaurantName: 'Bandol sur mer',
    restaurantSlug: 'bandol-sur-mer',
    cuisineType: 'French',
    restaurantPhoto: 'https://cdn.sanity.io/images/x/production/abc-1600x1200.jpg?w=800',
    ...over,
  });
  const text = { _type: 'block', style: 'normal', children: [] };

  it('builds an ItemList of Restaurants from the spotCards', () => {
    const list = buildArticleSpotsItemList({
      blocks: [text, spot(), text, spot({ restaurantName: 'Barra', restaurantSlug: 'barra' })],
      locale: 'de',
      name: 'Fine Dining in Berlin',
    });
    expect(list).toMatchObject({
      '@type': 'ItemList',
      name: 'Fine Dining in Berlin',
      numberOfItems: 2,
    });
    const items = (list as { itemListElement: Record<string, never>[] }).itemListElement;
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ '@type': 'ListItem', position: 1 });
    expect(items[1]).toMatchObject({ position: 2, item: { name: 'Barra' } });
  });

  // Die Reihenfolge des Artikels IST die Aussage — bei den Bezirks-Guides ist
  // es die kuratierte topSpots-Reihenfolge. Alphabetisch sortieren würde eine
  // andere Rangfolge behaupten als der Text daneben.
  it('keeps the article order rather than sorting', () => {
    const list = buildArticleSpotsItemList({
      blocks: [
        spot({ restaurantName: 'Zwiebelfisch', restaurantSlug: 'z' }),
        spot({ restaurantName: 'Almi', restaurantSlug: 'a' }),
      ],
      locale: 'de',
      name: 'Guide',
    });
    const items = (list as { itemListElement: { item: { name: string } }[] }).itemListElement;
    expect(items.map((i) => i.item.name)).toEqual(['Zwiebelfisch', 'Almi']);
  });

  it('links restaurants under the rendered locale', () => {
    const list = buildArticleSpotsItemList({ blocks: [spot()], locale: 'en', name: 'Guide' });
    const items = (list as { itemListElement: { item: { url: string } }[] }).itemListElement;
    expect(items[0].item.url).toContain('/en/restaurant/bandol-sur-mer');
  });

  // Eine leere ItemList wäre eine Behauptung über die Seite, die nicht stimmt.
  it('returns null for articles without spotCards', () => {
    expect(buildArticleSpotsItemList({ blocks: [text], locale: 'de', name: 'Meinung' })).toBeNull();
    expect(
      buildArticleSpotsItemList({ blocks: undefined, locale: 'de', name: 'Meinung' })
    ).toBeNull();
  });

  // Fotos sind upstream lizenz-gefiltert: fehlt eins, darf kein Key erscheinen.
  it('omits the image when the photo is not publishable', () => {
    const list = buildArticleSpotsItemList({
      blocks: [spot({ restaurantPhoto: undefined })],
      locale: 'de',
      name: 'Guide',
    });
    const items = (list as { itemListElement: { item: Record<string, unknown> }[] })
      .itemListElement;
    expect(items[0].item).not.toHaveProperty('image');
  });

  it('skips spotCards whose reference did not resolve', () => {
    const list = buildArticleSpotsItemList({
      blocks: [spot(), spot({ restaurantSlug: undefined, restaurantName: undefined })],
      locale: 'de',
      name: 'Guide',
    });
    expect(list).toMatchObject({ numberOfItems: 1 });
  });
});
