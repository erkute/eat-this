import { describe, it, expect } from 'vitest';
import { trimToLimit } from '../generate-seo-fields';

describe('trimToLimit', () => {
  it('leaves a value that already fits untouched', () => {
    expect(trimToLimit('kurz genug', 160)).toBe('kurz genug');
  });

  it('prefers a sentence end when it costs little', () => {
    const v = 'Café in einer ehemaligen Friedhofskapelle. Abends Cocktails und Barsnacks dazu.';
    const out = trimToLimit(v, 50);
    expect(out).toBe('Café in einer ehemaligen Friedhofskapelle.');
  });

  it('never trades half a sentence for a one-character overshoot', () => {
    const v = 'Kurzer Satz. ' + 'x'.repeat(120) + ' Ende';
    const out = trimToLimit(v, v.length - 1);
    expect(out.length).toBeGreaterThan(100);
    expect(out.startsWith('Kurzer Satz. ')).toBe(true);
  });

  it('falls back to the last word boundary when no sentence end fits', () => {
    const v = 'Bánh mì, Bubble Tea und Reisbowls in Charlottenburg zwischen zwei Plätzen';
    const out = trimToLimit(v, 40);
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out.endsWith(' ')).toBe(false);
    expect(v.startsWith(out)).toBe(true);
  });

  it('drops trailing punctuation left by the cut', () => {
    expect(trimToLimit('Torten, Kuchen, Strudel, Kaffee', 16)).toBe('Torten, Kuchen');
  });

  it('handles the real overshoot case of one character', () => {
    const v = 'a'.repeat(100) + ' ' + 'b'.repeat(60);
    expect(trimToLimit(v, 160).length).toBeLessThanOrEqual(160);
  });
});
