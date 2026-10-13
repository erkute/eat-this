import { describe, expect, it } from 'vitest';
import { composeRevealedMustEats, REVEALED_TARGET } from './revealed-must-eats';
import type { MapMustEat } from '@/lib/types';
const card = (id: string, previewCategory?: string, spot = id): MapMustEat => ({
  _id: id,
  previewCategory,
  revealedForAnon: true,
  restaurant: { _id: spot, name: spot, slug: spot, lat: 0, lng: 0 },
});
describe('public pack examples', () => {
  it('includes every selected pack example before other public flags, independent of input order', () => {
    const examples = [
      'breakfast',
      'coffee',
      'dinner',
      'drinks',
      'fast-food',
      'lunch',
      'pizza',
      'sweets',
    ].map((slug) => card(slug, slug));
    const all = [card('unselected'), ...examples];
    expect([...composeRevealedMustEats(all)].sort()).toEqual(examples.map((c) => c._id).sort());
    expect(composeRevealedMustEats([...all].reverse())).toEqual(composeRevealedMustEats(all));
  });
  it('keeps a second card at the same spot covered', () => {
    const all = [card('other', undefined, 'spot'), card('selected', 'lunch', 'spot')];
    expect([...composeRevealedMustEats(all)]).toEqual(['selected']);
  });
  it('keeps every explicit example when a ninth pack becomes available', () => {
    const examples = Array.from({ length: 9 }, (_, i) => card(`card-${i}`, `category-${i}`));
    expect(composeRevealedMustEats(examples).size).toBe(9);
  });
  it('keeps explicit examples from different packs at the same restaurant', () => {
    expect([
      ...composeRevealedMustEats([
        card('coffee', 'coffee', 'same-spot'),
        card('sweets', 'sweets', 'same-spot'),
        card('other', undefined, 'same-spot'),
      ]),
    ]).toEqual(['coffee', 'sweets']);
  });
  it('caps general shop-window curation', () => {
    expect(
      composeRevealedMustEats(Array.from({ length: 20 }, (_, i) => card(String(i)))).size
    ).toBe(REVEALED_TARGET);
  });
});
