import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss, { type AtRule, type Rule } from 'postcss';
import { describe, expect, it } from 'vitest';

const cssPath = fileURLToPath(new URL('./AuthScreen.module.css', import.meta.url));
const root = postcss.parse(readFileSync(cssPath, 'utf8'), { from: cssPath });

/** Gewinnender Wert für den exakt geschriebenen Selektor, Media-Blöcke aussen
 *  vor — sonst gewinnt hier immer die `animation: none` aus dem
 *  reduced-motion-Block, und `.mark` fischte zusätzlich `.markInk` mit. */
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

describe('AuthScreen.module.css — die Wartescreens fürs An- und Abmelden', () => {
  /* Projektregel: Ein- und Ausblend-BEWEGUNG auf Brand-Flächen läuft über
     translate/scale/clip-path, nie über Opacity. */
  it('bewegt Deckfläche, Panel und Karten ohne Opacity', () => {
    for (const name of ['authRise', 'authVeilOut', 'authSink', 'authFanA', 'authCloseA']) {
      expect(keyframeProps(name), name).not.toContain('opacity');
      expect(keyframeProps(name).length, name).toBeGreaterThan(0);
    }
  });

  it('übernimmt Ink-Grund und Radius aus dem Onboarding', () => {
    expect(exact('.panel', 'background')).toBe('var(--et-home-ink, #15120e)');
    expect(exact('.panel', 'border-radius')).toBe('10px');
    expect(exact('.kicker', 'color')).toBe('var(--et-home-accent, #ffc600)');
  });

  it('hat für den Abbruch eine eigene Rückwärtsbewegung', () => {
    expect(exact('.leaving', 'animation')).toContain('authVeilOut');
    expect(exact('.leaving .panel', 'animation')).toContain('authSink');
  });

  /* Die Richtung steckt im Stapel: beim Anmelden geht der Fächer auf, beim
     Abmelden legt er sich zu. */
  it('fächert in beide Richtungen', () => {
    expect(exact('.opening img:nth-child(1)', 'animation')).toContain('authFanA');
    expect(exact('.closing img:nth-child(1)', 'animation')).toContain('authCloseA');
  });

  /* Die Punkte am Kicker sind die einzige Bewegung in der Schrift. Sie
     erscheinen über `scale`: Ein- und Ausblenden läuft auf Markenflächen nie
     über Transparenz. */
  it('blendet die Punkte über scale ein, nicht über Opacity', () => {
    expect(keyframeProps('authDot')).toContain('transform');
    expect(keyframeProps('authDot')).not.toContain('opacity');
    expect(exact('.dots i:nth-child(2)', 'animation-delay')).toBeDefined();
  });

  it('lässt bei reduzierter Bewegung nichts fächern, ziehen oder fahren', () => {
    let abgeschaltet: string[] = [];
    root.walkAtRules('media', (at: AtRule) => {
      if (!at.params.includes('prefers-reduced-motion')) return;
      at.walkRules((rule: Rule) => {
        rule.walkDecls('animation', (declaration) => {
          if (declaration.value === 'none') abgeschaltet = abgeschaltet.concat(rule.selectors);
        });
      });
    });
    for (const selector of ['.veil', '.panel', '.stack img', '.dots i']) {
      expect(
        abgeschaltet.map((s) => s.trim()),
        selector
      ).toContain(selector);
    }
  });
});
