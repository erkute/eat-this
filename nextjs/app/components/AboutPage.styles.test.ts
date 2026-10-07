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
