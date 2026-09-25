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

describe('GuideCrossLinks.module.css — Artikel-Vorschau zum Magazin-Guide', () => {
  // Die ganze Karte ist der Link; ohne sichtbaren Fokus wüsste eine
  // Tastatur-Nutzerin nicht, welcher Guide gewählt ist.
  it('keeps a visible focus ring on the card', () => {
    expect(effective('.card:focus-visible', 'outline')).toContain('solid');
  });

  // Der Link muss auch ohne Unterstreichung als Link lesbar sein: Hover hebt
  // die Headline gelb hervor und zoomt das Foto.
  it('marks the card on hover', () => {
    expect(effective('.card:hover .title', 'color')).toContain('--et-home-accent');
  });

  // Ein einzelner Guide stünde im Dreier-Raster verloren in der Ecke.
  it('lays a single guide out side by side from tablet up', () => {
    expect(effective("[data-count='1'] .card", 'grid-template-columns')).toBeDefined();
  });

  // Der Block hängt an zwei Seiten mit verschiedenen lokalen Variablennamen.
  // Griffe er auf eine davon zurück, fiele die Farbe auf der anderen Seite auf
  // den Default zurück.
  it('draws its colours from the shared home tokens, not a page-local set', () => {
    const css = readFileSync(cssPath, 'utf8');
    expect(css).not.toMatch(/var\(--(category|hub)-/);
    expect(css).toMatch(/var\(--et-home-/);
    expect(css).toMatch(/var\(--et-ink-/);
  });
});
