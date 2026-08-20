import { describe, it, expect } from 'vitest';
import { rankCategoryRestaurants, MIN_CURATED } from './kategorie-ranking';
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

describe('rankCategoryRestaurants', () => {
  it('puts curated spots first, in editorial order', () => {
    const { top } = rankCategoryRestaurants(alphabetical, ['estelle', 'barra', 'aviv']);
    expect(top.map((x) => x.slug)).toEqual(['estelle', 'barra', 'aviv']);
  });

  it('keeps the remainder complete and free of curated duplicates', () => {
    const { top, rest } = rankCategoryRestaurants(alphabetical, ['estelle', 'barra', 'aviv']);
    expect(top.length + rest.length).toBe(alphabetical.length);
    expect(rest.map((x) => x.slug)).not.toContain('estelle');
  });

  it('sorts digit-leading names to the end of the directory', () => {
    const { rest } = rankCategoryRestaurants(alphabetical, ['estelle', 'barra', 'aviv']);
    expect(rest.map((x) => x.name)).toEqual(['jaja', '136 Berlin Restaurant', '1811']);
  });

  it('preserves the incoming alphabetical order within each group', () => {
    // GROQ-Collation darf nicht durch einen JS-Re-Sort verschoben werden.
    const { rest } = rankCategoryRestaurants(alphabetical, []);
    expect(rest.map((x) => x.name)).toEqual([
      'AVIV 030',
      'Barra',
      'Estelle',
      'jaja',
      '136 Berlin Restaurant',
      '1811',
    ]);
  });

  it('falls back to a plain directory when topSpots is missing', () => {
    const { top, rest } = rankCategoryRestaurants(alphabetical, undefined);
    expect(top).toEqual([]);
    expect(rest).toHaveLength(alphabetical.length);
  });

  it(`suppresses the best-of section below ${MIN_CURATED} entries`, () => {
    const { top, rest } = rankCategoryRestaurants(alphabetical, ['estelle', 'barra']);
    expect(top).toEqual([]);
    // Die halb-kuratierten Spots bleiben im Verzeichnis, sie verschwinden nicht.
    expect(rest.map((x) => x.slug)).toContain('estelle');
  });

  it('skips references the category no longer contains', () => {
    // Restaurant geschlossen (isOpen == false fliegt in GROQ raus) oder
    // Kategorie entzogen — darf keine Lücke rendern.
    const { top } = rankCategoryRestaurants(alphabetical, [
      'estelle',
      'geschlossen',
      'barra',
      'aviv',
    ]);
    expect(top.map((x) => x.slug)).toEqual(['estelle', 'barra', 'aviv']);
  });

  it('counts a duplicated reference once', () => {
    const { top, rest } = rankCategoryRestaurants(alphabetical, [
      'estelle',
      'estelle',
      'barra',
      'aviv',
    ]);
    expect(top.map((x) => x.slug)).toEqual(['estelle', 'barra', 'aviv']);
    expect(top.length + rest.length).toBe(alphabetical.length);
  });

  it('handles an empty category', () => {
    expect(rankCategoryRestaurants([], ['estelle'])).toEqual({ top: [], rest: [] });
  });

  it('does not mutate its input', () => {
    const input = [...alphabetical];
    rankCategoryRestaurants(input, ['estelle', 'barra', 'aviv']);
    expect(input).toEqual(alphabetical);
  });
});
