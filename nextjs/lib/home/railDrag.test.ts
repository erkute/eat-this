import { describe, expect, it } from 'vitest';
import { settleLeft } from './railDrag';

describe('settleLeft', () => {
  const starts = [0, 320, 640, 960];

  it('rastet auf der nächsten Karte ein', () => {
    expect(settleLeft(starts, 140, 0)).toBe(0);
    expect(settleLeft(starts, 170, 0)).toBe(320);
    expect(settleLeft(starts, 700, 0.1)).toBe(640);
  });

  it('blättert bei einem Schwung eine Karte weiter, nie zurück auf die alte', () => {
    expect(settleLeft(starts, 380, 1.2)).toBe(640);
    expect(settleLeft(starts, 600, -1.2)).toBe(320);
  });

  it('bleibt in der Leiste', () => {
    expect(settleLeft(starts, 990, 3)).toBe(960);
    expect(settleLeft(starts, -20, -3)).toBe(0);
    expect(settleLeft([], 50, 0)).toBe(50);
  });
});
