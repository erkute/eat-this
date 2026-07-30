// Per-DECLARATION verdict for a CSS module, mirroring audit-css-cascade.mjs's
// cascade model but answering the question the audit does not:
//
//   is this declaration dead for EVERY class and context its rule produces?
//
// The audit reports per class, so a grouped declaration shows up as dead as
// soon as it is dead for one of them. Deleting on that basis is what broke the
// earlier flattening attempt, and what would have taken the drop-shadow off
// .panelToggle in MapControls.
//
//   node triage.mjs <module.css>
import { readFileSync } from 'node:fs';
import postcss from 'postcss';

const file = process.argv[2];
const ast = postcss.parse(readFileSync(file, 'utf8'));

function specificity(sel) {
  let s = sel.replaceAll(/:global\(([^)]*)\)/g, '$1');
  s = s.replaceAll(/::[\w-]+/g, '');
  let a = 0,
    b = 0,
    c = 0;
  for (const _ of s.matchAll(/#[\w-]+/g)) a++;
  for (const _ of s.matchAll(/\.[\w-]+/g)) b++;
  for (const _ of s.matchAll(/\[[^\]]*\]/g)) b++;
  for (const _ of s.matchAll(/:(?!:)[\w-]+/g)) b++;
  for (const _ of s.matchAll(/(^|[\s>+~])([a-z][\w-]*)/gi)) c++;
  return [a, b, c];
}
const cmp = (x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
const RESET = /^(none|0|0px|normal|auto|unset|initial|transparent|revert)$/i;

// entries[(cls, prop)][contextKey] = [entry...]
const map = new Map();
const decls = new Map(); // declId -> { line, prop, value, selectors, participations: [] }
let order = 0;

ast.walkRules((rule) => {
  const atRules = [];
  let parent = rule.parent;
  while (parent && parent.type !== 'root') {
    if (parent.type === 'atrule') atRules.push(`@${parent.name} ${parent.params}`);
    parent = parent.parent;
  }
  const media = atRules.filter((a) => a.startsWith('@media')).join(' ');

  rule.walkDecls((decl) => {
    const declId = `${decl.source?.start?.line}:${decl.prop}`;
    if (!decls.has(declId)) {
      decls.set(declId, {
        line: decl.source?.start?.line,
        prop: decl.prop,
        value: decl.value.trim(),
        media,
        selectors: rule.selectors,
        participations: [],
      });
    }
    const ord = order++;
    for (const sel of rule.selectors) {
      const parts = sel.split(/\s+|>|\+|~/).filter(Boolean);
      const subject = parts[parts.length - 1] ?? '';
      const classes = [...subject.matchAll(/(?<!:global\()\.([\w-]+)/g)].map((m) => m[1]);
      if (!classes.length) continue;
      const spec = specificity(sel);
      for (const cls of classes) {
        const contextKey = sel.replaceAll(new RegExp(`\\.${cls}(?![\\w-])`, 'g'), '&');
        const key = `${cls}|${decl.prop}`;
        if (!map.has(key)) map.set(key, new Map());
        const ctxs = map.get(key);
        if (!ctxs.has(contextKey)) ctxs.set(contextKey, []);
        const entry = {
          declId,
          cls,
          prop: decl.prop,
          value: decl.value.trim(),
          media,
          contextKey,
          spec,
          order: ord,
          line: decl.source?.start?.line,
          important: decl.important ?? false,
          dead: false,
          why: null,
        };
        ctxs.get(contextKey).push(entry);
        decls.get(declId).participations.push(entry);
      }
    }
  });
});

// mark dead entries, same two rules the audit uses
for (const [, ctxs] of map) {
  for (const [, entries] of ctxs) {
    const plain = entries.filter((e) => !e.media);
    const scoped = entries.filter((e) => e.media);

    for (const s of scoped) {
      const later = plain.find(
        (e) => e.order > s.order && cmp(e.spec, s.spec) >= 0 && !s.important
      );
      if (later && later.value !== s.value) {
        s.dead = true;
        s.why = `media rule voided by later plain line ${later.line} "${later.value}"`;
      }
    }

    if (plain.length >= 2) {
      const last = plain[plain.length - 1];
      if (RESET.test(last.value)) {
        for (const e of plain.slice(0, -1)) {
          if (!RESET.test(e.value) && cmp(last.spec, e.spec) >= 0 && !e.important) {
            e.dead = true;
            e.why = `reset at line ${last.line} "${last.value}" wins`;
          }
        }
      }
    }
  }
}

const removable = [];
const kept = [];
for (const [declId, d] of decls) {
  if (!d.participations.length) continue;
  const dead = d.participations.filter((p) => p.dead);
  if (!dead.length) continue; // never flagged at all
  const alive = d.participations.filter((p) => !p.dead);
  const classes = [...new Set(d.participations.map((p) => p.cls))];
  if (!alive.length) {
    removable.push({ ...d, declId, classes, why: dead[0].why });
  } else {
    kept.push({
      ...d,
      declId,
      classes,
      deadFor: [
        ...new Set(dead.map((p) => p.cls + (p.contextKey === '&' ? '' : ` in ${p.contextKey}`))),
      ],
      aliveFor: [
        ...new Set(alive.map((p) => p.cls + (p.contextKey === '&' ? '' : ` in ${p.contextKey}`))),
      ],
    });
  }
}

console.log(`${file}`);
console.log(`  flagged declarations: ${removable.length + kept.length}`);
console.log(`  REMOVABLE (dead for every class + context): ${removable.length}`);
console.log(`  KEEP (dead for some, live for others): ${kept.length}\n`);

console.log('── REMOVABLE, by line');
for (const r of removable.sort((a, b) => a.line - b.line)) {
  console.log(
    `  ${String(r.line).padStart(5)}  ${r.prop}: ${r.value.replace(/\s+/g, ' ').slice(0, 60)}` +
      `   [${r.classes.join(',')}]  ${r.media || '-'}`
  );
}
if (kept.length) {
  console.log('\n── KEEP — grouped declaration, live for at least one class');
  for (const k of kept.sort((a, b) => a.line - b.line)) {
    console.log(
      `  ${String(k.line).padStart(5)}  ${k.prop}: ${k.value.replace(/\s+/g, ' ').slice(0, 50)}`
    );
    console.log(`         dead for : ${k.deadFor.join(', ')}`);
    console.log(`         LIVE for : ${k.aliveFor.join(', ')}`);
  }
}
console.log(
  `\nlines to edit: ${removable
    .map((r) => r.line)
    .sort((a, b) => a - b)
    .join(' ')}`
);
