import { describe, it, expect } from 'vitest';
import {
  buildCategoryTitle,
  buildCategorySectionHeading,
  categorySearchTerm,
} from '@/lib/seo/categoryMeta';

describe('categorySearchTerm', () => {
  it('maps the catalogue label onto the German search word', () => {
    expect(categorySearchTerm('lunch', 'Lunch', 'de')).toEqual({
      term: 'Mittagessen',
      kind: 'meal',
    });
  });

  it('keeps venue categories as venues', () => {
    expect(categorySearchTerm('coffee', 'Coffee', 'de').kind).toBe('venue');
    expect(categorySearchTerm('drinks', 'Drinks', 'en')).toEqual({ term: 'bars', kind: 'venue' });
  });

  it('falls back to the label for unknown slugs', () => {
    expect(categorySearchTerm('ramen', 'Ramen', 'de')).toEqual({ term: 'Ramen', kind: 'meal' });
  });
});

describe('buildCategorySectionHeading', () => {
  it('carries the German target query', () => {
    expect(buildCategorySectionHeading('lunch', 'Lunch', 'de')).toBe(
      'Handverlesene Spots für Mittagessen in Berlin'
    );
  });

  it('carries the English target query', () => {
    expect(buildCategorySectionHeading('lunch', 'Lunch', 'en')).toBe(
      'Hand-picked lunch spots in Berlin'
    );
  });

  it('phrases venues without the spots scaffold', () => {
    expect(buildCategorySectionHeading('coffee', 'Coffee', 'de')).toBe(
      'Handverlesene Cafés in Berlin'
    );
    expect(buildCategorySectionHeading('drinks', 'Drinks', 'en')).toBe(
      'Hand-picked bars in Berlin'
    );
  });

  it('never repeats the SERP title verbatim on any category', () => {
    const slugs = [
      'pizza',
      'coffee',
      'breakfast',
      'dinner',
      'lunch',
      'drinks',
      'fine-dining',
      'fast-food',
      'sweets',
    ];
    for (const slug of slugs) {
      for (const locale of ['de', 'en'] as const) {
        const heading = buildCategorySectionHeading(slug, slug, locale).toLowerCase();
        expect(heading).not.toBe(buildCategoryTitle(slug, slug, locale).toLowerCase());
      }
    }
  });
});
