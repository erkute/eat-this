import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss, { type Rule } from 'postcss';
import { describe, expect, it } from 'vitest';

const cssPath = fileURLToPath(new URL('./GuideCrossLinks.module.css', import.meta.url));
const root = postcss.parse(readFileSync(cssPath, 'utf8'), { from: cssPath });

/** Letzter gewinnender Wert einer Eigenschaft für einen Selektor, Media-Blöcke
 *  eingeschlossen — dasselbe Instrument wie in MapDetails.styles.test.ts. */
function effective(selectorPart: string, prop: string): string | undefined {
  let winner: string | undefined;
  root.walkRules((rule: Rule) => {
    if (!rule.selectors.some((selector) => selector.includes(selectorPart))) return;
    rule.walkDecls(prop, (declaration) => {
      winner = declaration.value;
    });
  });
  return winner;
}

describe('GuideCrossLinks.module.css — Querverweis auf den Magazin-Guide', () => {
  // Der Block hat genau eine Aufgabe: sichtbar auf den Guide zeigen. Beim
  // ersten Anlauf standen hier nur text-decoration-color und -thickness — der
  // globale Link-Reset setzt `none`, beides lief ins Leere, und der Titel war
  // von Fließtext nicht zu unterscheiden. Die Kurzform allein reicht nicht.
  it('underlines the guide title link', () => {
    expect(effective('.title a', 'text-decoration')).toBe('underline');
  });

  it('keeps a visible focus ring on the guide title link', () => {
    expect(effective('.title a:focus-visible', 'outline')).toContain('solid');
  });

  // Die Linie darüber ist das, was den Block als Nachspann liest — dieselbe
  // Behandlung wie .faq auf den Bezirksseiten.
  it('separates the block with a rule above it', () => {
    expect(effective('.wrap', 'border-top')).toContain('2px solid');
  });

  // Der Block hängt an zwei Seiten mit verschiedenen lokalen Variablennamen
  // (--category-* gegen die des Bezirks). Griffe er auf eine davon zurück,
  // fiele die Farbe auf der anderen Seite auf den Default zurück.
  it('draws its colours from the shared home tokens, not a page-local set', () => {
    const css = readFileSync(cssPath, 'utf8');
    expect(css).not.toMatch(/var\(--category-/);
    expect(css).toMatch(/var\(--et-home-ink/);
  });
});
