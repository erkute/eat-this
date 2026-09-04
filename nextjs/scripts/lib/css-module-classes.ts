/* Findet `styles.foo`-Zugriffe, für die es in `foo.module.css` keine Klasse
 * gibt. Ein CSS-Modul ist zur Laufzeit ein Objekt; ein Zugriff auf einen
 * fehlenden Schlüssel ist `undefined`, und React lässt `className={undefined}`
 * kommentarlos ganz weg. Kein Fehler, keine Warnung — nur ein Element ohne
 * Stil. So verlor die geteilte Deck-Seite am 04.09.2026 ihr komplettes Layout.
 *
 * Bewusst textuell statt über einen echten Parser: die Zugriffe stehen im JSX
 * immer als `styles.klasse`, und ein Regex kostet keine Abhängigkeit. Dafür
 * gilt: dynamische Schlüssel (`styles[key]`, Template-Literale) sind hier
 * nicht entscheidbar und werden gemeldet, nicht verschwiegen.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import postcss from 'postcss';

export interface Finding {
  /** Quelldatei, relativ zu `nextjs/`. */
  source: string;
  line: number;
  /** Das Stylesheet, relativ zu `nextjs/`. */
  stylesheet: string;
  /** Der Bezeichner des Default-Imports, z. B. `styles`. */
  binding: string;
  className: string;
  kind: 'missing' | 'dynamic';
}

const SOURCE_EXTENSIONS = ['.ts', '.tsx'];

/** `.test.ts(x)` bleibt draußen: Tests fassen Klassennamen absichtlich als
 *  Strings an, und ein Test, der eine entfernte Klasse festnagelt, ist Absicht,
 *  kein Fund. */
const IGNORED_SUFFIXES = ['.test.ts', '.test.tsx', '.d.ts'];

const IGNORED_DIRECTORIES = new Set(['node_modules', '.git', '.next', '.next-verify', 'public']);

export function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return IGNORED_DIRECTORIES.has(entry.name) ? [] : sourceFiles(path);
    if (!SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) return [];
    if (IGNORED_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) return [];
    return [path];
  });
}

/**
 * Die Klassen, die ein CSS-Modul exportiert.
 *
 * Was in `:global(…)` steht, gehört der Seite und wird nicht exportiert — es
 * darf hier also nicht als vorhanden zählen. Umgekehrt zählt alles, was in
 * einem Selektor als lokale Klasse auftaucht, auch tief in Media-Queries oder
 * als `.a .b`: CSS Modules exportiert jede lokale Klasse des Selektors.
 */
export function exportedClassNames(css: string, from?: string): Set<string> {
  const names = new Set<string>();
  const root = postcss.parse(css, { from });

  root.walkRules((rule) => {
    for (const selector of rule.selectors) {
      // `:global(.x .y)` maskieren, ohne die Länge zu ändern, damit die
      // Klammern-Zählung darunter nicht durcheinandergerät.
      const local = maskGlobals(selector);
      for (const match of local.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) names.add(match[1]);
    }
  });

  // `composes: x from './y.css'` definiert selbst keine Klasse, aber die
  // komponierende Klasse steht ohnehin schon in ihrem eigenen Selektor.
  return names;
}

/** Ersetzt den Inhalt jedes `:global(…)` durch Leerzeichen. */
function maskGlobals(selector: string): string {
  const out = [...selector];
  const token = ':global(';
  for (let index = selector.indexOf(token); index !== -1; index = selector.indexOf(token, index)) {
    let depth = 1;
    let cursor = index + token.length;
    while (cursor < selector.length && depth > 0) {
      if (selector[cursor] === '(') depth++;
      else if (selector[cursor] === ')') depth--;
      if (depth > 0) out[cursor] = ' ';
      cursor++;
    }
    index = cursor;
  }
  return out.join('');
}

interface ModuleImport {
  binding: string;
  stylesheet: string;
}

/**
 * Default-Importe von `*.module.css` aus einer Quelldatei, mit aufgelöstem
 * Pfad. `@/` zeigt laut `tsconfig.json` auf `nextjs/`.
 */
export function moduleImports(source: string, sourcePath: string, rootDir: string): ModuleImport[] {
  const imports: ModuleImport[] = [];
  const pattern = /import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+\.module\.css)['"]/g;

  for (const match of source.matchAll(pattern)) {
    const [, binding, specifier] = match;
    const stylesheet = specifier.startsWith('@/')
      ? resolve(rootDir, specifier.slice(2))
      : resolve(dirname(sourcePath), specifier);
    imports.push({ binding, stylesheet });
  }
  return imports;
}

function lineOf(source: string, index: number): number {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor++) if (source[cursor] === '\n') line++;
  return line;
}

function posix(path: string): string {
  return path.split(sep).join('/');
}

/**
 * Überschreibt jeden Kommentar mit Leerzeichen — gleiche Länge, gleiche
 * Zeilenumbrüche, also bleiben alle Offsets und Zeilennummern gültig.
 *
 * Nötig, weil ein Kommentar, der einen Fund BESCHREIBT (»`styles.content` gibt
 * es nicht mehr«), sonst selbst als Fund gemeldet wird. Deshalb ein Scanner
 * und kein Regex: `//` in einem String (`'https://…'`) darf keinen
 * Zeilenkommentar öffnen. In Template-Literalen wird `${…}` weiter als Code
 * gelesen — genau dort steht `` `${styles.a} ${styles.b}` ``.
 */
