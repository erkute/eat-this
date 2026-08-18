import { describe, expect, it } from 'vitest';
import { hasAmbiguousDropCap } from './dropCap';

describe('hasAmbiguousDropCap', () => {
  it('flags the German ledes that start with a bare stroke', () => {
    expect(hasAmbiguousDropCap('Im zweiten Hof der Sophienhöfe liegt eine Bäckerei.')).toBe(true);
    expect(hasAmbiguousDropCap('In der Torstraße steht seit Jahren eine Bar.')).toBe(true);
    expect(hasAmbiguousDropCap('Ist das noch Imbiss oder schon Restaurant?')).toBe(true);
  });

  it('keeps the drop cap for letters that have a shape', () => {
    expect(hasAmbiguousDropCap('An der Torstraße wird gebacken.')).toBe(false);
    expect(hasAmbiguousDropCap('Jeden Morgen um sechs geht der Ofen an.')).toBe(false);
    expect(hasAmbiguousDropCap('Über dem Hinterhof hängt Wäsche.')).toBe(false);
  });

  it('looks past leading punctuation, the way ::first-letter does', () => {
    expect(hasAmbiguousDropCap('"Immer noch die beste Pizza", sagt er.')).toBe(true);
    expect(hasAmbiguousDropCap('„Immer noch die beste Pizza", sagt er.')).toBe(true);
    expect(hasAmbiguousDropCap('(Anfangs war es nur ein Kiosk.)')).toBe(false);
    expect(hasAmbiguousDropCap('   Im Hinterhof.')).toBe(true);
  });

  it('treats missing or letterless copy as safe', () => {
    expect(hasAmbiguousDropCap('')).toBe(false);
    expect(hasAmbiguousDropCap(null)).toBe(false);
    expect(hasAmbiguousDropCap(undefined)).toBe(false);
    expect(hasAmbiguousDropCap('—')).toBe(false);
  });
});
