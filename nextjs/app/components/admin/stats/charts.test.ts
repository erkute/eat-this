import { describe, expect, it } from 'vitest';
import { ticks } from './charts';

describe('ticks', () => {
  it('reicht immer bis über das Maximum', () => {
    expect(ticks(61)).toEqual([0, 20, 40, 60, 80]);
    expect(ticks(162)).toEqual([0, 50, 100, 150, 200]);
    expect(ticks(60)).toEqual([0, 20, 40, 60]);
  });

  it('bleibt bei Zählwerten ganzzahlig', () => {
    expect(ticks(1, 1)).toEqual([0, 1]);
    expect(ticks(3, 1)).toEqual([0, 1, 2, 3]);
  });

  it('teilt ohne Mindestschritt auch fein', () => {
    expect(ticks(1)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
});
