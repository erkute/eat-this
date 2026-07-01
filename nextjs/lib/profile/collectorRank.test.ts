import { describe, it, expect } from 'vitest';
import { resolveRank, RANKS } from './collectorRank';

describe('resolveRank', () => {
  it('is Frischling at zero', () => {
    expect(resolveRank(0, 29).key).toBe('frischling');
  });
  it('is Entdecker after the first reveal', () => {
    expect(resolveRank(1, 29).key).toBe('entdecker');
  });
  it('is Kenner at >=25%', () => {
    expect(resolveRank(8, 29).key).toBe('kenner');
  });
  it('is Local at >=50%', () => {
    expect(resolveRank(15, 29).key).toBe('local');
  });
  it('is Stadtbekannt at >=80%', () => {
    expect(resolveRank(24, 29).key).toBe('stadtbekannt');
  });
  it('is Komplett at 100%', () => {
    expect(resolveRank(29, 29).key).toBe('komplett');
  });
  it('level is the 1-based rank index', () => {
    expect(resolveRank(0, 29).level).toBe(1);
    expect(resolveRank(29, 29).level).toBe(RANKS.length);
  });
  it('handles total=0 safely', () => {
    expect(resolveRank(0, 0).key).toBe('frischling');
  });
});
