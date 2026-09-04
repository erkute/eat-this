import { describe, expect, it } from 'vitest';
import { exportedClassNames, moduleImports, stripComments } from './css-module-classes';

describe('exportedClassNames', () => {
  it('nimmt lokale Klassen aus jedem Selektor, auch tief und in Media-Queries', () => {
    const names = exportedClassNames(`
      .a { color: red }
      .b .c { color: red }
      @media (min-width: 700px) { .d { color: red } }
      .e:hover::before { content: '' }
      .f, .g > .h { color: red }
    `);
    expect([...names].sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  });

  it('zaehlt :global() nicht mit — das gehoert der Seite, nicht dem Modul', () => {
    const names = exportedClassNames(`
      :global(.hv-title) { color: red }
      .board :global(.hv-mk) { color: red }
      :global(.a .b) .local { color: red }
    `);
    expect([...names].sort()).toEqual(['board', 'local']);
  });
});

describe('moduleImports', () => {
  it('loest relative Pfade und den @/-Alias auf', () => {
    const source = [
      "import styles from './Foo.module.css';",
      "import deck from '@/app/x/Deck.module.css';",
      "import other from './not-a-module.css';",
    ].join('\n');
    const imports = moduleImports(source, '/root/app/components/Bar.tsx', '/root');
    expect(imports).toEqual([
      { binding: 'styles', stylesheet: '/root/app/components/Foo.module.css' },
      { binding: 'deck', stylesheet: '/root/app/x/Deck.module.css' },
    ]);
  });
});

describe('stripComments', () => {
  it('loescht Kommentare, laesst Laenge und Zeilen stehen', () => {
    const source = 'const a = 1; // styles.tot\nconst b = 2;';
    const stripped = stripComments(source);
    expect(stripped).toHaveLength(source.length);
    expect(stripped.split('\n')).toHaveLength(2);
    expect(stripped).not.toContain('styles.tot');
    expect(stripped).toContain('const b = 2;');
  });

  it('haelt // in einem String fuer keinen Kommentar', () => {
    const source = "const url = 'https://x.test'; const c = styles.echt;";
    expect(stripComments(source)).toContain('styles.echt');
  });

  it('liest ${…} in einem Template-Literal weiter als Code', () => {
    const source = 'const c = `a ${styles.echt} b`;';
    expect(stripComments(source)).toContain('styles.echt');
  });

  it('raeumt einen JSX-Blockkommentar weg', () => {
    const source = '<div />{/* styles.tot gab es nie */}<span />';
    const stripped = stripComments(source);
    expect(stripped).not.toContain('styles.tot');
    expect(stripped).toContain('<span />');
  });
});
