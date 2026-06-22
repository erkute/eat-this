import { describe, it, expect } from 'vitest';
import { buildAlbum } from './mustEatAlbum';

const me = (id: string, cat: string, dish: string) =>
  ({
    _id: id,
    dish,
    image: `${id}.jpg`,
    restaurant: { name: 'R', slug: 'r', district: 'X', categories: [{ name: cat }] },
  }) as any;

const all = [
  me('b', 'Fast Food', 'Döner'),
  me('a', 'Frühstück', 'Croissant'),
  me('c', 'Fast Food', 'Burger'),
];

describe('buildAlbum', () => {
  it('groups into category pages, alphabetical by category', () => {
    expect(buildAlbum(all, new Set()).map((p) => p.category)).toEqual(['Fast Food', 'Frühstück']);
  });
  it('assigns stable global 1-based numbers in (category, id) order', () => {
    const pages = buildAlbum(all, new Set());
    expect(pages[0].slots.map((s) => [s.no, s.id])).toEqual([
      [1, 'b'],
      [2, 'c'],
    ]);
    expect(pages[1].slots[0].no).toBe(3);
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
  it('numbers are stable regardless of which are collected', () => {
    const a = buildAlbum(all, new Set());
    const b = buildAlbum(all, new Set(['b', 'c']));
    expect(a[0].slots.map((s) => s.no)).toEqual(b[0].slots.map((s) => s.no));
  });
});
