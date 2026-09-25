import { describe, expect, it } from 'vitest';
import { isSanityImage, sanityNextImageLoader } from '../imageLoader';
import { presetQuery } from '../sanity-image-presets';

const ASSET = 'https://cdn.sanity.io/images/ehwjnjr2/production/abc-1600x1200.jpg';

describe('sanityNextImageLoader', () => {
  it('schickt Sanity-Bilder direkt an die CDN, mit der Breite der srcset-Stufe', () => {
    expect(sanityNextImageLoader({ src: `${ASSET}${presetQuery('detailHero')}`, width: 828 })).toBe(
      `${ASSET}?w=828&auto=format&q=80`
    );
  });

  it('übernimmt eine ausdrückliche Qualität', () => {
    expect(sanityNextImageLoader({ src: ASSET, width: 640, quality: 60 })).toBe(
      `${ASSET}?w=640&auto=format&q=60`
    );
  });

  it('erhält einen Zuschnitt und skaliert die Höhe mit', () => {
    // galleryThumb: 400×300, fit=crop
    const url = new URL(
      sanityNextImageLoader({ src: `${ASSET}${presetQuery('galleryThumb')}`, width: 800 })
    );
    expect(url.origin + url.pathname).toBe(ASSET);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      w: '800',
      h: '600',
      fit: 'crop',
      auto: 'format',
      q: '80',
    });
  });
});

describe('isSanityImage', () => {
  it('erkennt nur die Sanity-CDN', () => {
    expect(isSanityImage(ASSET)).toBe(true);
    expect(isSanityImage('/pics/eat-this-logo.webp?v=6')).toBe(false);
    expect(isSanityImage('https://example.com/cdn.sanity.io/x.jpg')).toBe(false);
  });
});
