import { describe, it, expect } from 'vitest';
import {
  addressLines,
  classifyWebsite,
  formatPriceLabel,
  handleBreakParts,
} from './restaurantDetail.helpers';

describe('formatPriceLabel', () => {
  it('formats min and max with euro', () => {
    expect(formatPriceLabel({ priceRange: { min: 10, max: 20 } })).toBe('10–20 €');
  });
  it('renders an open-ended range when only min is set', () => {
    expect(formatPriceLabel({ priceRange: { min: 15 } })).toBe('ab 15 €');
  });

  it("renders an open-ended range for Google's top band", () => {
    // Places sends `startPrice: 100` with no `endPrice` for its most
    // expensive tier — that is how almost every fine-dining spot arrives.
    expect(formatPriceLabel({ priceRange: { min: 100, currency: 'EUR' } })).toBe('ab 100 €');
    expect(formatPriceLabel({ priceRange: { min: 100, currency: 'EUR' } }, 'en')).toBe(
      'from 100 €'
    );
  });

  it('keeps the closed range language-neutral', () => {
    expect(formatPriceLabel({ priceRange: { min: 10, max: 20 } }, 'en')).toBe('10–20 €');
  });
  it('returns null when only max is set', () => {
    expect(formatPriceLabel({ priceRange: { max: 25 } })).toBeNull();
  });
  it('returns null when no priceRange', () => {
    expect(formatPriceLabel({})).toBeNull();
  });
});

describe('classifyWebsite', () => {
  it('detects instagram URL with handle', () => {
    expect(classifyWebsite('https://www.instagram.com/barbasta')).toEqual({
      kind: 'instagram',
      url: 'https://www.instagram.com/barbasta',
      handle: 'barbasta',
    });
  });
  it('returns "web" kind with www. display for plain host', () => {
    const r = classifyWebsite('https://example.de');
    expect(r?.kind).toBe('web');
    expect(r && r.kind === 'web' && r.display).toBe('www.example.de');
  });
  it('passes through subdomain hosts unchanged', () => {
    const r = classifyWebsite('https://book.example.de');
    expect(r && r.kind === 'web' && r.display).toBe('book.example.de');
  });
  it('returns null on falsy input', () => {
    expect(classifyWebsite(null)).toBeNull();
    expect(classifyWebsite(undefined)).toBeNull();
    expect(classifyWebsite('')).toBeNull();
  });
  it('rejects non-web schemes (no clickable XSS payload)', () => {
    expect(classifyWebsite('javascript:alert(1)')).toBeNull();
    expect(classifyWebsite('  javascript:alert(1)')).toBeNull();
    expect(classifyWebsite('JavaScript:alert(1)')).toBeNull();
    expect(classifyWebsite('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(classifyWebsite('vbscript:msgbox(1)')).toBeNull();
  });
});

describe('addressLines', () => {
  it('puts street and locality on two lines and drops the country', () => {
    expect(addressLines('Ackerstraße 144, 10115 Berlin, Deutschland')).toEqual([
      'Ackerstraße 144',
      '10115 Berlin',
    ]);
    expect(addressLines('Ackerstraße 144, 10115 Berlin, Germany')).toEqual([
      'Ackerstraße 144',
      '10115 Berlin',
    ]);
  });
  it('keeps a venue or floor in front of the street on its own lines', () => {
    expect(addressLines('KaDeWe, 6. Etage, Tauentzienstraße 21-24, 10789 Berlin')).toEqual([
      'KaDeWe',
      '6. Etage',
      'Tauentzienstraße 21-24',
      '10789 Berlin',
    ]);
  });
  it('returns no lines for a missing address', () => {
    expect(addressLines(null)).toEqual([]);
    expect(addressLines(undefined)).toEqual([]);
    expect(addressLines(' , ')).toEqual([]);
  });
});

describe('handleBreakParts', () => {
  it('splits after dots and underscores, keeping every character', () => {
    expect(handleBreakParts('wencheng_handpullednoodles')).toEqual(['wencheng_', 'handpullednoodles']);
    expect(handleBreakParts('hier.restaurant.catering')).toEqual(['hier.', 'restaurant.', 'catering']);
    expect(handleBreakParts('a__b.')).toEqual(['a__', 'b.']);
  });
  it('leaves a name without separators in one piece', () => {
    expect(handleBreakParts('foodtechniqueberlin')).toEqual(['foodtechniqueberlin']);
    expect(handleBreakParts('')).toEqual([]);
  });
});
