import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The All-Berlin upsell CTA carried a hardcoded "20 €" and quietly kept it
 * after the pack dropped to 9,99 € — every other price on the page came from
 * the catalog, so nothing failed. Prices belong to `stripe-catalog`; this page
 * may format them, never spell them out.
 */
describe('pack detail page', () => {
  it('spells out no price of its own', () => {
    const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    const literals = source.match(/(?:€\s?\d|\d[\d.,]*\s?€)/g) ?? [];
    expect(literals).toEqual([]);
  });
});
