// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ lang: 'de', t: (key: string) => key }) }));
vi.mock('@/lib/map/spotPhoto', () => ({
  spotPhotoSrc: (src: string) => src,
  spotPhotoSrcSet: () => undefined,
}));
vi.mock('./RestaurantGalleryLightbox', () => ({ default: () => null }));

import type { RestaurantGalleryImage } from '@/lib/map/useRestaurantDetail';
import RestaurantGallery from './RestaurantGallery';

const HINT_KEY = 'et:photo-swipe-hint';
const photos = (n: number): RestaurantGalleryImage[] =>
  Array.from({ length: n }, (_, i) => ({
    _key: `p${i}`,
    thumb: `https://img/${i}`,
    full: `https://img/${i}`,
  }));

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

const rail = (container: HTMLElement) => container.querySelector<HTMLElement>('[role="region"]')!;
const loadFirstTwo = (container: HTMLElement) =>
  container.querySelectorAll('img').forEach((img, i) => i < 2 && fireEvent.load(img));
const dots = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[aria-hidden="true"] > span'));

describe('RestaurantGallery', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockReducedMotion(false);
  });
  afterEach(() => vi.restoreAllMocks());

  it('zeigt einen Punkt pro Foto, den aktuellen hervorgehoben', () => {
    const { container, getByText } = render(
      <RestaurantGallery images={photos(4)} restaurantName="Volk" />,
    );
    const all = dots(container);
    expect(all).toHaveLength(4);
    expect(all[0].className).toContain('rdHeroPhotoDotOn');
    expect(all.slice(1).every((d) => !d.className.includes('rdHeroPhotoDotOn'))).toBe(true);
    expect(getByText('map.photos 1/4')).toBeTruthy();
  });

  it('zeigt bei einem Foto weder Punkte noch Hinweis', () => {
    const { container } = render(<RestaurantGallery images={photos(1)} restaurantName="Volk" />);
    expect(dots(container)).toHaveLength(0);
    expect(rail(container).className).not.toContain('rdHeroPhotosHint');
  });

  it('stupst beim ersten Besuch, sobald Foto 1 und 2 geladen sind, und zählt den Durchlauf', () => {
    const { container } = render(<RestaurantGallery images={photos(3)} restaurantName="Volk" />);
    const el = rail(container);
    expect(el.className).not.toContain('rdHeroPhotosHint');
    fireEvent.load(container.querySelector('img')!);
    expect(el.className).not.toContain('rdHeroPhotosHint');
    loadFirstTwo(container);
    expect(el.className).toContain('rdHeroPhotosHint');
    fireEvent.animationEnd(el.firstElementChild!);
    expect(el.className).not.toContain('rdHeroPhotosHint');
    expect(window.localStorage.getItem(HINT_KEY)).toBe('1');
  });

  it('stupst nach drei Durchläufen nicht mehr', () => {
    window.localStorage.setItem(HINT_KEY, '3');
    const { container } = render(<RestaurantGallery images={photos(3)} restaurantName="Volk" />);
    loadFirstTwo(container);
    expect(rail(container).className).not.toContain('rdHeroPhotosHint');
  });

  it('stupst nie wieder, sobald selbst geblättert wurde', () => {
    const { container, unmount } = render(
      <RestaurantGallery images={photos(3)} restaurantName="Volk" />,
    );
    const el = rail(container);
    loadFirstTwo(container);
    expect(el.className).toContain('rdHeroPhotosHint');
    Object.defineProperty(el, 'clientWidth', { value: 300 });
    el.scrollLeft = 300;
    fireEvent.scroll(el);
    expect(el.className).not.toContain('rdHeroPhotosHint');
    expect(window.localStorage.getItem(HINT_KEY)).toBe('done');
    expect(dots(container)[1].className).toContain('rdHeroPhotoDotOn');
    unmount();

    const again = render(<RestaurantGallery images={photos(3)} restaurantName="Volk" />);
    loadFirstTwo(again.container);
    expect(rail(again.container).className).not.toContain('rdHeroPhotosHint');
  });

  it('stupst bei reduzierter Bewegung nicht', () => {
    mockReducedMotion(true);
    const { container } = render(<RestaurantGallery images={photos(3)} restaurantName="Volk" />);
    loadFirstTwo(container);
    expect(rail(container).className).not.toContain('rdHeroPhotosHint');
  });
});
