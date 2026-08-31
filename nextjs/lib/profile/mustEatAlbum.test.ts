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
  me('b', 'Kreuzberg', 'Döner'),
  me('a', 'Mitte', 'Croissant'),
  me('c', 'Kreuzberg', 'Burger'),
];

describe('buildAlbum', () => {
  it('groups into district sections, alphabetical by district', () => {
    expect(buildAlbum(all, new Set()).map((p) => p.group)).toEqual(['Kreuzberg', 'Mitte']);
  });
  it('falls back to id order when no card carries a number', () => {
    const pages = buildAlbum(all, new Set());
    expect(pages[0].slots.map((s) => [s.no, s.id])).toEqual([
      [1, 'b'],
      [2, 'c'],
    ]);
    expect(pages[1].slots[0].no).toBe(3);
  });
  it('sorts by the card number inside a group, not by id', () => {
    // Die Ids laufen a, b, c — die Kartennummern andersherum. Nur wer `order`
    // liest, kommt auf c, b, a.
    const numbered = [
      me('a', 'Kreuzberg', 'Döner', false, 26),
      me('b', 'Kreuzberg', 'Burger', false, 12),
      me('c', 'Kreuzberg', 'Pommes', false, 3),
    ];
    expect(buildAlbum(numbered, new Set())[0].slots.map((s) => s.id)).toEqual(['c', 'b', 'a']);
  });
  it('puts a card without a number last in its group', () => {
    const mixed = [me('a', 'Kreuzberg', 'Döner'), me('b', 'Kreuzberg', 'Burger', false, 9)];
    expect(buildAlbum(mixed, new Set())[0].slots.map((s) => s.id)).toEqual(['b', 'a']);
  });
  it('reveals dish/image only for collected ids', () => {
    const pages = buildAlbum(all, new Set(['b']));
    const doener = pages[0].slots.find((s) => s.id === 'b')!;
    const burger = pages[0].slots.find((s) => s.id === 'c')!;
    expect(doener.collected).toBe(true);
    expect(doener.mustEat?.dish).toBe('Döner');
    expect(burger.collected).toBe(false);
    expect(burger.mustEat).toBeNull();
  });
  it('treats cards with delivered image data as collected', () => {
    const pages = buildAlbum([me('paid', 'Kreuzberg', 'Burger', true)], new Set());
    expect(pages[0].slots[0].collected).toBe(true);
    expect(pages[0].slots[0].mustEat?.dish).toBe('Burger');
  });
  it('numbers are stable regardless of which are collected', () => {
    const a = buildAlbum(all, new Set());
    const b = buildAlbum(all, new Set(['b', 'c']));
    expect(a[0].slots.map((s) => s.no)).toEqual(b[0].slots.map((s) => s.no));
  });
});
