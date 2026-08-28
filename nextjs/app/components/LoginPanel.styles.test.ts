import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss, { type AtRule, type Rule } from 'postcss';
import { describe, expect, it } from 'vitest';

const cssPath = fileURLToPath(new URL('./LoginPanel.module.css', import.meta.url));
const root = postcss.parse(readFileSync(cssPath, 'utf8'), { from: cssPath });

/** Letzter gewinnender Wert einer Eigenschaft für einen Selektor — nur aus den
 *  Basisregeln. Media-Blöcke bleiben aussen vor, sonst gewinnt hier immer die
 *  `animation: none` aus dem reduced-motion-Block und der Test misst am Ziel
 *  vorbei. */
function effective(selectorPart: string, prop: string): string | undefined {
  let winner: string | undefined;
  root.walkRules((rule: Rule) => {
    if (rule.parent && rule.parent.type === 'atrule') return;
    if (!rule.selectors.some((selector) => selector.includes(selectorPart))) return;
    rule.walkDecls(prop, (declaration) => {
      winner = declaration.value;
    });
  });
  return winner;
}

/** Alle Deklarationen einer @keyframes-Regel, flach. */
function keyframeProps(name: string): string[] {
  const props: string[] = [];
  root.walkAtRules('keyframes', (at: AtRule) => {
    if (at.params !== name) return;
    at.walkDecls((declaration) => {
      props.push(declaration.prop);
    });
  });
  return props;
}

/** Wie `effective`, aber auf den exakt geschriebenen Selektor. `.loadingOverlayLeaving`
 *  steckt als Teilstring auch in `.loadingOverlayLeaving .loadingPanel`; ohne
 *  diese Trennung misst man die Kindregel. */
function exact(selector: string, prop: string): string | undefined {
  let winner: string | undefined;
  root.walkRules((rule: Rule) => {
    if (rule.parent && rule.parent.type === 'atrule') return;
    if (!rule.selectors.map((s) => s.trim()).includes(selector)) return;
    rule.walkDecls(prop, (declaration) => {
      winner = declaration.value;
    });
  });
  return winner;
}

describe('LoginPanel.module.css — der Anmelde-Ladezustand', () => {
  /* Projektregel: Ein- und Ausblend-BEWEGUNG auf Brand-Flächen läuft über
     translate/scale/clip-path, nie über Opacity. Das Panel ist eine solche
     Fläche — weisses Papier, Ink-Rahmen, Providence. */
  it('bewegt Deckfläche und Panel ohne Opacity', () => {
    for (const name of ['loginVeilIn', 'loginVeilOut', 'loginPanelIn', 'loginPanelOut']) {
      expect(keyframeProps(name), name).not.toContain('opacity');
      expect(keyframeProps(name).length, name).toBeGreaterThan(0);
    }
  });

  it('zieht die Deckfläche per clip-path auf und wieder zu', () => {
    expect(keyframeProps('loginVeilIn')).toContain('clip-path');
    expect(keyframeProps('loginVeilOut')).toContain('clip-path');
  });

  /* Der Abbruch ist der Grund für die zweite Richtung: wer das Google-Fenster
     zumacht, soll das Panel zurückfahren sehen statt es wegblinken. */
  it('hat für den Abbruch eine eigene Ausfahrt', () => {
    expect(exact('.loadingOverlayLeaving', 'animation')).toContain('loginVeilOut');
    expect(exact('.loadingOverlayLeaving .loadingPanel', 'animation')).toContain('loginPanelOut');
  });

  /* Versetzter Vollton statt Weichzeichner — Print-Kante, keine Material-Optik.
     Ein Blur-Wert an dritter Stelle wäre der Rückfall dorthin. */
  it('setzt einen harten, versetzten Schatten in Akzentgelb', () => {
    const shadow = effective('.loadingPanel', 'box-shadow');
    expect(shadow).toBeDefined();
    expect(shadow).toContain('var(--et-home-accent)');
    expect(shadow).toMatch(/^\d+px \d+px 0 /);
  });

  it('lässt bei reduzierter Bewegung nichts springen und nichts fahren', () => {
    let abgeschaltet: string[] = [];
    root.walkAtRules('media', (at: AtRule) => {
      if (!at.params.includes('prefers-reduced-motion')) return;
      at.walkRules((rule: Rule) => {
        rule.walkDecls('animation', (declaration) => {
          if (declaration.value === 'none') abgeschaltet = abgeschaltet.concat(rule.selectors);
        });
      });
    });
    for (const selector of ['.loadingOverlay', '.loadingPanel', '.hopBlock']) {
      expect(
        abgeschaltet.map((s) => s.trim()),
        selector
      ).toContain(selector);
    }
  });

  it('führt die drei Blöcke versetzt, damit eine Welle daraus wird', () => {
    expect(effective('.hopBlock:nth-child(2)', 'animation-delay')).toBeDefined();
    expect(effective('.hopBlock:nth-child(3)', 'animation-delay')).toBeDefined();
  });
});
