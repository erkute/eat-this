import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss, { type AtRule, type Root, type Rule } from 'postcss';
import { describe, expect, it } from 'vitest';

/* Die beiden Details im Map-Sheet haben je ein eigenes Modul, der Mount um sie
   herum ein drittes. */
const MODULES = {
  sheet: 'MapSheetDetail.module.css',
  restaurant: 'RestaurantDetail.module.css',
  mustEat: 'MustEatDetail.module.css',
} as const;

const roots = Object.fromEntries(
  Object.entries(MODULES).map(([key, name]) => {
    const path = fileURLToPath(new URL(`./${name}`, import.meta.url));
    return [key, postcss.parse(readFileSync(path, 'utf8'), { from: path })];
  })
) as Record<keyof typeof MODULES, Root>;
const restaurant = roots.restaurant;
const mustEat = roots.mustEat;

function isInside(rule: Rule, name: string, params: string) {
  for (let parent = rule.parent; parent && parent.type !== 'root'; parent = parent.parent) {
    if (parent.type === 'atrule' && parent.name === name && parent.params === params) return true;
  }
  return false;
}

/* Wo die Kaskade es verlangt, trägt ein Selektor noch den Wurzel-Präfix
   `.detail` — das ist Spezifität, keine andere Stelle. Die Verträge unten
   lesen ihn deshalb weg. */
const unscoped = (selector: string) => selector.replace(/^\.detail\s+/, '');

/**
 * Last-winning value of `prop` for a class across the WHOLE module, media
 * blocks included. Same instrument as mapCascade.test.ts: what a single block
 * says is worthless here, because `.fdText` alone is declared in several.
 */
function effective(root: Root, className: string, prop: string): string | undefined {
  let winner: string | undefined;
  root.walkRules((rule) => {
    const hits = rule.selectors.some((selector) =>
      new RegExp(`\\.${className}(?![\\w-])`).test(selector)
    );
    if (!hits) return;
    rule.walkDecls(prop, (declaration) => {
      winner = declaration.value;
    });
  });
  return winner;
}

function hasAnimationNone(root: Root, selectorPart: string) {
  let found = false;
  root.walkRules((rule) => {
    if (
      isInside(rule, 'media', '(prefers-reduced-motion: reduce)') &&
      rule.selector.includes(selectorPart) &&
      rule.nodes.some(
        (node) => node.type === 'decl' && node.prop === 'animation' && node.value === 'none'
      )
    ) {
      found = true;
    }
  });
  return found;
}

