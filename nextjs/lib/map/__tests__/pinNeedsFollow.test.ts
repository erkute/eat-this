import { describe, it, expect } from 'vitest';
import { pinNeedsFollow } from '../useMapCamera';

/* Werte aus dem Audit (iPhone 17, 402×874, Safe Area oben 62): Detail in
   Ruhe mit der Kante bei 594, Pin-Spitze nach dem Runterziehen bei 116. */
const SAFE_TOP = 62;

describe('pinNeedsFollow', () => {
  it('holt den Pin zurück, der nach dem Runterziehen unter Suche und Burger steht', () => {
    expect(pinNeedsFollow(116, 594, SAFE_TOP)).toBe(true);
  });

  it('lässt einen Pin stehen, der frei im sichtbaren Kartenstück liegt', () => {
    expect(pinNeedsFollow(350, 594, SAFE_TOP)).toBe(false);
  });

  it('holt den Pin zurück, den das hochgeschobene Sheet verdeckt', () => {
    expect(pinNeedsFollow(350, 300, SAFE_TOP)).toBe(true);
  });

  it('verlangt im Kartenstreifen nur, dass der Pin ganz im Bild steht', () => {
    /* Streifen: 72 px + Safe Area. Die Öffnen-Fahrt legt die Spitze dort auf
       55 px + Safe Area — mitten in der Kopfzeile, und das ist richtig so. */
    const stripTop = 72 + SAFE_TOP;
    expect(pinNeedsFollow(55 + SAFE_TOP, stripTop, SAFE_TOP)).toBe(false);
    expect(pinNeedsFollow(30, stripTop, SAFE_TOP)).toBe(true);
  });
});
