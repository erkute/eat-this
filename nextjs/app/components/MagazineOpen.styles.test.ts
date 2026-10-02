import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

/** Every declaration of `selector` outside any at-rule, merged in source order. */
function topLevelDeclarations(selector: string) {
  const css = readFileSync(fileURLToPath(new URL('./MagazineOpen.module.css', import.meta.url)));
  const root = postcss.parse(css.toString());
  const declarations: Record<string, string> = {};
  root.walkRules((rule) => {
    if (rule.parent?.type !== 'root') return;
    if (!rule.selector.split(',').some((part) => part.trim() === selector)) return;
    rule.walkDecls((declaration) => {
      declarations[declaration.prop] = declaration.value;
    });
  });
  return declarations;
}

describe('MagazineOpen CSS', () => {
  /* Dieselbe Regel wie beim Foto-Zoom (ZoomCurtain, am iPhone und im
     Simulator belegt): Safari nimmt für seine Leisten das fixierte Element,
     das es 4px innerhalb der Kante findet — deckend, über die ganze Breite,
     bündig an der Kante. Eine Kappe, die über die Kante hinausragte, nahm
     Safari nicht als Randelement. */
  it('caps both edges with the table colour, flush with the edge', () => {
    for (const cap of ['.capTop', '.capBottom']) {
      const decl = topLevelDeclarations(cap);
      expect(decl.position, cap).toBe('fixed');
      expect([decl.left, decl.right], cap).toEqual(['0', '0']);
      expect(decl['background-color'], cap).toBe('var(--table)');
    }
    expect(topLevelDeclarations('.capTop').top).toBe('0');
    expect(topLevelDeclarations('.capTop').height).toBe('max(6px, env(safe-area-inset-top, 0px))');
    expect(topLevelDeclarations('.capBottom').bottom).toBe('0');
    expect(topLevelDeclarations('.capBottom').height).toBe(
      'max(6px, env(safe-area-inset-bottom, 0px))'
    );
  });
});
