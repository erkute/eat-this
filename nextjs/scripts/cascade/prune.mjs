// Remove declarations that triage.mjs reports as dead for EVERY class and
// context their rule produces, then clean up rules and at-rules left empty.
//
//   node scripts/cascade/prune.mjs <module.css> [--exclude-class=a,b] [--write]
//
// Without --write it only prints what it would do. Nothing here decides what is
// safe: triage.mjs decides, --exclude-class carves out classes the
// computed-style sweep cannot reach (never delete what the diff cannot cover),
// and the sweep must then show 0 differences. If it does not, this tool is not
// the authority — the measurement is.
//
// Rules that also hold a COMMENT are reported separately: the comment carries
// reasoning that may outlive the declaration, so those want a human look.
import { readFileSync, writeFileSync } from 'node:fs';
import postcss from 'postcss';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const write = args.includes('--write');
const exclude = new Set(
  (args.find((a) => a.startsWith('--exclude-class=')) ?? '')
    .split('=')[1]
    ?.split(',')
    .filter(Boolean) ?? []
);

// triage.mjs is the single source of truth for what is dead
const triage = fileURLToPath(new URL('./triage.mjs', import.meta.url));
const report = execFileSync(process.execPath, [triage, file], { encoding: 'utf8' });
const section = report.slice(
  report.indexOf('── REMOVABLE, by line'),
  report.indexOf('── KEEP') >= 0 ? report.indexOf('── KEEP') : undefined
);
const targets = [];
for (const line of section.split('\n')) {
  const m = /^\s+(\d+)\s+([\w-]+):\s(.*?)\s{3}\[([\w,]+)\]/.exec(line);
  if (!m) continue;
  targets.push({ line: Number(m[1]), prop: m[2], classes: m[4].split(',') });
}

const skipped = targets.filter((t) => t.classes.some((c) => exclude.has(c)));
const doomed = targets.filter((t) => !t.classes.some((c) => exclude.has(c)));
const wanted = new Set(doomed.map((t) => `${t.line}:${t.prop}`));

const css = readFileSync(file, 'utf8');
const ast = postcss.parse(css);
let removedDecls = 0;
const emptied = [];
const emptiedWithComment = [];

ast.walkDecls((decl) => {
  const id = `${decl.source?.start?.line}:${decl.prop}`;
  if (!wanted.has(id)) return;
  decl.remove();
  removedDecls++;
});

// a rule with no declarations left is dead weight; same for an at-rule left empty
let changed = true;
while (changed) {
  changed = false;
  ast.walk((node) => {
    if (node.type !== 'rule' && node.type !== 'atrule') return;
    const kids = node.nodes ?? [];
    const hasDecl = kids.some((k) => k.type === 'decl');
    const hasRule = kids.some((k) => k.type === 'rule' || k.type === 'atrule');
    if (hasDecl || hasRule) return;
    const comments = kids.filter((k) => k.type === 'comment');
    const label = node.type === 'rule' ? node.selector : `@${node.name} ${node.params}`;
    (comments.length ? emptiedWithComment : emptied).push(
      `${node.source?.start?.line}  ${label.replace(/\s+/g, ' ').slice(0, 90)}`
    );
    node.remove();
    changed = true;
  });
}

console.log(`${file}`);
console.log(`  removable declarations reported : ${targets.length}`);
console.log(
  `  skipped (excluded class)        : ${skipped.length}` +
    (skipped.length ? `  → ${skipped.map((s) => s.line + ':' + s.prop).join(' ')}` : '')
);
console.log(`  declarations removed           : ${removedDecls}`);
console.log(`  rules/at-rules left empty      : ${emptied.length}`);
for (const e of emptied) console.log(`      ${e}`);
if (emptiedWithComment.length) {
  console.log(
    `  ⚠ emptied but held a COMMENT — review these by hand: ${emptiedWithComment.length}`
  );
  for (const e of emptiedWithComment) console.log(`      ${e}`);
}

if (write) {
  writeFileSync(file, ast.toString());
  console.log('\n  written.');
} else {
  console.log('\n  dry run — pass --write to apply.');
}
