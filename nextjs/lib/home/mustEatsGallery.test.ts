import { describe, it, expect } from 'vitest';
import type { MapMustEat } from '@/lib/types';
import { composeTeaserCards, pickOnboardingDemoCard } from './mustEatsGallery';

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

describe('composeTeaserCards', () => {
  const list = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => makeMustEat(id));

  it('places face-up cards at the requested slots and fills the rest face-down', () => {
    const row = composeTeaserCards(list, new Set(['a', 'b']), 6, [1, 4]);

    expect(row.map((c) => c.faceUp)).toEqual([false, true, false, false, true, false]);
    // Face-up cards are taken in order into their slots, face-down into the rest.
    expect(row.map((c) => c.mustEat._id)).toEqual(['c', 'a', 'd', 'e', 'b', 'f']);
  });

  it('falls back to face-down cards when a face-up slot has nothing left', () => {
    const row = composeTeaserCards(list, new Set(['a']), 6, [1, 4]);

    expect(row.map((c) => c.faceUp)).toEqual([false, true, false, false, false, false]);
  });

  it('fills the row with face-up cards when nothing is covered', () => {
    const row = composeTeaserCards(list, new Set(['a', 'b', 'c', 'd', 'e', 'f']), 6, [1, 4]);

    expect(row).toHaveLength(6);
    expect(row.every((c) => c.faceUp)).toBe(true);
  });

  it('stops at the shorter catalog instead of padding the row', () => {
    const row = composeTeaserCards(list.slice(0, 3), new Set(['a']), 6, [1, 4]);

    expect(row).toHaveLength(3);
  });

  it('leaves the input list untouched', () => {
    composeTeaserCards(list, new Set(['a', 'b']), 6, [1, 4]);

    expect(list).toHaveLength(6);
  });

  it('returns an empty row for an empty catalog', () => {
    expect(composeTeaserCards([], new Set(), 6, [1, 4])).toEqual([]);
  });
});

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
