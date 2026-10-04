import { describe, it, expect } from 'vitest';
import type { MapMustEat } from '@/lib/types';
import { pickOnboardingDemoCard } from './mustEatsGallery';

function makeMustEat(id: string, name = 'Spot'): MapMustEat {
  return {
    _id: id,
    dish: `Dish ${id}`,
    image: `https://cdn/${id}.png`,
    restaurant: {
      _id: `r-${id}`,
      name,
      slug: `slug-${id}`,
      lat: 52.5,
      lng: 13.4,
    },
  };
}

describe('pickOnboardingDemoCard', () => {
  it('returns the first face-up must-eat', () => {
    const list = [makeMustEat('a'), makeMustEat('b'), makeMustEat('c')];
    const result = pickOnboardingDemoCard(list, new Set(['b', 'c']));
    expect(result?._id).toBe('b');
  });

  it('falls back to the first card when nothing is face-up', () => {
    const list = [makeMustEat('a'), makeMustEat('b')];
    const result = pickOnboardingDemoCard(list, new Set());
    expect(result?._id).toBe('a');
  });

  it('returns null for an empty catalog', () => {
    expect(pickOnboardingDemoCard([], new Set())).toBeNull();
  });
});