export function stripComments(source: string): string {
  const out = [...source];
  const blank = (from: number, to: number) => {
    for (let i = from; i < to; i++) if (out[i] !== '\n') out[i] = ' ';
  };
  /** Stapel: 'code' | 'template'. `${` in einem Template legt 'code' obenauf. */
  const stack: ('code' | 'template')[] = ['code'];
  let braces = 0;
  let cursor = 0;

  while (cursor < source.length) {
    const here = source[cursor];
    const next = source[cursor + 1];

    if (stack[stack.length - 1] === 'template') {
      if (here === '\\') cursor += 2;
      else if (here === '`') {
        stack.pop();
        cursor++;
      } else if (here === '$' && next === '{') {
        stack.push('code');
        braces = 0;
        cursor += 2;
      } else cursor++;
      continue;
    }

    if (here === '/' && next === '/') {
      const end = source.indexOf('\n', cursor);
      blank(cursor, end === -1 ? source.length : end);
      cursor = end === -1 ? source.length : end;
    } else if (here === '/' && next === '*') {
      const end = source.indexOf('*/', cursor + 2);
      const stop = end === -1 ? source.length : end + 2;
      blank(cursor, stop);
      cursor = stop;
    } else if (here === "'" || here === '"') {
      cursor++;
      while (cursor < source.length && source[cursor] !== here && source[cursor] !== '\n') {
        cursor += source[cursor] === '\\' ? 2 : 1;
      }
      cursor++;
    } else if (here === '`') {
      stack.push('template');
      cursor++;
    } else {
      if (here === '{') braces++;
      if (here === '}') {
        if (braces === 0 && stack.length > 1) stack.pop();
        else braces--;
      }
      cursor++;
    }
  }

  return out.join('');
}

/** Prüft eine einzelne Quelldatei gegen die Stylesheets, die sie importiert. */
export function auditSource(sourcePath: string, rootDir: string): Finding[] {
  const raw = readFileSync(sourcePath, 'utf8');
  if (!raw.includes('.module.css')) return [];
  const source = stripComments(raw);

  const findings: Finding[] = [];

  for (const { binding, stylesheet } of moduleImports(source, sourcePath, rootDir)) {
    const exported = exportedClassNames(readFileSync(stylesheet, 'utf8'), stylesheet);
    const where = {
      source: posix(relative(rootDir, sourcePath)),
      stylesheet: posix(relative(rootDir, stylesheet)),
      binding,
    };
    const escaped = binding.replaceAll(/[$]/g, '\\$');

    // styles.foo / styles?.foo
    const dotted = new RegExp(`\\b${escaped}\\s*\\??\\.\\s*([A-Za-z_$][\\w$]*)`, 'g');
    for (const match of source.matchAll(dotted)) {
      const className = match[1];
      if (exported.has(className)) continue;
      findings.push({ ...where, className, kind: 'missing', line: lineOf(source, match.index) });
    }

    // styles['foo'], styles[`heroCard${i}`] — und alles, was gar nicht dasteht.
    const indexed = new RegExp(`\\b${escaped}\\s*\\??\\[([^\\]]*)\\]`, 'g');
    for (const match of source.matchAll(indexed)) {
      const key = match[1].trim();
      const line = lineOf(source, match.index);

      const quoted = /^(['"])(.*)\1$/.exec(key);
      if (quoted) {
        if (!exported.has(quoted[2]))
          findings.push({ ...where, className: quoted[2], kind: 'missing', line });
        continue;
      }

      /* Ein Template-Literal ist nur über seinen festen Anfang prüfbar:
         `heroCard${i}` verlangt, dass es überhaupt `heroCard…` gibt. Das
         fängt die Umbenennung, um die es hier geht — den Zahlenbereich
         dahinter kann nur die Laufzeit kennen. */
      const template = /^`([^`$]*)\$\{/.exec(key);
      if (template && template[1]) {
        const prefix = template[1];
        if (![...exported].some((name) => name.startsWith(prefix)))
          findings.push({ ...where, className: `${prefix}…`, kind: 'missing', line });
        continue;
      }

      findings.push({ ...where, className: key, kind: 'dynamic', line });
    }
  }

  return findings;
}

/** Prüft alle Quelldateien unter `rootDir`. */
export function auditCssModules(rootDir: string): Finding[] {
  return sourceFiles(rootDir)
    .flatMap((path) => auditSource(path, rootDir))
    .sort((a, b) => a.source.localeCompare(b.source) || a.line - b.line);
}

export function formatFinding(finding: Finding): string {
  const what =
    finding.kind === 'dynamic'
      ? `${finding.binding}[${finding.className}] ist dynamisch — von Hand prüfen`
      : `${finding.binding}.${finding.className} fehlt in ${finding.stylesheet}`;
  return `${finding.source}:${finding.line}  ${what}`;
}
