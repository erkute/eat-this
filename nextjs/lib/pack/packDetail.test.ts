import { describe, it, expect } from 'vitest';
import {
  resolvePackByUrlSlug,
  packUrlSlug,
  formatPackPrice,
  bundleSavings,
  formatBundleSavings,
} from './packDetail';
import { CATALOG } from '@/lib/stripe-catalog';

const contents = {
  byCategory: Object.fromEntries(
    Object.values(CATALOG)
      .filter((p) => p.slug)
      .map((p) => [p.slug!, { spots: 1, mustEats: 1 }])
  ),
  allBerlin: { spots: 9, mustEats: 9 },
};

describe('resolvePackByUrlSlug', () => {
  it('resolves a category slug to its category pack', () => {
    expect(resolvePackByUrlSlug('pizza')?.packId).toBe('category-pizza');
  });

  it('resolves a hyphenated category slug', () => {
    expect(resolvePackByUrlSlug('fast-food')?.packId).toBe('category-fastfood');
    expect(resolvePackByUrlSlug('fine-dining')?.packId).toBe('category-finedining');
  });

  it('resolves all-berlin', () => {
    expect(resolvePackByUrlSlug('all-berlin')?.packId).toBe('all-berlin');
  });

  it('returns null for an unknown slug', () => {
    expect(resolvePackByUrlSlug('not-a-pack')).toBeNull();
  });
});

describe('packUrlSlug', () => {
  it('uses the category slug for category packs', () => {
    expect(packUrlSlug(CATALOG['category-pizza'])).toBe('pizza');
    expect(packUrlSlug(CATALOG['category-fastfood'])).toBe('fast-food');
  });

  it('uses all-berlin for the all-berlin pack', () => {
    expect(packUrlSlug(CATALOG['all-berlin'])).toBe('all-berlin');
  });

  it('round-trips with resolvePackByUrlSlug for every catalog pack', () => {
    for (const pack of Object.values(CATALOG)) {
      expect(resolvePackByUrlSlug(packUrlSlug(pack))?.packId).toBe(pack.packId);
    }
  });
});

describe('formatPackPrice', () => {
  it('formats a sub-euro-cents price with a comma and trailing euro sign', () => {
    expect(formatPackPrice(299)).toBe('2,99 €');
  });

  it('drops the decimals for a whole-euro price', () => {
    expect(formatPackPrice(2000)).toBe('20 €');
  });
});

describe('bundleSavings', () => {
  it('adds up the category packs rather than hardcoding their total', () => {
    const categoryPacks = Object.values(CATALOG).filter((p) => p.type === 'category');
    const { singleTotalCents, savedCents } = bundleSavings(contents);
    expect(singleTotalCents).toBe(categoryPacks.reduce((n, p) => n + p.amountCents, 0));
    expect(savedCents).toBe(singleTotalCents - CATALOG['all-berlin'].amountCents);
  });

  it('matches the live catalog: 9 x 2,99 EUR against 9,99 EUR', () => {
    expect(bundleSavings(contents)).toEqual({
      singleTotalCents: 2691,
      savedCents: 1692,
      percent: 62,
    });
  });

  it('floors the percentage — 62.87% must not advertise as 63%', () => {
    const { savedCents, singleTotalCents, percent } = bundleSavings(contents);
    expect((savedCents / singleTotalCents) * 100).toBeGreaterThan(percent);
    expect(percent).toBe(Math.floor((savedCents / singleTotalCents) * 100));
  });
});

describe('formatBundleSavings', () => {
  it('states the exact euro figure next to the rounded percentage', () => {
    expect(formatBundleSavings('de', contents)).toBe(
      'Verfügbare Packs einzeln 26,91 € · du sparst 16,92 € (62 %)'
    );
    expect(formatBundleSavings('en', contents)).toBe(
      'Available packs: 26,91 € separately · you save 16,92 € (62%)'
    );
  });
});

it('excludes unavailable packs from savings and hides unearned discounts', () => {
  const available = {
    ...contents,
    byCategory: { ...contents.byCategory, 'fine-dining': { spots: 1, mustEats: 0 } },
  };
  expect(bundleSavings(available)).toEqual({
    singleTotalCents: 2392,
    savedCents: 1393,
    percent: 58,
  });
  expect(formatBundleSavings('de', { ...contents, byCategory: {} })).toBe('');
  expect(bundleSavings({ ...contents, byCategory: {} }).percent).toBe(0);
});
