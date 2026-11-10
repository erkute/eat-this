import { describe, it, expect } from 'vitest';
import { presetQuery, groqImageUrl, sanitySrcSet, sanityImageSize, coverImageScale, sanityCroppedSources } from './sanity-image-presets';

describe('presetQuery', () => {
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
    expect(sanitySrcSet('/pics/card-back.webp?v=8', [150])).toBeUndefined();
  });

  it('offers the native image once instead of enlarging small originals', () => {
    expect(sanitySrcSet(url, [800, 1600, 2400])).toBe(
      'https://cdn.sanity.io/images/x/production/abc-1539x2115.png?w=800&auto=format&q=80 800w, ' +
      'https://cdn.sanity.io/images/x/production/abc-1539x2115.png?w=1539&auto=format&q=80 1539w'
    );
  });
});

describe('coverImageScale', () => {
  it('accounts for a landscape photo cropped into a portrait cover', () => {
    expect(coverImageScale('https://cdn.sanity.io/images/p/d/photo-1600x1067.jpg', 3 / 4)).toBeCloseTo(2);
  });
  it('keeps the slot width for portrait photos and unknown dimensions', () => {
    expect(coverImageScale('https://cdn.sanity.io/images/p/d/photo-1200x1600.jpg', 3 / 4)).toBe(1);
    expect(coverImageScale(undefined, 3 / 4)).toBe(1);
  });
});

describe('sanityCroppedSources', () => {
  it('caps a landscape original at the width left after the portrait crop', () => {
    const image = sanityCroppedSources('https://cdn.sanity.io/images/p/d/photo-1600x1200.jpg?w=1600', [300, 600, 1200, 1600], 3 / 4)!;
    expect(image.src).toContain('?w=600&h=800&fit=crop&crop=center');
    expect(image.srcSet.split(', ')).toHaveLength(3);
    expect(image.srcSet).toContain('w=900&h=1200&fit=crop&crop=center&auto=format&q=80 900w');
    expect(image.srcSet).not.toContain('1600w');
  });

  it('keeps non-Sanity and unknown-size images on their original loading path', () => {
    expect(sanityCroppedSources('/photo-1600x1200.jpg', [300], 1)).toBeUndefined();
    expect(sanityCroppedSources('https://cdn.sanity.io/photo.jpg', [300], 1)).toBeUndefined();
  });
});

describe('groqImageUrl', () => {
  it('includes the asset, crop rectangle and hotspot', () => {
    const query = groqImageUrl('image', 'detailHero');
    expect(query).toContain('image.asset->url');
    expect(query).toContain('image.crop.top');
    expect(query).toContain('image.hotspot.x');
    expect(query).toContain('&rect=');
    expect(groqImageUrl('@', 'galleryThumb')).toContain('&crop=focalpoint');
  });
});

describe('editorial crop across responsive variants', () => {
  const url = 'https://cdn.sanity.io/images/p/d/photo-1600x1200.jpg?w=800&rect=200,100,1000,900&fp-x=0.25&fp-y=0.2';
  it('keeps the crop and focal point at each width and caps to cropped dimensions', () => {
    const sources = sanitySrcSet(url, [300, 600, 1600])!.split(', ');
    expect(sources).toHaveLength(3);
    for (const source of sources) {
      const p = new URL(source.split(' ')[0]).searchParams;
      expect(p.get('rect')).toBe('200,100,1000,900');
      expect(p.get('fp-y')).toBe('0.2');
    }
    expect(sources[2]).toMatch(/1000w$/);
    expect(sanityImageSize(url)).toEqual({ width: 1000, height: 900 });
  });
  it('uses the focal point for cover crops without leaving the editor rectangle', () => {
    const sources = sanityCroppedSources(url, [300, 600, 1600], .5)!;
    for (const source of sources.srcSet.split(', ')) {
      const p = new URL(source.split(' ')[0]).searchParams;
      expect(p.get('rect')).toBe('200,100,450,900');
      expect(p.has('fp-x')).toBe(false);
      expect(Number(p.get('w')) / Number(p.get('h'))).toBe(.5);
    }
  });
});
