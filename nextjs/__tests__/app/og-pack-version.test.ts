import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { OG_PACK_VERSION } from '@/lib/constants';

/* The nine category share cards in public/pics/og/ are emitted by two routes.
 * They used to carry two independent version numbers — a local
 * `PACK_OG_VERSION = 2` in kategorie/[slug] and a hardcoded `?v=2` in
 * guides/[slug]. Both happened to be 2, which is exactly how that kind of
 * drift stays invisible until one of them moves.
 *
 * Social crawlers cache these hard, so a route left on a stale version keeps
 * serving the old card long after the file changed. Same contract as
 * CSS_VERSION: one constant, bumped whenever a file in public/pics/og/ does. */

const ROUTES_EMITTING_OG_CARDS = [
  'app/[locale]/(spa)/guides/[slug]/page.tsx',
  'app/[locale]/kategorie/[slug]/page.tsx',
];

describe('category share cards are versioned in one place', () => {
  it.each(ROUTES_EMITTING_OG_CARDS)('%s uses the shared constant', (file) => {
    const source = readFileSync(join(process.cwd(), file), 'utf8');

    expect(source).toContain('OG_PACK_VERSION');
    // No hand-written version next to an og_ URL.
    expect(source).not.toMatch(/pics\/og\/[^`'"]*\?v=\d/);
  });

  it('is a positive integer', () => {
    expect(Number.isInteger(OG_PACK_VERSION)).toBe(true);
    expect(OG_PACK_VERSION).toBeGreaterThan(0);
  });
});
