import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { OG_PACK_VERSION } from '@/lib/constants';

/*
 * The nine category share cards in public/pics/og/ carry one version number,
 * whatever route emits them. Two independent numbers that happen to match drift
 * invisibly until one of them moves. kategorie/[slug] is the only emitter
 * today; the rule stands for whatever emits them next.
 *
 * Social crawlers cache these hard, so a route left on a stale version keeps
 * serving the old card long after the file changed. One constant, bumped
 * whenever a file in public/pics/og/ does.
 */

const ROUTES_EMITTING_OG_CARDS = ['app/[locale]/kategorie/[slug]/page.tsx'];

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
