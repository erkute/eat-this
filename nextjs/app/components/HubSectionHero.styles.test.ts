import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

const cssPath = fileURLToPath(new URL('./HubSection.module.css', import.meta.url));
const source = readFileSync(cssPath, 'utf8');
const root = postcss.parse(source, { from: cssPath });

describe('Der Flug der Wortmarke', () => {
  /**
   * Solange die Marke fliegt, darf das Original im Aufmacher nicht mitzusehen
   * sein — sonst stehen zwei Wortmarken gleichzeitig auf der Seite, und beim
   * Scrollen schiebt sich die zweite hinter dem Header vorbei.
   *
   * Der Test prüft, dass die Regel am **Attribut** hängt und nicht an einer
   * Klasse: HeroMarkFlight hat das Original früher per `classList.add`
   * versteckt. HubHeroCopy hängt aber an `useAuth`, und sobald der
   * Anmeldezustand steht, rendert React neu und schreibt `className` frisch —
   * die Klasse war damit weg, und genau so kam das zweite Logo zurück. Ein
   * Attribut am <html> überlebt jedes Rendern.
   */
  it('versteckt das Original im Aufmacher über html[data-hero-flight]', () => {
    const selectors: string[] = [];
    root.walkRules((rule) => {
      rule.walkDecls('visibility', (declaration) => {
        if (declaration.value === 'hidden') selectors.push(rule.selector);
      });
    });

    const guard = selectors.find((s) => /heroMark/.test(s));
    expect(guard, 'keine visibility:hidden-Regel für .heroMark gefunden').toBeDefined();
    expect(guard).toContain("data-hero-flight='on'");
    expect(guard).toContain('html');
  });
});
