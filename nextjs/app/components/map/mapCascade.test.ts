import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

/**
 * MapControls.module.css used to spread a single control over up to 15
 * grouped blocks, and two real bugs came out of not seeing, at any one place,
 * what a control ends up with:
 *   1. `.mapSearchBtn`'s `transition` shorthand listed only colour properties,
 *      so it JUMPED off-screen on the same trigger that made `.mapBurger`,
 *      which keeps its own `transition: transform`, glide.
 *   2. The icon halo was killed by a `filter: none` declared later in the
 *      file for an overlapping selector.
 * The file is one section per control now (27.09.2026), but these tests keep
 * pinning the *effective* values rather than any single block.
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
    // The three leave together on the tablet (full list, open detail). If one of them loses
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

  it('keeps search, burger and locate on their paper label', () => {
    // Since 22.10.2026 the glyphs stand on a white paper label (variant 3).
    // The shared transparent rules at the top of the file must not win, or a
    // bare glyph vanishes under a pin again.
    for (const control of ['mapSearchBtn', 'mapBurger', 'fab']) {
      const background = effective(CONTROLS, control, 'background');
      expect(
        background,
        `.${control} lost its paper label — effective background is "${background}"`
      ).toBe('#fff');
    }
  });

  it('pins the phone controls to the VISUAL viewport, not just the layout one', () => {
    /* iOS does not shrink the layout viewport when the keyboard opens — it
     * slides the visual viewport down inside it. `position: fixed` anchors to
     * the layout viewport, so a control at `top: 14px` rides straight out of
     * the visible area. Measured on an iPhone 16e (iOS 26.3): opening the map
     * search put `visualViewport.offsetTop` at 96 and the toolbar's client rect
     * top at -82 with no retreat in play — so the retreat animation was NOT what
     * hid it.
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

  it('keeps the panel disclosure on its own surface', () => {
    /* Die Lasche ist ein Papier-Etikett wie Lupe, Burger und Standort
     * (22.10.2026). Die gemeinsamen Regeln oben setzen `.fab, .panelToggle,
     * .mapSearchClear` auf `background: transparent` — gewinnt eine davon,
     * steht wieder ein nackter Pfeil am Kartenrand, den niemand findet. */
    const background = effective(CONTROLS, 'panelToggle', 'background');
    expect(background, `.panelToggle lost its surface — effective background is "${background}"`).toBe('#fff');
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

  it('floats the locate FAB off the sheet edge on phones', () => {
    /* Dieser Test sicherte die FAB gegen die Status-Leiste ab, die auf
       derselben Bandbreite lag und sie verdeckte. Die Leiste gibt es nicht
       mehr: die Meldung steht seit dem 30.08.2026 mittig in der zentralen
       Info-Karte (MapDataNotice → window.showNotice) und kann den Knopf
       nicht mehr treffen. Was zu sichern bleibt, ist die Lage der FAB. */
    const phone = '(max-width: 767.98px)';

    /* On phones the dock carries the position; the button rides inside it. */
    /* Sticky in the page, from the top: the bottom edge moves with Safari's
       toolbar, and a scroll timeline twitched when it did. */
    expect(effective(CONTROLS, 'locateDock', 'top', phone)).toBe('calc(var(--edge-top) - var(--edge-ride))');
    /* The edge line, shared with the map credit: 14px above the resting edge. */
    const layout = readFileSync(fileURLToPath(new URL('./MapLayout.module.css', import.meta.url)), 'utf8');
    expect(layout).toContain('--edge-top: calc(var(--frame-edge) - 58px)');
    expect(layout).toContain('--frame-edge: calc(100dvh - var(--phone-list-sheet-visible))');
    expect(layout).toContain('--frame-edge: var(--detail-map-peek)');
    expect(layout).not.toContain('--edge-bottom');
    expect(effective(CONTROLS, 'locateDock', 'position', phone)).toBe('sticky');
  });
});

describe('MapFilters cascade', () => {
  it('keeps the filter row on one line', () => {
    // Ansage 22.10.2026: the filters never wrap into a second row — the pills
    // narrow instead, and a long value ends in an ellipsis.
    expect(effective(FILTERS, 'filterChipRow', 'flex-wrap')).toBe('nowrap');
    expect(effective(FILTERS, 'filterChipLabel', 'white-space')).toBe('nowrap');
    expect(effective(FILTERS, 'filterChipLabel', 'text-overflow')).toBe('ellipsis');
  });

  it('never breaks a chip label mid-word', () => {
    // "Kreuz-berg". Wrapping at spaces is fine; splitting a word is not.
    expect(effective(FILTERS, 'filterChipLabel', 'overflow-wrap')).not.toBe('anywhere');
    expect(effective(FILTERS, 'filterChipLabel', 'word-break')).not.toBe('break-all');
    expect(effective(FILTERS, 'filterChipLabel', 'hyphens')).not.toBe('auto');
  });
});

describe('MapControls press state', () => {
  it('gives the bare icon controls no surface while pressed', () => {
    /* `.mapSearchBtn:active, .fab:active` still carried the paper-era
     * `background: var(--brand-action-deep)` — #15120e on Ink. Both controls
     * are plateless and square, so every tap flashed a black box around the
     * icon. The press is the 1px shift, nothing else. */
    const offenders: string[] = [];
    cssRoot(CONTROLS).walkRules((rule) => {
      const pressed = rule.selectors.filter((sel) =>
        /\.(fab|mapSearchBtn)(?![\w-])[^\s]*:active/.test(sel)
      );
      if (pressed.length === 0) return;
      rule.walkDecls(/^background/, (decl) => {
        offenders.push(`${pressed.join(', ')} { ${decl.prop}: ${decl.value} }`);
      });
    });
    expect(offenders).toEqual([]);
  });
});
