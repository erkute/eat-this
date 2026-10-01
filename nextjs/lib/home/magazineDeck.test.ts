import { describe, expect, it } from 'vitest';
import { deckKeyframes, deckPose } from './magazineDeck';

describe('deckPose', () => {
  it('uses the same transform functions at every depth, so poses interpolate', () => {
    const shape = (pose: string) => pose.replace(/\([^)]*\)/g, '()');
    const shapes = new Set([-1, 0, 1, 2, 3, 7].map((d) => shape(deckPose(d))));
    expect(shapes).toEqual(new Set(['translate() rotate() scale()']));
  });

  it('puts the top cover flat and dealt covers off to the left', () => {
    expect(deckPose(0)).toBe('translate(0%, 0px) rotate(0deg) scale(1)');
    expect(deckPose(-1)).toContain('translate(-165%');
  });

  it('hides covers beyond the third exactly under it', () => {
    expect(deckPose(5)).toBe(deckPose(3));
  });
});

describe('deckKeyframes', () => {
  it('gives every cover and every dot one keyframe per snap point', () => {
    const css = deckKeyframes(4);
    expect(css.match(/@keyframes mag-deck-4-\d/g)).toHaveLength(4);
    expect(css.match(/@keyframes mag-dot-4-\d/g)).toHaveLength(4);
    expect(css).toContain(
      '@keyframes mag-deck-4-1{0%{transform:translate(calc(0 * 100cqw), 0px) translate(0%, -16px)'
    );
    expect(css).toContain(
      '33.33%{transform:translate(calc(1 * 100cqw), 0px) translate(0%, 0px) rotate(0deg) scale(1)}'
    );
  });

  it('carries every cover back by exactly the distance scrolled', () => {
    const last = deckKeyframes(3).match(/@keyframes mag-deck-3-0\{[^@]*/)![0];
    expect(last).toContain('100%{transform:translate(calc(2 * 100cqw), 0px)');
  });

  it('needs no animation for a single cover', () => {
    expect(deckKeyframes(1)).toBe('');
  });
});
