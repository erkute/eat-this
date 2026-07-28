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

function cssRoot() {
  return postcss.parse(
    readFileSync(fileURLToPath(new URL('./MapControls.module.css', import.meta.url)), 'utf8')
  );
}

/**
 * Last-winning value of `prop` for `className`, honouring source order across
 * every block — grouped selectors included. Media-scoped blocks are skipped
 * unless `media` is given, so this models the base cascade rather than one
 * viewport.
 */
function effective(className: string, prop: string, media?: string): string | undefined {
  let winner: string | undefined;
  cssRoot().walkRules((rule) => {
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
      const transition = effective(control, 'transition');
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
      const filter = effective(icon, 'filter');
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
    const fabBottom = effective('fab', 'bottom', phone);
    const toastShift = effective('mapStatusLayer', 'transform', phone);

    expect(fabBottom).toContain('14px');
    // Clearing the FAB needs its 44px height + the 14px it floats above the
    // sheet + breathing room; 70px is what the stylesheet reserves.
    expect(toastShift).toContain('70px');
  });
});
