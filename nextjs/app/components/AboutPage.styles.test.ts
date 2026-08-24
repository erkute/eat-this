import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

const cssPath = fileURLToPath(new URL('./AboutPage.module.css', import.meta.url));
const source = readFileSync(cssPath, 'utf8');
const root = postcss.parse(source, { from: cssPath });

/** Last-winning value of `prop` for a class across the whole file. */
function effective(className: string, prop: string): string | undefined {
  let winner: string | undefined;
  root.walkRules((rule) => {
    if (!rule.selectors.some((s) => new RegExp(`\\.${className}(?![\\w-])`).test(s))) return;
    rule.walkDecls(prop, (declaration) => {
      winner = declaration.value;
    });
  });
  return winner;
}

describe('AboutPage styles', () => {
  /**
   * The closer holds the page's only call to action. It once lost its whole
   * shared block — padding, min-height, radius, type — to an over-greedy
   * regex while the second button was being removed, and went on rendering as
   * a yellow rectangle tight around its text. Nothing failed; it just stopped
   * looking like a button. These are the declarations that make it one.
   */
  it('keeps the single call to action a real, tappable button', () => {
    expect(effective('ctaPrimary', 'display')).toBe('inline-flex');
    expect(effective('ctaPrimary', 'padding')).toBeTruthy();
    expect(effective('ctaPrimary', 'border-radius')).toBeTruthy();
    expect(effective('ctaPrimary', 'background')).toBeTruthy();

    const minHeight = effective('ctaPrimary', 'min-height');
    expect(minHeight).toBeTruthy();
    // 44px is the smallest target a finger can hit reliably.
    expect(Number.parseInt(minHeight as string, 10)).toBeGreaterThanOrEqual(44);
  });

  /**
   * A width together with a max-height does not scale a picture, it squashes
   * one — that is how the phone ended up 290 wide inside a 460 cap instead of
   * its own 225x457. The figures carry a width and nothing else.
   */
  it('never constrains a figure in both axes at once', () => {
    const width = effective('figureImg', 'width');
    expect(width).toBeTruthy();
    expect(effective('figureImg', 'max-height')).toBeUndefined();
    expect(effective('figureImg', 'height')).toBe('auto');
  });

  /** An empty selector slot is what a bad edit leaves behind. */
  it('leaves no dangling selector fragments', () => {
    const dangling: string[] = [];
    root.walkRules((rule) => {
      if (rule.selectors.some((selector) => selector.trim() === '')) dangling.push(rule.selector);
      // `.a, .a { }` is valid CSS and renders fine — it is also the exact
      // fingerprint of a half-deleted selector list.
      const unique = new Set(rule.selectors.map((s) => s.trim()));
      if (unique.size !== rule.selectors.length) dangling.push(rule.selector);
    });
    expect(dangling).toEqual([]);
  });
});
