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

  it('lässt die Karte im Kartenstreifen in Ruhe', () => {
    /* Streifen: 72 px + Safe Area. Dort ist die Karte Kulisse, gelesen wird das
       Detail. Die Kamera holt den Pin nicht in den Streifen: Sonst verschöbe
       sich die Karte darin beim Lesen, am Ende des Details bei jedem
       Nachziehen. */
    const stripTop = 72 + SAFE_TOP;
    expect(pinNeedsFollow(55 + SAFE_TOP, stripTop, SAFE_TOP)).toBe(false);
    expect(pinNeedsFollow(30, stripTop, SAFE_TOP)).toBe(false);
    expect(pinNeedsFollow(350, stripTop, SAFE_TOP)).toBe(false);
  });

  it('lässt sie auch in Ruhe, wenn das Sheet über den Streifen hinaus gescrollt ist', () => {
    /* Die Oberkante des Sheets steht dann weit über dem Bildschirm; ein Pin
       darüber gilt deshalb nicht als verdeckt. */
    expect(pinNeedsFollow(253, -769, SAFE_TOP)).toBe(false);
  });
});
