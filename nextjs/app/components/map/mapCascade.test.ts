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
const DETAILS = 'MapDetails.module.css';

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

  it('unfolds the locate label by geometry, never by fading it in', () => {
    /* A brand surface appearing on the map moves — it does not materialise
     * (CLAUDE.md). It must also actually MOVE: this shipped once as a
     * `0fr → 1fr` grid column, the usual animate-to-content-width trick, and
     * Chrome refused to create a transition for it at all in an auto-width
     * flex item — `getAnimations()` on the label came back empty on
     * production and the track stayed pinned at 0px, so the label was clipped
     * to nothing. `max-width` is the mechanism that survives; the fr trick is
     * documented for HEIGHTS, where the container has a definite inline size.
     * Assert the property by name so a well-meaning "cleanup" back to fr
     * fails here instead of on someone's phone. */
    const transition = effective(CONTROLS, 'fabLabel', 'transition');
    expect(transition, '.fabLabel has no effective transition').toBeDefined();
    expect(
      transition!.includes('max-width'),
      `.fabLabel must animate max-width — an fr track does not transition here. Got: ${transition}`
    ).toBe(true);
    expect(
      transition!.includes('grid-template-columns'),
      `.fabLabel must NOT go back to an fr track — Chrome creates no transition for it. Got: ${transition}`
    ).toBe(false);
    expect(
      transition!.includes('opacity'),
      `.fabLabel must not fade — brand surfaces move. Got: ${transition}`
    ).toBe(false);
  });

  it('drops the icon halo once the icon sits on its own plate', () => {
    /* The drop-shadow exists so the free-standing icon survives on top of a
     * yellow pin. On the ink pill the same filter is a white glow around a
     * yellow crosshair. Separate class on purpose, so the halo assertion above
     * keeps guarding the plate-less state. */
    expect(effective(CONTROLS, 'fabIconOnPlate', 'filter')).toBe('none');
  });

  it('pins the phone controls to the VISUAL viewport, not just the layout one', () => {
    /* iOS does not shrink the layout viewport when the keyboard opens — it
     * slides the visual viewport down inside it. `position: fixed` anchors to
     * the layout viewport, so a control at `top: 14px` rides straight out of
     * the visible area. Measured on an iPhone 16e (iOS 26.3): opening the map
     * search put `visualViewport.offsetTop` at 96 and the toolbar's client rect
     * top at -82, with `data-header-stuck` never set — so the retreat animation
     * was NOT what hid it.
     *
     * The three share one trigger and must share this too: if one of them loses
     * the offset it stays behind while the others follow, which is the same
     * class of drift that made them `fixed` in the first place.
     */
    const phone = '(max-width: 767.98px)';
    const tops = ['mapSearchBtn', 'mapBurger', 'mapSearchToolbar'].map((control) => {
      const position = effective(CONTROLS, control, 'position', phone);
      expect(position, `.${control} is no longer fixed on phones`).toBe('fixed');
      const top = effective(CONTROLS, control, 'top', phone);
      expect(top, `.${control} has no effective phone top`).toBeDefined();
      expect(
        top!.includes('--map-visual-offset-top'),
        `.${control} does not follow the visual viewport — it will leave the screen when the iOS keyboard opens. Got: ${top}`
      ).toBe(true);
      return top;
    });

    expect(
      new Set(tops).size,
      `the three top-corner controls must resolve to the SAME top or they drift apart: ${tops.join(' | ')}`
    ).toBe(1);
  });

  it('keeps the panel disclosure on its drop-shadow', () => {
    /* `filter: drop-shadow(...)` is declared once for four controls at a time:
     * `.mapSearchBtn, .mapBurger, .fab, .panelToggle`. The later `filter: none`
     * resets cover only the first three, so scripts/audit-css-cascade.mjs
     * reports that declaration as dead — three times, once per overridden
     * class. It is not dead: `.panelToggle` has no other `filter` anywhere in
     * the file, so removing it takes the shadow off the desktop panel handle.
     *
     * This is the trap that sinks a bulk prune: a grouped declaration is only
     * removable when it is dead for EVERY class its selector list produces.
     */
    const filter = effective(CONTROLS, 'panelToggle', 'filter');
    expect(filter, '.panelToggle has no effective filter').toBeDefined();
    expect(
      filter!.includes('drop-shadow'),
      `.panelToggle lost its shadow — effective filter is "${filter}"`
    ).toBe(true);
  });

  it('keeps the hover lift on the controls that are not overridden later', () => {
    /* Same shape as the case above, in the other direction. One
     * `@media (hover: hover)` rule lifts `.mapSearchBtn`, `.mapBurger` and
     * `.fab` by 2px; a later media-less rule re-declares the lift as 1px for
     * `.mapSearchBtn` ONLY. So the 2px is dead for the search button and live
     * for the other two, and the audit — which reports per class — flags it
     * under `.mapSearchBtn`.
     *
     * Verified on the real elements with CDP-forced `:hover`: burger and FAB
     * compute translateY(-2px), the search button translateY(-1px). Note that
     * these transitions run 240ms, so a computed style read one frame after
     * the state change still returns the OLD value.
     */
    for (const control of ['mapBurger', 'fab']) {
      expect(
        effective(CONTROLS, control, 'transform', '(hover: hover)'),
        `.${control} lost its hover lift — it is not covered by the later 1px override`
      ).toBe('translateY(-2px)');
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

/**
 * Does the rule that declares `prop: <value containing fragment>` still carry a
 * selector for `className`?
 *
 * For a declaration shared by several classes, `effective()` above is the wrong
 * instrument: it ignores selector context, so for `.rdActBtn { border }` it
 * reports the `0` from an unrelated context rather than the grouped `2px solid`
 * that actually paints the button. What needs pinning for those is structural —
 * the grouped declaration must keep serving the class that has no other source
 * for it.
 */
function groupedDeclarationServes(
  moduleName: string,
  prop: string,
  valueFragment: string,
  className: string
): boolean {
  let serves = false;
  cssRoot(moduleName).walkDecls(prop, (decl) => {
    if (!decl.value.includes(valueFragment)) return;
    const rule = decl.parent;
    if (!rule || rule.type !== 'rule') return;
    if (
      'selectors' in rule &&
      rule.selectors.some((sel) => new RegExp(`\\.${className}(?![\\w-])`).test(sel))
    ) {
      serves = true;
    }
  });
  return serves;
}

describe('MapDetails cascade', () => {
  /* Three declarations in this file are reported dead by
   * scripts/audit-css-cascade.mjs and are NOT: each is shared by several
   * classes and only overridden later for some of them. A bulk prune deletes
   * all three. Each case below names the class that has no other source for the
   * value, which is what makes the declaration load-bearing.
   *
   * scripts/cascade/triage.mjs is the tool that tells these apart — it asks
   * whether a declaration is dead for EVERY class and context its rule
   * produces, which is the question the audit does not answer.
   */
  const KEEPS: Array<[prop: string, fragment: string, className: string, why: string]> = [
    [
      'filter',
      'drop-shadow(0 6px 5px',
      'rdHeartToggle',
      'the reset after it only covers .rdCloseGlass',
    ],
    // .fdClose is deliberately NOT pinned here: it declares its own width
    // earlier in the file, so the grouped one is not its only source.
    ['width', '36px', 'rdCloseGlass', 'only .rdHeartToggle gets a later width in that context'],
    [
      'background',
      '#fff',
      'rdPager',
      'the later transparent only covers .rdFacts and .rdMustSection',
    ],
    [
      'background',
      '#fff',
      'packPromo',
      'the later transparent only covers .rdFacts and .rdMustSection',
    ],
  ];

  for (const [prop, fragment, className, why] of KEEPS) {
    it(`keeps ${prop}: ${fragment} serving .${className}`, () => {
      expect(
        groupedDeclarationServes(DETAILS, prop, fragment, className),
        `.${className} lost "${prop}: ${fragment}" — ${why}, so removing it changes how .${className} renders`
      ).toBe(true);
    });
  }
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
