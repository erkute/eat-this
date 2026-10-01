import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss, { type AtRule } from 'postcss';
import { describe, expect, it } from 'vitest';

const cssPath = fileURLToPath(new URL('./MagazineGrid.module.css', import.meta.url));
const root = postcss.parse(readFileSync(cssPath, 'utf8'), { from: cssPath });

interface Env {
  phone: boolean;
  timelines: boolean;
}

/** Ob eine At-Regel in dieser Umgebung greift — nur die Bedingungen, die die
 *  Datei benutzt. Reduzierte Bewegung zählt wie keine Vorgabe. */
function applies(atRule: AtRule, env: Env): boolean {
  const params = atRule.params;
  if (atRule.name === 'media') {
    if (params.includes('max-width: 767.98px')) return env.phone;
    if (params.includes('min-width: 768px')) return !env.phone;
    return true;
  }
  if (atRule.name === 'supports' && params.includes('animation-timeline')) {
    return params.trim().startsWith('not') ? !env.timelines : env.timelines;
  }
  return true;
}

/** Letzter gewinnender Wert einer Eigenschaft für genau `.<className>`. */
function winning(className: string, prop: string, env: Env): string | undefined {
  let winner: string | undefined;
  root.walkRules((rule) => {
    if (!rule.selectors.some((s) => s.trim() === `.${className}`)) return;
    for (let parent = rule.parent; parent && parent.type === 'atrule'; parent = parent.parent) {
      if (!applies(parent as AtRule, env)) return;
    }
    rule.walkDecls(prop, (declaration) => {
      winner = declaration.value;
    });
  });
  return winner;
}

describe('„Auf dem Teller": Stapel und Safaris URL-Leiste', () => {
  /**
   * iOS 27 färbt die untere URL-Leiste deckend, sobald ein klebendes Element
   * die Unterkante berührt — im Simulator auch bei 84 % und 88 % Breite, die
   * 90-%-Regel aus dem WebKit-Quelltext greift dort nicht (01.10.2026). Am
   * Telefon mit Scroll-Timelines darf deshalb weder ein Cover noch die
   * Überschrift `sticky` sein; die Timeline hält sie fest.
   */
  it('hält Cover und Überschrift am Telefon per Timeline statt mit sticky', () => {
    const phone = { phone: true, timelines: true };
    for (const className of ['item', 'aside']) {
      expect(winning(className, 'position', phone), className).not.toBe('sticky');
      expect(winning(className, 'animation-timeline', phone), className).toBeTruthy();
    }
  });

  /**
   * Safari rechnet Scroll-Timelines im UI-Prozess nach und hatte dort nach
   * dem Einklappen der Leiste eine veraltete Höhe des Scroll-Containers:
   * Überschrift und Cover standen ~80px zu tief, obwohl die Seite selbst
   * richtig rechnete (Simulator, 01.10.2026). Ein unterer Inset von
   * `calc(100% - …)` macht das Fenster unabhängig von dieser Höhe.
   */
  it('rechnet die Timeline-Fenster unabhängig von der Höhe des Viewports', () => {
    const phone = { phone: true, timelines: true };
    for (const className of ['layout', 'stack']) {
      const inset = winning(className, 'view-timeline-inset', phone) ?? '';
      expect(inset, className).toMatch(/ calc\(100% - .+\)$/);
    }
  });

  it('klebt am Desktop und ohne Scroll-Timelines weiter', () => {
    expect(winning('item', 'position', { phone: false, timelines: true })).toBe('sticky');
    expect(winning('aside', 'position', { phone: false, timelines: true })).toBe('sticky');
    expect(winning('item', 'position', { phone: true, timelines: false })).toBe('sticky');
    expect(winning('aside', 'position', { phone: true, timelines: false })).toBe('sticky');
  });
});
