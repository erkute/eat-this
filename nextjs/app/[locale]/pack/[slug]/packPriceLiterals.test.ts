import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Prices belong to `stripe-catalog`; this page may format them, never spell
 * them out. A hardcoded price would silently survive a catalog change, because
 * every other price on the page still comes from the catalog.
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
