import { describe, expect, it } from 'vitest';
import { deckKeyframes, deckPose, tableKeyframes, tablePose } from './magazineDeck';

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

describe('tablePose (desktop)', () => {
  it('uses the same transform functions at every depth, so poses interpolate', () => {
    const shape = (pose: string) => pose.replace(/\(.*?\)(?= |$)/g, '()');
    const shapes = new Set([0, 1, 2, 4, 9].map((d) => shape(tablePose(d))));
    expect(shapes.size).toBe(1);
    expect(tablePose(0)).toMatch(/^translate\(.*\) rotate\(.*\) scale\(1\)$/);
  });

  it('opens the fan through CSS variables, so the mouse can widen it', () => {
    expect(tablePose(2)).toContain('calc(2 * var(--fan-x))');
    expect(tablePose(2)).toContain('calc(2 * var(--fan-r))');
  });

  it('hides covers beyond the fan exactly under its last one', () => {
    expect(tablePose(6)).toBe(tablePose(4));
  });
});

describe('tableKeyframes (desktop)', () => {
  const block = (css: string, name: string) =>
    css.match(new RegExp(`@keyframes ${name}\\{.*?\\}\\}`))![0];

  it('gives every cover one keyframe set', () => {
    expect(tableKeyframes(4).match(/@keyframes mag-table-4-\d/g)).toHaveLength(4);
    expect(tableKeyframes(1)).toBe('');
  });

  it('is a ring: at the last cover the first one lies right behind it', () => {
    const first = block(tableKeyframes(4), 'mag-table-4-0');
    expect(first).toContain(`100%{transform:translate(calc(3 * 100cqw), 0px) ${tablePose(1)}`);
  });

  it('tucks the dealt cover under the pile instead of throwing it off', () => {
    const first = block(tableKeyframes(4), 'mag-table-4-0');
    // Halfway it is out to the left and still on top, a hair later behind.
    expect(first).toMatch(/16\.67%\{transform:translate\(calc\(0\.5 \* 100cqw\), 0px\) translate\(-[\d.]+%[^}]*z-index:5\}/);
    expect(first).toMatch(/16\.68%\{[^}]*z-index:0\}/);
    // Then it lies hidden under the fan.
    expect(first).toContain(`33.33%{transform:translate(calc(1 * 100cqw), 0px) ${tablePose(3)}`);
  });

  it('carries every cover back by exactly the distance scrolled', () => {
    const css = tableKeyframes(3);
    for (const k of [0, 1, 2]) expect(css).toContain(`translate(calc(${k} * 100cqw), 0px)`);
  });
});
