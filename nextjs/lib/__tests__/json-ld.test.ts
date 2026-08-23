import { describe, it, expect } from 'vitest';
import {
  buildBezirkJsonLd,
  buildHomeJsonLd,
  buildRestaurantJsonLd,
  buildSiteJsonLd,
  serializeJsonLd,
} from '../json-ld';
import type { Restaurant, RestaurantCard } from '../types';

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

  const listItems = (restaurants: RestaurantCard[]) => {
    const graph = JSON.parse(
      buildBezirkJsonLd({
        bezirk: { name: 'Mitte', slug: 'mitte' },
        restaurants,
        locale: 'de',
        districtsLabel: 'Bezirke',
      })
    );
    const list = graph['@graph'].find((node: { '@type': string }) => node['@type'] === 'ItemList');
    return list.itemListElement.map((entry: { item: Record<string, unknown> }) => entry.item);
  };

  it('gives each listed restaurant its photo so Google can attach a thumbnail', () => {
    const [item] = listItems([card({ photo: 'https://cdn.sanity.io/boii.jpg?w=800' })]);
    expect(item.image).toBe('https://cdn.sanity.io/boii.jpg?w=800');
  });

  it('omits image when there is no publishable photo', () => {
    const [item] = listItems([card()]);
    expect(item).not.toHaveProperty('image');
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
    expect(organization.description).toContain('Berlin');
    expect(buildSiteJsonLd('en')).not.toContain('SearchAction');
  });
});
