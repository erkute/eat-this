import { describe, expect, it } from 'vitest';
import { activeChapterId, READING_LINE, chapterShortLabel } from './ArticleRail';

// Regression cover for the first version of the rail's scroll spy, which drove
// the marker off IntersectionObserver crossings inside a 153px band and only
// recomputed inside that callback. A heading that moved clear over the band
// between two samples produced no entry, and the marker then stayed put for
// good — reproduced in production on an eight-chapter guide. Measuring from
// positions cannot miss a chapter, whatever the scroll step.
describe('activeChapterId', () => {
  const ids = ['eins', 'zwei', 'drei', 'vier'];
  const at = (tops: Record<string, number | null>) => (id: string) => tops[id] ?? null;

  it('holds the first chapter while every heading is still below the line', () => {
    expect(activeChapterId(ids, at({ eins: 400, zwei: 900, drei: 1400, vier: 1900 }))).toBe('eins');
  });

  it('names the last heading that has passed the line', () => {
    expect(activeChapterId(ids, at({ eins: -800, zwei: -200, drei: 600, vier: 1200 }))).toBe(
      'zwei'
    );
  });

  it('does not skip a chapter when the scroll step jumps clear over it', () => {
    // The exact case the observer missed: between two samples, "zwei" went
    // from below the line to far above it without ever being measured inside
    // a band. Position beats crossing — the step size is irrelevant.
    const before = activeChapterId(ids, at({ eins: 100, zwei: 1100, drei: 2100, vier: 3100 }));
    const after = activeChapterId(ids, at({ eins: -2000, zwei: -1000, drei: 100, vier: 1100 }));
    expect(before).toBe('eins');
    expect(after).toBe('drei');
  });

  it('sticks to the last chapter once everything has scrolled past', () => {
    expect(activeChapterId(ids, at({ eins: -3000, zwei: -2000, drei: -1000, vier: -100 }))).toBe(
      'vier'
    );
  });

  it('treats a heading exactly on the line as passed', () => {
    expect(activeChapterId(ids, at({ eins: 0, zwei: READING_LINE, drei: 900, vier: 1400 }))).toBe(
      'zwei'
    );
  });

  it('skips a heading with no node instead of ending the scan there', () => {
    // A missing anchor used to be able to freeze the marker on everything
    // after it; the scan has to continue past the gap.
    expect(activeChapterId(ids, at({ eins: -900, zwei: null, drei: -100, vier: 800 }))).toBe(
      'drei'
    );
  });

  it('returns an empty id for an empty chapter list', () => {
    expect(activeChapterId([], () => null)).toBe('');
  });
});

describe('chapterShortLabel', () => {
  it('schneidet die Erklärung hinter dem Gedankenstrich ab', () => {
    expect(chapterShortLabel('Kolo Coffee – Mikrorösterei mit Wettkampf-Bohnen')).toBe(
      'Kolo Coffee'
    );
    expect(chapterShortLabel('BEN RAHIM — Ibrik im Sand, ohne Zucker')).toBe('BEN RAHIM');
    expect(chapterShortLabel('Distrikt - All-Day-Breakfast an der Bergstraße')).toBe('Distrikt');
  });

  it('lässt einen Bindestrich im Namen selbst stehen', () => {
    // Ohne Leerzeichen drumherum ist der Strich Teil des Namens.
    expect(chapterShortLabel('Coffee-Bar Nummer 9')).toBe('Coffee-Bar Nummer 9');
  });

  it('lässt Überschriften ohne Trenner ganz', () => {
    expect(chapterShortLabel('Fazit')).toBe('Fazit');
  });

  it('gibt nie einen leeren Namen zurück', () => {
    // Eine Überschrift, die mit dem Trenner anfängt, hätte sonst nichts übrig.
    expect(chapterShortLabel('– Nachtrag')).toBe('– Nachtrag');
  });
});
