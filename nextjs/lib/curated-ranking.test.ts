import { describe, it, expect } from 'vitest';
import { rankCurated, pickShelf, MIN_CURATED } from './curated-ranking';
import type { RestaurantCard } from './types';

/** Karte mit dem Nötigsten — die Sortierung liest nur `slug` und `name`. */
function r(slug: string, name = slug): RestaurantCard {
  return { _id: `id-${slug}`, slug, name };
}

/** Wie GROQ liefert: alphabetisch nach Name. */
const alphabetical = [
  r('136-berlin', '136 Berlin Restaurant'),
  r('1811', '1811'),
  r('aviv', 'AVIV 030'),
  r('barra', 'Barra'),
  r('estelle', 'Estelle'),
  r('jaja', 'jaja'),
];

describe('rankCurated', () => {
  it('puts curated spots first, in editorial order', () => {
    const { top } = rankCurated(alphabetical, ['estelle', 'barra', 'aviv']);
    expect(top.map((x) => x.slug)).toEqual(['estelle', 'barra', 'aviv']);
  });

  it('keeps the remainder complete and free of curated duplicates', () => {
    const { top, rest } = rankCurated(alphabetical, ['estelle', 'barra', 'aviv']);
    expect(top.length + rest.length).toBe(alphabetical.length);
    expect(rest.map((x) => x.slug)).not.toContain('estelle');
  });

  it('sorts digit-leading names to the end of the directory', () => {
    const { rest } = rankCurated(alphabetical, ['estelle', 'barra', 'aviv']);
    expect(rest.map((x) => x.name)).toEqual(['jaja', '136 Berlin Restaurant', '1811']);
  });

  it('preserves the incoming alphabetical order within each group', () => {
    // GROQ-Collation darf nicht durch einen JS-Re-Sort verschoben werden.
    const { rest } = rankCurated(alphabetical, []);
    expect(rest.map((x) => x.name)).toEqual([
      'AVIV 030',
      'Barra',
      'Estelle',
      'jaja',
      '136 Berlin Restaurant',
      '1811',
    ]);
  });

  it('falls back to a plain directory when the curated list is missing', () => {
    const { top, rest } = rankCurated(alphabetical, undefined);
    expect(top).toEqual([]);
    expect(rest).toHaveLength(alphabetical.length);
  });

  it(`suppresses the best-of section below ${MIN_CURATED} entries`, () => {
    const { top, rest } = rankCurated(alphabetical, ['estelle', 'barra']);
    expect(top).toEqual([]);
    // Die halb-kuratierten Spots bleiben im Verzeichnis, sie verschwinden nicht.
    expect(rest.map((x) => x.slug)).toContain('estelle');
  });

  it('skips references the list no longer contains', () => {
    // Restaurant geschlossen (isOpen == false fliegt in GROQ raus) oder dem
    // Bezirk entzogen — darf keine Lücke rendern.
    const { top } = rankCurated(alphabetical, ['estelle', 'geschlossen', 'barra', 'aviv']);
    expect(top.map((x) => x.slug)).toEqual(['estelle', 'barra', 'aviv']);
  });

  it('counts a duplicated reference once', () => {
    const { top, rest } = rankCurated(alphabetical, ['estelle', 'estelle', 'barra', 'aviv']);
    expect(top.map((x) => x.slug)).toEqual(['estelle', 'barra', 'aviv']);
    expect(top.length + rest.length).toBe(alphabetical.length);
  });

  it('handles an empty list', () => {
    expect(rankCurated([], ['estelle'])).toEqual({ top: [], rest: [] });
  });

  it('does not mutate its input', () => {
    const input = [...alphabetical];
    rankCurated(input, ['estelle', 'barra', 'aviv']);
    expect(input).toEqual(alphabetical);
  });
});

describe('pickShelf', () => {
  const c = (slug: string) => ({ slug });

  it('leads with the curated spots, then fills alphabetically', () => {
    expect(
      pickShelf([c('estelle')], [c('aviv'), c('barra'), c('jaja')], 4).map((x) => x.slug)
    ).toEqual(['estelle', 'aviv', 'barra', 'jaja']);
  });

  it('never shows a spot twice when it is curated and in the fill', () => {
    expect(
      pickShelf([c('barra')], [c('aviv'), c('barra'), c('jaja')], 4).map((x) => x.slug)
    ).toEqual(['barra', 'aviv', 'jaja']);
  });

  it('caps at the limit', () => {
    expect(pickShelf([c('a'), c('b'), c('c'), c('d'), c('e')], [c('f')], 4)).toHaveLength(4);
  });

  it('is the plain fill when nothing is curated — the uncurated district is unchanged', () => {
    const fill = [c('aviv'), c('barra')];
    expect(pickShelf(undefined, fill, 4)).toEqual(fill);
    expect(pickShelf([], fill, 4)).toEqual(fill);
    expect(pickShelf(null, fill, 4)).toEqual(fill);
  });

  it('takes a single curated spot without demanding MIN_CURATED', () => {
    expect(pickShelf([c('estelle')], [c('aviv')], 4)[0].slug).toBe('estelle');
  });

  it('survives a district with nothing at all', () => {
    expect(pickShelf(null, null, 4)).toEqual([]);
  });
});
