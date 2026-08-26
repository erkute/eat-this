import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss, { type AtRule, type Rule } from 'postcss';
import { describe, expect, it } from 'vitest';

const cssPath = fileURLToPath(new URL('./MapDetails.module.css', import.meta.url));
const root = postcss.parse(readFileSync(cssPath, 'utf8'), { from: cssPath });

function isInside(rule: Rule, name: string, params: string) {
  for (let parent = rule.parent; parent && parent.type !== 'root'; parent = parent.parent) {
    if (parent.type === 'atrule' && parent.name === name && parent.params === params) return true;
  }
  return false;
}

/**
 * Last-winning value of `prop` for a class across the WHOLE file, media blocks
 * included. Same instrument as mapCascade.test.ts: what a single block says is
 * worthless here, because `.fdText` alone is declared in three of them.
 */
function effective(className: string, prop: string): string | undefined {
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

function hasAnimationNone(selectorPart: string) {
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

describe('MapDetails CSS contracts', () => {
  it('keeps the module free of !important and global html/body prefixes', () => {
    const important: string[] = [];
    const prefixed: string[] = [];

    root.walkDecls((declaration) => {
      if (declaration.important) important.push(`${declaration.prop}: ${declaration.value}`);
    });
    root.walkRules((rule) => {
      if (rule.parent?.type === 'atrule' && /(?:^|-)keyframes$/i.test(rule.parent.name)) return;
      for (const selector of postcss.list.comma(rule.selector)) {
        if (/^(?:html|body)\s/.test(selector)) prefixed.push(selector);
      }
    });

    expect(important).toEqual([]);
    expect(prefixed).toEqual([]);
  });

  it('defines and references every detail animation exactly once', () => {
    const expected = [
      'mustEatTapShake',
      'rdSkelShimmer',
      'fdNameMagicReveal',
      'fdNameMagicSweep',
      'fdRevealReadyShake',
      'fdSwipeNudge',
    ];
    const definitions = new Map<string, number>();
    const references = new Map<string, number>();

    root.walkAtRules((atRule: AtRule) => {
      if (/(?:^|-)keyframes$/i.test(atRule.name)) {
        definitions.set(atRule.params, (definitions.get(atRule.params) ?? 0) + 1);
      }
    });
    root.walkDecls((declaration) => {
      if (!declaration.prop.startsWith('animation')) return;
      for (const name of expected) {
        if (declaration.value.includes(name)) references.set(name, (references.get(name) ?? 0) + 1);
      }
    });

    for (const name of expected) {
      expect(definitions.get(name), `${name} definition`).toBe(1);
      expect(references.get(name), `${name} reference`).toBeGreaterThan(0);
    }
  });

  it('disables every continuous or triggered detail animation for reduced motion', () => {
    expect(hasAnimationNone('.fdHeroLocked')).toBe(true);
    expect(hasAnimationNone('.fdHeroLocked.mustEatCardTapping')).toBe(true);
    expect(hasAnimationNone('.fdHeroLocked.mustEatCardCanUnlock')).toBe(true);
    expect(hasAnimationNone('.fdNameText.fdNameUnblurring')).toBe(true);
    expect(hasAnimationNone('.fdNameText.fdNameUnblurring::after')).toBe(true);
    expect(hasAnimationNone('.rdBodySkel span')).toBe(true);
    // Der einmalige Wisch-Nudge ersetzt auf dem Phone die Pager-Tasten. Bei
    // reduzierter Bewegung darf er nicht laufen — dort tritt die Textfassung
    // (.fdSwipeHint) an seine Stelle.
    expect(hasAnimationNone('.fdTopCardHint')).toBe(true);
  });

  it('keeps the in-range Must Eat card shake fast and high-amplitude', () => {
    let animation = '';
    let keyframes = '';

    root.walkRules((rule) => {
      if (rule.selector !== '.detailV13MustEat .fdHeroLocked.mustEatCardCanUnlock') return;
      if (isInside(rule, 'media', '(prefers-reduced-motion: reduce)')) return;
      rule.walkDecls('animation', (declaration) => {
        animation = declaration.value;
      });
    });
    root.walkAtRules((atRule) => {
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
    /* Das Panel spricht durchgehend in Providence: Gerichtsname, Zustands-
     * Headline, der Zustands-Satz darunter UND die Gerichtsbeschreibung. Ein
     * DM-Sans-Block mittendrin las sich wie ein Fremdkörper.
     *
     * Effektive Werte, nicht Einzelblöcke: `.fdText` allein wird in mehreren
     * Blöcken deklariert, einige davon in Media-Queries. */
    for (const brand of ['fdName', 'fdProximityHead', 'fdProximitySub', 'fdText']) {
      const family = effective(brand, 'font-family');
      expect(family, `.${brand} hat keine effektive font-family`).toBeDefined();
      expect(
        family!.includes('providence') || family!.includes('et-font-display'),
        `.${brand} hat die Markenschrift verloren — effektiv: ${family}`
      ).toBe(true);
    }
  });

  it('keeps narrow-desktop Must Eat copy out of fixed-height clipping', () => {
    const media = '(min-width: 768px) and (max-width: 1023.98px)';
    const declarations = new Map<string, Record<string, string>>();

    root.walkRules((rule) => {
      if (!isInside(rule, 'media', media)) return;
      if (
        rule.selector !== '.detailV13MustEat .fdMid.fdMidLocked' &&
        rule.selector !== '.detailV13MustEat .detailV13Scroll'
      )
        return;

      declarations.set(
        rule.selector,
        Object.fromEntries(
          rule.nodes.filter((node) => node.type === 'decl').map((node) => [node.prop, node.value])
        )
      );
    });

    // Kein eigener Namens-Slot mehr für den verdeckten Zustand: er ließ die
    // Copy beim Aufdecken springen (dort steht der Gerichtsname im Slot).
    expect(declarations.get('.detailV13MustEat .fdMid.fdMidLocked')).toBeUndefined();
    expect(declarations.get('.detailV13MustEat .detailV13Scroll')).toEqual(
      expect.objectContaining({ '--me-rest-slot': '128px' })
    );
  });

  it('reserves the complete proximity stack on short desktop rails', () => {
    const baseMedia = '(min-width: 1024px)';
    const shortMedia = '(min-width: 1024px) and (max-height: 760px)';
    const baseRules: Record<string, string>[] = [];
    const shortRules: Record<string, string>[] = [];

    root.walkRules((rule) => {
      if (rule.selector !== '.detailV13MustEat .detailV13Scroll') return;

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

  it('retains the responsive and Safari detail contracts', () => {
    const media = new Set<string>();
    const supports = new Set<string>();
    root.walkAtRules((atRule) => {
      if (atRule.name === 'media') media.add(atRule.params);
      if (atRule.name === 'supports') supports.add(atRule.params);
    });

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

describe('unlock reveal', () => {
  const rules: Rule[] = [];
  root.walkRules((rule) => {
    if (rule.selectors.some((s) => /\.detailV13Unlocked(?![\w-])/.test(s))) rules.push(rule);
  });

  /** Rules that actually START the animation — the `animation-delay` stagger
   *  rules are excluded, they only shift a timing on elements that have one. */
  function startsAnimation(rule: Rule): boolean {
    let starts = false;
    rule.walkDecls('animation', (declaration) => {
      if (declaration.value !== 'none') starts = true;
    });
    return starts;
  }

  it('spares the hero — it is the same photo in both sheets and holds the moment together', () => {
    /* If the hero unrolled too, the beat would read as "a new sheet opened".
       Staying put is what makes it "this one carries on". */
    const animated = rules.filter(startsAnimation);
    expect(animated.length).toBeGreaterThan(0);
    for (const rule of animated) {
      for (const selector of rule.selectors) {
        expect(selector).toContain(':not([data-detail-hero])');
      }
    }
  });

  it('moves by clip-path and translate, never by opacity', () => {
    // Projektregel: keine Opacity-Fades für Ein-/Ausblend-Bewegung auf
    // Brand-Flächen.
    let frames = 0;
    root.walkAtRules('keyframes', (at: AtRule) => {
      if (!/rdUnroll/.test(at.params)) return;
      frames++;
      at.walkDecls((declaration) => {
        expect(declaration.prop).not.toBe('opacity');
        expect(['clip-path', 'transform']).toContain(declaration.prop);
      });
    });
    expect(frames).toBe(1);
  });

  it('leaves no clip-path behind once it has played', () => {
    /* `forwards`/`both` would keep clipping after the last frame and cut off
       the gallery lightbox and everything else that overflows. */
    for (const rule of rules.filter(startsAnimation)) {
      rule.walkDecls('animation', (declaration) => {
        expect(declaration.value).toContain('backwards');
        expect(declaration.value).not.toMatch(/\bforwards\b|\bboth\b/);
      });
    }
  });

  it('runs as a curtain down the page, not as one flash', () => {
    /* Der erste Versuch deckelte den Versatz bei 170ms — fast alle Blöcke
       kamen gleichzeitig, und das las sich als Flackern statt als Bewegung
       (User, 26.08.2026). Jeder Block braucht seinen eigenen Platz in der
       Reihe, sonst legt sich der Artikel nicht der Reihe nach frei. */
    const delays: number[] = [];
    for (const rule of rules) {
      rule.walkDecls('animation-delay', (declaration) => {
        delays.push(parseFloat(declaration.value));
      });
    }
    expect(delays.length).toBeGreaterThanOrEqual(10);
    // Streng monoton: kein zweiter Block teilt sich einen Zeitpunkt.
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThan(delays[i - 1]);
    }
    // Und der Weg nach unten dauert länger als ein einzelner Wisch.
    expect(delays[delays.length - 1]).toBeGreaterThan(700);
  });

  it('holds still for readers who asked for less motion', () => {
    const reduced = rules.filter((r) => isInside(r, 'media', '(prefers-reduced-motion: reduce)'));
    expect(reduced.length).toBeGreaterThan(0);
    expect(reduced.some((r) => r.toString().includes('animation: none'))).toBe(true);
  });
});
