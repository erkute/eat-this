import { describe, expect, it } from 'vitest';
import { scrollProgress } from './scrollProgress';

const view = { top: 0, height: 1000 };

describe('scrollProgress', () => {
  it('runs from 0 to 1 between start and end mark', () => {
    // Strecke „top 70%" → „top 15%": Oberkante von 700 bis 150.
    expect(scrollProgress({ top: 900, height: 200 }, view, 'top 70%', 'top 15%')).toBe(0);
    expect(scrollProgress({ top: 700, height: 200 }, view, 'top 70%', 'top 15%')).toBe(0);
    expect(scrollProgress({ top: 425, height: 200 }, view, 'top 70%', 'top 15%')).toBeCloseTo(0.5);
    expect(scrollProgress({ top: 150, height: 200 }, view, 'top 70%', 'top 15%')).toBe(1);
    expect(scrollProgress({ top: -500, height: 200 }, view, 'top 70%', 'top 15%')).toBe(1);
  });

  it('reads keywords for the mark and the element edge', () => {
    // „top top" → „bottom top": der Aufmacher läuft oben hinaus.
    const hero = (top: number) => ({ top, height: 800 });
    expect(scrollProgress(hero(0), view, 'top top', 'bottom top')).toBe(0);
    expect(scrollProgress(hero(-200), view, 'top top', 'bottom top')).toBeCloseTo(0.25);
    expect(scrollProgress(hero(-800), view, 'top top', 'bottom top')).toBe(1);
    // „top bottom" → „top 45%"
    expect(scrollProgress({ top: 1000, height: 50 }, view, 'top bottom', 'top 45%')).toBe(0);
    expect(scrollProgress({ top: 725, height: 50 }, view, 'top bottom', 'top 45%')).toBeCloseTo(
      0.5
    );
  });

  it('measures against a scroll container that does not start at 0', () => {
    const box = { top: 74, height: 826 };
    expect(scrollProgress({ top: 74, height: 600 }, box, 'top top', 'bottom top')).toBe(0);
    expect(scrollProgress({ top: -226, height: 600 }, box, 'top top', 'bottom top')).toBeCloseTo(
      0.5
    );
  });

  it('jumps instead of dividing by zero for an empty stretch', () => {
    expect(scrollProgress({ top: 10, height: 0 }, view, 'top top', 'bottom top')).toBe(0);
    expect(scrollProgress({ top: -10, height: 0 }, view, 'top top', 'bottom top')).toBe(1);
  });
});
