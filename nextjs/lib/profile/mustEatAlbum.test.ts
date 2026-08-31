import { describe, it, expect } from 'vitest';
import { buildAlbum } from './mustEatAlbum';

const me = (id: string, district: string, dish: string, withImage = false) =>
  ({
    _id: id,
    dish,
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
  it('assigns stable global 1-based numbers in (group, id) order', () => {
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
