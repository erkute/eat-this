import { describe, it, expect } from 'vitest';
import { categorySearchTerm } from '@/lib/seo/categoryMeta';

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
