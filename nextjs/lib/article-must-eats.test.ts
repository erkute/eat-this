import { describe, expect, it } from 'vitest';
import { addArticleMustEats } from './article-must-eats';
import type { MapMustEat, PortableTextBlock } from './types';

const card = { _id: 'gazzo-card', image: 'PRIVATE_IMAGE', dish: 'PRIVATE_DISH', restaurant: { name: 'Gazzo', slug: 'gazzo', district: 'Neukölln' } } as MapMustEat;
const paragraph = (text: string): PortableTextBlock => ({ _type: 'block', style: 'normal', children: [{ _type: 'span', text }] });
const teasers = (blocks: PortableTextBlock[]) => blocks.filter(b => b._type === 'mustEatCard');

describe('automatic article must eats', () => {
  it('places the matching card immediately after its spot reference', () => {
    const spot = { _type: 'spotCard', restaurantSlug: 'gazzo' };
    const result = addArticleMustEats([spot, paragraph('Weiter geht’s.')], [card]);
    expect(result.map(b => b._type)).toEqual(['spotCard', 'mustEatCard', 'block']);
    expect(result[1].mustEatId).toBe('gazzo-card');
  });
  it('recognizes a complete name across rich-text spans', () => {
    const text = { _type: 'block', children: [{ text: 'Pizza bei Gaz' }, { text: 'zo.' }] };
    expect(teasers(addArticleMustEats([text], [card]))).toHaveLength(1);
  });
  it('recognizes localized spot links and map references', () => {
    for (const href of ['/en/restaurant/gazzo', '/map?r=gazzo']) {
      const text = { ...paragraph('Hier essen.'), markDefs: [{ _type: 'link', href }] };
      expect(teasers(addArticleMustEats([text], [card]))).toHaveLength(1);
    }
  });
  it('preserves an existing author placement and adds no duplicate', () => {
    const manual = { _type: 'mustEatCard', mustEatId: card._id, _key: 'manual' };
    const result = addArticleMustEats([paragraph('Gazzo ist in Neukölln.'), manual], [card]);
    expect(teasers(result)).toEqual([manual]);
  });
  it('adds each card once across repeated mentions', () => {
    expect(teasers(addArticleMustEats([paragraph('Pizza bei Gazzo.'), paragraph('Gazzo ist beliebt.')], [card]))).toHaveLength(1);
  });
  it('prefers the explicit spot card over an earlier prose mention', () => {
    const result = addArticleMustEats([paragraph('Gazzo.'), { _type: 'spotCard', restaurantSlug: 'gazzo' }], [card]);
    expect(result.at(-2)?._type).toBe('spotCard');
    expect(result.at(-1)?._type).toBe('mustEatCard');
  });
  it('does not mistake a partial name or external link for the spot', () => {
    const result = addArticleMustEats([{ ...paragraph('Gazzolina.'), markDefs: [{ href: 'https://example.com/restaurant/gazzo' }] }], [card]);
    expect(teasers(result)).toHaveLength(0);
  });
  it('adds every matching card at a spot without copying private dish or image fields', () => {
    const result = teasers(addArticleMustEats([paragraph('Pizza bei Gazzo.')], [card, { ...card, _id: 'second-card' }]));
    expect(result).toHaveLength(2);
    expect(JSON.stringify(result)).not.toContain('PRIVATE_');
  });
  it('does not mutate the editorial source', () => {
    const source = [paragraph('Gazzo.')];
    addArticleMustEats(source, [card]);
    expect(source).toHaveLength(1);
  });
  it('does not turn an ordinary German noun into an unrelated restaurant teaser', () => {
    const theke = { ...card, restaurant: { ...card.restaurant, name: 'Theke', slug: 'theke' } };
    expect(teasers(addArticleMustEats([paragraph('Die Zentrifuge steht hinter der Theke.')], [theke]))).toHaveLength(0);
  });
  it('moves a card that would close the article to the section break nearest the middle', () => {
    const h2 = (text: string): PortableTextBlock => ({ ...paragraph(text), style: 'h2' });
    const source = [paragraph('a'), h2('Eins'), paragraph('b'), paragraph('c'), h2('Zwei'), paragraph('d'), paragraph('e'), h2('Drei'), paragraph('f'), { _type: 'spotCard', restaurantSlug: 'gazzo' }];
    const result = addArticleMustEats(source, [card]);
    expect(result.findIndex(b => b._type === 'mustEatCard')).toBe(4);
    expect(result[5]).toMatchObject({ style: 'h2', children: [{ text: 'Zwei' }] });
    expect(result.at(-1)?._type).toBe('spotCard');
  });
  it('recognizes a primary restaurant named in the article title', () => {
    expect(teasers(addArticleMustEats([paragraph('Gazzo nennt es Sin Win.')], [card], 'Gazzo: Pizza in Neukölln'))).toHaveLength(1);
  });
});
