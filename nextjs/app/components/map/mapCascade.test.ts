import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

/**
 * MapControls.module.css spreads a single control over many blocks —
 * `.mapSearchBtn` alone appears in 15 of them, most inside grouped selectors
 * that also serve `.mapBurger`, `.fab` or `.panelToggle`. That grouping is
 * deliberate and mostly load-bearing, so the file cannot simply be flattened:
 * an attempt to merge same-selector blocks at their last position silently
 * flipped `.mapSearchToolbar { gap }` from 8px to 10px, because a
 * `@media (max-width: 520px)` block sits BEFORE the media-less one in source
 * order and loses the tie until it is moved.
 *
 * What the spread does cost is visibility: you cannot see, at any one place,
 * what a control ends up with. Two real bugs came out of exactly that —
 *   1. `.mapSearchBtn`'s `transition` shorthand listed only colour properties,
 *      so it JUMPED off-screen on the same trigger that made `.mapBurger`,
 *      which keeps its own `transition: transform`, glide.
 *   2. The white icon halo was killed by a `filter: none` declared later in
 *      the file for an overlapping selector.
 *
 * These tests pin the *effective* values instead of any single block, so the
 * next well-meaning edit somewhere in those 900 lines fails here rather than
 * on someone's phone.
 */

const CONTROLS = 'MapControls.module.css';
const FILTERS = 'MapFilters.module.css';

function cssRoot(moduleName: string) {
  return postcss.parse(
    readFileSync(fileURLToPath(new URL(`./${moduleName}`, import.meta.url)), 'utf8')
  );
}

/**
 * Last-winning value of `prop` for `className`, honouring source order across
 * every block — grouped selectors included. Media-scoped blocks are skipped
 * unless `media` is given, so this models the base cascade rather than one
 * viewport.
 */
function effective(
  moduleName: string,
  className: string,
  prop: string,
  media?: string
): string | undefined {
  let winner: string | undefined;
  cssRoot(moduleName).walkRules((rule) => {
    const atRules: string[] = [];
    let parent = rule.parent;
    while (parent && parent.type !== 'root') {
      if (parent.type === 'atrule') atRules.push(`@${parent.name} ${parent.params}`);
      parent = parent.parent;
    }
    const inMedia = atRules.length > 0;
    if (media ? !atRules.some((a) => a.includes(media)) : inMedia) return;

    const hits = rule.selectors.some((sel) => {
      const local = sel.replaceAll(/:global\([^)]*\)/g, '').trim();
      // Plain or compound reference to the class, not a descendant of it.
      return new RegExp(`\\.${className}(?![\\w-])`).test(local);
    });
    if (!hits) return;

    rule.walkDecls(prop, (decl) => {
      winner = decl.value;
    });
  });
  return winner;
}

describe('MapControls cascade', () => {
  it('animates transform on every control that retreats off the top edge', () => {
    // The three leave together on `data-header-stuck`. If one of them loses
    // `transform` from its transition it snaps while the others glide — which
    // is exactly what shipped before.
    for (const control of ['mapSearchBtn', 'mapBurger', 'mapSearchToolbar']) {
      const transition = effective(CONTROLS, control, 'transition');
      expect(transition, `${control} has no effective transition`).toBeDefined();
      expect(
        transition!.includes('transform'),
        `.${control} must transition transform — it retreats on the same trigger as the others. Got: ${transition}`
      ).toBe(true);
    }
  });

  it('keeps the free-standing icons on their white halo', () => {
    // Plate-less controls sit straight on the tiles; without the halo they
    // vanish under a yellow pin. A later `filter: none` for an overlapping
    // selector silently removed this once already.
    for (const icon of ['fabIcon', 'mapBurgerLines']) {
      const filter = effective(CONTROLS, icon, 'filter');
      expect(filter, `.${icon} has no effective filter`).toBeDefined();
      expect(
        filter!.includes('drop-shadow'),
        `.${icon} lost its halo — effective filter is "${filter}"`
      ).toBe(true);
    }
  });

  it('does not let the status toast overlap the locate FAB on phones', () => {
    // Both are positioned off the sheet's top edge. The toast used to land on
    // the exact band the FAB occupies, at z-index 120 over 6 — hiding and
    // blocking the control its own copy tells you to press.
    const phone = '(max-width: 767.98px)';
    const fabBottom = effective(CONTROLS, 'fab', 'bottom', phone);
    const toastShift = effective(CONTROLS, 'mapStatusLayer', 'transform', phone);

    expect(fabBottom).toContain('14px');
    // Clearing the FAB needs its 44px height + the 14px it floats above the
    // sheet + breathing room; 70px is what the stylesheet reserves.
    expect(toastShift).toContain('70px');
  });
});

describe('MapFilters cascade', () => {
  it('renders long chip labels smaller than normal ones', () => {
    /* The chip rail is a 4-up grid; at the base 12px a few district names do
     * not fit on one line no matter how wrapping is configured
     * ("Charlottenburg" needs 88px in a 68px slot), so `.filterChipLabelLong`
     * exists to shrink them.
     *
     * It spent a while doing nothing. Two separate attempts —
     * `clamp(8.8px, 2.55vw, 10px)` and `clamp(7.5px, 2.35vw, 9px)`, both
     * media-scoped — were overridden by a later media-less `font-size: 12px`
     * shared with the plain label, so long labels computed IDENTICALLY to
     * short ones and the names broke mid-word instead. Same trap as the
     * transition shorthand and the icon halo above: the losing declaration
     * looks perfectly reasonable where it sits.
     *
     * Pin the relationship, not the number — any value is fine as long as long
     * labels actually end up smaller.
     */
    const long = effective(FILTERS, 'filterChipLabelLong', 'font-size');
    const plain = effective(FILTERS, 'filterChipLabel', 'font-size');

    expect(long, '.filterChipLabelLong has no effective font-size').toBeDefined();
    expect(plain, '.filterChipLabel has no effective font-size').toBeDefined();
    expect(
      long,
      '.filterChipLabelLong resolves to `inherit` — it is not shrinking anything'
    ).not.toBe('inherit');

    const px = (value: string) => {
      const match = /^(-?[\d.]+)px$/.exec(value.trim());
      return match ? Number(match[1]) : Number.NaN;
    };
    const longPx = px(long!);
    const plainPx = px(plain!);
    expect(
      Number.isFinite(longPx) && Number.isFinite(plainPx),
      `expected both to resolve to plain px, got long="${long}" plain="${plain}"`
    ).toBe(true);
    expect(
      longPx,
      `long labels must be smaller than normal ones — both computed to ${plain}`
    ).toBeLessThan(plainPx);
  });

  it('never breaks a chip label mid-word', () => {
    // "Kreuz-berg". Wrapping at spaces is fine; splitting a word is not.
    expect(effective(FILTERS, 'filterChipLabel', 'overflow-wrap')).not.toBe('anywhere');
    expect(effective(FILTERS, 'filterChipLabel', 'word-break')).not.toBe('break-all');
    expect(effective(FILTERS, 'filterChipLabel', 'hyphens')).not.toBe('auto');
  });
});