describe('Map sheet detail CSS contracts', () => {
  it('keeps the modules free of !important and global html/body prefixes', () => {
    const important: string[] = [];
    const prefixed: string[] = [];

    for (const [key, root] of Object.entries(roots)) {
      root.walkDecls((declaration) => {
        if (declaration.important) {
          important.push(`${key}: ${declaration.prop}: ${declaration.value}`);
        }
      });
      root.walkRules((rule) => {
        if (rule.parent?.type === 'atrule' && /(?:^|-)keyframes$/i.test(rule.parent.name)) return;
        for (const selector of postcss.list.comma(rule.selector)) {
          if (/^(?:html|body)\s/.test(selector)) prefixed.push(`${key}: ${selector}`);
        }
      });
    }

    expect(important).toEqual([]);
    expect(prefixed).toEqual([]);
  });

  it('defines and references every detail animation exactly once, in its own module', () => {
    const expected: Array<[Root, string]> = [
      [mustEat, 'mustEatTapShake'],
      [restaurant, 'rdSkelShimmer'],
      [mustEat, 'fdRevealReadyShake'],
      [mustEat, 'fdSwipeNudge'],
    ];

    for (const [root, name] of expected) {
      let definitions = 0;
      let references = 0;
      root.walkAtRules((atRule: AtRule) => {
        if (/(?:^|-)keyframes$/i.test(atRule.name) && atRule.params === name) definitions++;
      });
      root.walkDecls((declaration) => {
        if (declaration.prop.startsWith('animation') && declaration.value.includes(name)) {
          references++;
        }
      });
      expect(definitions, `${name} definition`).toBe(1);
      expect(references, `${name} reference`).toBeGreaterThan(0);
    }
  });

  it('disables every continuous or triggered detail animation for reduced motion', () => {
    expect(hasAnimationNone(mustEat, '.fdHeroLocked')).toBe(true);
    expect(hasAnimationNone(mustEat, '.fdHeroLocked.mustEatCardTapping')).toBe(true);
    expect(hasAnimationNone(mustEat, '.fdHeroLocked.mustEatCardCanUnlock')).toBe(true);
    expect(hasAnimationNone(restaurant, '.medishReady .medishPh img')).toBe(true);
    expect(hasAnimationNone(restaurant, '.rdBodySkel span')).toBe(true);
    // Bei reduzierter Bewegung übernimmt der Texthinweis den Wisch-Nudge.
    expect(hasAnimationNone(mustEat, '.fdTopCardHint')).toBe(true);
  });

  it('keeps the in-range Must Eat card shake fast and high-amplitude', () => {
    let animation = '';
    let keyframes = '';

    mustEat.walkRules((rule) => {
      if (unscoped(rule.selector) !== '.fdHeroLocked.mustEatCardCanUnlock') return;
      if (isInside(rule, 'media', '(prefers-reduced-motion: reduce)')) return;
      rule.walkDecls('animation', (declaration) => {
        animation = declaration.value;
      });
    });
    mustEat.walkAtRules((atRule) => {
      if (atRule.name === 'keyframes' && atRule.params === 'fdRevealReadyShake') {
        keyframes = atRule.toString();
      }
    });

    expect(animation).toContain('0.42s');
    expect(keyframes).toContain('rotate(-8.4deg)');
    expect(keyframes).toContain('rotate(4.8deg)');
    expect(keyframes).toContain('* -7px');
    expect(keyframes).toContain('* 7px');
  });

  it('keeps the whole Must Eat panel on the brand display face', () => {
    /*
     * Das Panel spricht durchgehend in der Markenschrift: Gerichtsname,
     * Zustands-Headline, der Zustands-Satz darunter und die
     * Gerichtsbeschreibung.
     *
     * Effektive Werte, nicht Einzelblöcke: `.fdText` allein wird in mehreren
     * Blöcken deklariert, einige davon in Media-Queries.
     */
    for (const brand of ['fdName', 'fdProximitySub', 'fdText']) {
      const family = effective(mustEat, brand, 'font-family');
      expect(family, `.${brand} hat keine effektive font-family`).toBeDefined();
      expect(
        family!.includes('et-font-display'),
        `.${brand} hat die Markenschrift verloren — effektiv: ${family}`
      ).toBe(true);
    }
  });

  it('keeps narrow-desktop Must Eat copy out of fixed-height clipping', () => {
    const media = '(min-width: 768px) and (max-width: 1023.98px)';
    const declarations = new Map<string, Record<string, string>>();

    mustEat.walkRules((rule) => {
      if (!isInside(rule, 'media', media)) return;
      const selector = unscoped(rule.selector);
      if (selector !== '.fdMid.fdMidLocked' && selector !== '.scroll') return;

      declarations.set(
        selector,
        Object.fromEntries(
          rule.nodes.filter((node) => node.type === 'decl').map((node) => [node.prop, node.value])
        )
      );
    });

    // Kein eigener Namens-Slot für den verdeckten Zustand, sonst spränge die
    // Copy beim Aufdecken (dort steht der Gerichtsname im Slot).
    expect(declarations.get('.fdMid.fdMidLocked')).toBeUndefined();
    expect(declarations.get('.scroll')).toEqual(
      expect.objectContaining({ '--me-rest-slot': '128px' })
    );
  });

  it('reserves the complete proximity stack on short desktop rails', () => {
    const baseMedia = '(min-width: 1024px)';
    const shortMedia = '(min-width: 1024px) and (max-height: 760px)';
    const baseRules: Record<string, string>[] = [];
    const shortRules: Record<string, string>[] = [];

    mustEat.walkRules((rule) => {
      if (unscoped(rule.selector) !== '.scroll') return;

      const declarations = Object.fromEntries(
        rule.nodes.filter((node) => node.type === 'decl').map((node) => [node.prop, node.value])
      );

      if (isInside(rule, 'media', baseMedia)) baseRules.push(declarations);
      if (isInside(rule, 'media', shortMedia)) shortRules.push(declarations);
    });

    expect(baseRules).toContainEqual(
      expect.objectContaining({ '--me-mid-slot': 'clamp(196px, 24dvh, 212px)' })
    );
    expect(shortRules).toContainEqual(expect.objectContaining({ '--me-mid-slot': '196px' }));
  });

  it('klemmt die x-Achse des Telefon-Spot-Details ab', () => {
    /* Das Blaettern schiebt den Hero um eine volle Viewport-Breite. Die
       Telefonfassung des Spot-Details laeuft im Dokumentfluss; ohne Klemme in x
       wuerde das Dokument waehrend der Bewegung doppelt so breit, und iOS
       Safari zoege die Seite zusammen. Eine Kurzform `overflow: visible` risse
       die Klemme mit, deshalb steht hier der effektive Endwert. */
    const phone = '(max-width: 767.98px)';
    let x: string | undefined;
    let y: string | undefined;

    restaurant.walkRules((rule) => {
      if (!isInside(rule, 'media', phone)) return;
      if (!rule.selectors.some((selector) => /\.scroll(?![\w-])/.test(selector))) return;
      for (const node of rule.nodes) {
        if (node.type !== 'decl') continue;
        if (node.prop === 'overflow') {
          const [first, second] = postcss.list.space(node.value);
          x = first;
          y = second ?? first;
        }
        if (node.prop === 'overflow-x') x = node.value;
        if (node.prop === 'overflow-y') y = node.value;
      }
    });

    expect(x, 'keine overflow-Deklaration fuer den Telefon-Scrollport gefunden').toBeDefined();
    expect(['clip', 'hidden']).toContain(x);
    // `clip` statt `hidden`, und y bleibt sichtbar: nur so bleibt der
    // Dokumentfluss erhalten, an dem die iOS-URL-Leisten-Frostung haengt.
    expect(y).toBe('visible');
  });

  it('retains the responsive and Safari detail contracts', () => {
    const media = new Set<string>();
    const supports = new Set<string>();
    for (const root of Object.values(roots)) {
      root.walkAtRules((atRule) => {
        if (atRule.name === 'media') media.add(atRule.params);
        if (atRule.name === 'supports') supports.add(atRule.params);
      });
    }

    const expectedMedia = [
      '(max-width: 767.98px)',
      '(min-width: 700px) and (max-width: 1023.98px)',
      '(min-width: 1024px) and (max-height: 760px)',
      '(max-width: 380px), (max-height: 740px)',
    ];
    for (const query of expectedMedia) expect(media.has(query), query).toBe(true);
    expect(supports.has('(-webkit-touch-callout: none)')).toBe(true);
  });
});
