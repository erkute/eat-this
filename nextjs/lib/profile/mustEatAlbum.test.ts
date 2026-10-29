import { describe, it, expect } from 'vitest';
import { buildAlbum } from './mustEatAlbum';

const me = (id: string, district: string, dish: string, withImage = false, order?: number) =>
  ({
    _id: id,
    dish,
    ...(order === undefined ? {} : { order }),
    ...(withImage ? { image: `${id}.jpg` } : {}),
    restaurant: { name: 'R', slug: 'r', district },
  }) as any;

const all = [
  me('b', 'Kreuzberg', 'Döner', false, 12),
  me('a', 'Mitte', 'Croissant', false, 3),
  me('c', 'Kreuzberg', 'Burger', false, 7),
];

describe('buildAlbum', () => {
  it('groups into districts, alphabetical, for the filter row', () => {
    expect(buildAlbum(all, new Set()).groups.map((g) => g.group)).toEqual(['Kreuzberg', 'Mitte']);
  });

  it('lays the deck out in card order, across districts', () => {
    // a (003, Mitte) vor c (007, Kreuzberg) vor b (012, Kreuzberg): das Raster
    // ist EIN Stapel, die Bezirke filtern ihn nur.
    expect(buildAlbum(all, new Set()).slots.map((s) => s.id)).toEqual(['a', 'c', 'b']);
  });

  it('numbers a slot with the number printed on its card, three digits', () => {
    // Nicht die laufende Position: Platz 1 traegt die 003, weil die Karte
    // darin die 003 ist.
    expect(buildAlbum(all, new Set()).slots.map((s) => s.no)).toEqual(['003', '007', '012']);
  });

  it('leaves the number empty when a card carries none', () => {
    const mixed = [me('a', 'Kreuzberg', 'Döner'), me('b', 'Kreuzberg', 'Burger', false, 9)];
    const { slots } = buildAlbum(mixed, new Set());
    // Ohne `order` ans Ende — und ohne erfundene Nummer.
    expect(slots.map((s) => [s.id, s.no])).toEqual([
      ['b', '009'],
      ['a', null],
    ]);
  });

  it('keeps a group in card order too', () => {
    const g = buildAlbum(all, new Set()).groups.find((x) => x.group === 'Kreuzberg')!;
    expect(g.slots.map((s) => s.no)).toEqual(['007', '012']);
  });

  it('reveals dish/image only for collected ids', () => {
    const { slots } = buildAlbum(all, new Set(['b']));
    const doener = slots.find((s) => s.id === 'b')!;
    const burger = slots.find((s) => s.id === 'c')!;
    expect(doener.collected).toBe(true);
    expect(doener.mustEat?.dish).toBe('Döner');
    expect(burger.collected).toBe(false);
    expect(burger.mustEat).toBeNull();
  });

  it('treats cards with delivered image data as collected', () => {
    const { slots } = buildAlbum([me('paid', 'Kreuzberg', 'Burger', true, 4)], new Set());
    expect(slots[0].collected).toBe(true);
    expect(slots[0].mustEat?.dish).toBe('Burger');
  });

  it('keeps the spot on a covered slot, so the empty place has a name and a way there', () => {
    const { slots } = buildAlbum(all, new Set());
    expect(slots[0].where).toBe('R');
    expect(slots[0].slug).toBe('r');
  });

  it('numbers are stable regardless of which are collected', () => {
    const a = buildAlbum(all, new Set());
    const b = buildAlbum(all, new Set(['b', 'c']));
    expect(a.slots.map((s) => s.no)).toEqual(b.slots.map((s) => s.no));
  });
});
