import { describe, it, expect } from 'vitest';
import { presetQuery, groqImageUrl, sanitySrcSet, sanityImageSize } from './sanity-image-presets';

// These assertions pin the EXACT query strings the hand-written GROQ
// projections used before the refactor. If any byte changes, a projection's
// emitted URL changes — which is exactly what must not happen silently.

describe('presetQuery — frozen against the pre-refactor strings', () => {
  it('detailHero → w=1600 q=85', () => {
    expect(presetQuery('detailHero')).toBe('?w=1600&auto=format&q=85');
  });
  it('sheetHero → w=1200 q=85', () => {
    expect(presetQuery('sheetHero')).toBe('?w=1200&auto=format&q=85');
  });
  it('card → w=800 q=80', () => {
    expect(presetQuery('card')).toBe('?w=800&auto=format&q=80');
  });
  it('mapCard → w=600 q=80', () => {
    expect(presetQuery('mapCard')).toBe('?w=600&auto=format&q=80');
  });
  it('articleDish → w=400 q=80', () => {
    expect(presetQuery('articleDish')).toBe('?w=400&auto=format&q=80');
  });
  it('articleDishRestaurant → w=500 q=75', () => {
    expect(presetQuery('articleDishRestaurant')).toBe('?w=500&auto=format&q=75');
  });
  it('buddyThumb → w=120 h=120 crop q=80 (param order preserved)', () => {
    expect(presetQuery('buddyThumb')).toBe('?w=120&h=120&fit=crop&auto=format&q=80');
  });
});

describe('sanitySrcSet', () => {
  const url = 'https://cdn.sanity.io/images/x/production/abc-1539x2115.png?w=600&auto=format&q=80';

  it('strips the baked preset query and emits one candidate per width', () => {
    expect(sanitySrcSet(url, [150, 300])).toBe(
      'https://cdn.sanity.io/images/x/production/abc-1539x2115.png?w=150&auto=format&q=80 150w, ' +
        'https://cdn.sanity.io/images/x/production/abc-1539x2115.png?w=300&auto=format&q=80 300w'
    );
  });

  it('returns undefined for null and non-Sanity URLs', () => {
    expect(sanitySrcSet(null, [150])).toBeUndefined();
    expect(sanitySrcSet(undefined, [150])).toBeUndefined();
    expect(sanitySrcSet('/pics/card-back.webp?v=7', [150])).toBeUndefined();
  });
});

describe('groqImageUrl', () => {
  it('prefixes the dereference path and appends asset->url + query', () => {
    expect(groqImageUrl('image', 'detailHero')).toBe(
      'image.asset->url + "?w=1600&auto=format&q=85"'
    );
    expect(groqImageUrl('mustEatRef->restaurantRef->image', 'articleDishRestaurant')).toBe(
      'mustEatRef->restaurantRef->image.asset->url + "?w=500&auto=format&q=75"'
    );
  });
});

describe('sanityImageSize', () => {
  // Die Spot-Seite zeigt Fotos ungeschnitten in ihrem eigenen Format; die
  // Masse stehen im Dateinamen des Sanity-Assets.
  it('reads width and height from the asset file name', () => {
    expect(
      sanityImageSize(
        'https://cdn.sanity.io/images/p/d/b822ba15ca9b271eee8ba94ceb96cbbd5de6c37e-1600x2400.jpg?w=1600&q=85'
      )
    ).toEqual({ width: 1600, height: 2400 });
  });

  it('returns null for anything else', () => {
    expect(sanityImageSize('/pics/card-back.webp')).toBeNull();
    expect(sanityImageSize(undefined)).toBeNull();
  });
});
