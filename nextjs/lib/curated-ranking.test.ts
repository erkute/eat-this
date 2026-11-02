import { describe, it, expect } from 'vitest';
import { rankCurated, MIN_CURATED } from './curated-ranking';
import type { RestaurantCard } from './types';

/** Karte mit dem Nötigsten — die Sortierung liest nur `slug` und `name`. */
function r(slug: string, name = slug): RestaurantCard {
  return { _id: `id-${slug}`, slug, name };
}

/** Wie GROQ liefert: nach Name, Codepunkt-Reihenfolge. */
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

  it('sorts the directory the way readers read an alphabet', () => {
    // GROQ sortiert nach Codepunkten: Kleinbuchstaben und Umlaute kamen hinter Z.
    const groq = [
      r('aviv', 'AVIV 030'),
      r('barra', 'Barra'),
      r('zola', 'Zola'),
      r('barlevain', 'barlevain'),
      r('oesterelli', 'Österelli'),
      r('1811', '1811'),
      r('136-berlin', '136 Berlin Restaurant'),
    ];
    const { rest } = rankCurated(groq, []);
    expect(rest.map((x) => x.name)).toEqual([
      'AVIV 030',
      'barlevain',
      'Barra',
      'Österelli',
      'Zola',
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
