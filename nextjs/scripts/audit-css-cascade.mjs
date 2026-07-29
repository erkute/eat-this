/* Audit a CSS module for the failure class documented in MapControls.module.css:
   a later rule silently voiding an earlier one for the SAME class.
 *
 *   node scripts/audit-css-cascade.mjs app/components/map/MapDetails.module.css
 *
 * A declaration only kills another when it matches in the SAME context and
 * state (same descendant prefix, same :hover/:active/...) and wins the cascade.
 * Entries are therefore grouped by a context key — the selector with the
 * subject class normalised to `&` — and only compared inside a group, with
 * specificity breaking ties before source order. Without that grouping the
 * output is mostly noise: `:global([data-map-body]...) .x` outranks a later
 * plain `.x`, and `.x:hover` never competes with `.x` at all.
 *
 * Output is a LEAD, not a verdict. Confirm a finding against computed styles
 * before deleting anything — and when you fix one, pin the effective value in
 * mapCascade.test.ts so it cannot come back.
 */
import { readFileSync } from 'node:fs';
import postcss from 'postcss';

const file = process.argv[2];
const ast = postcss.parse(readFileSync(file, 'utf8'));

/** Specificity (a,b,c); :global() wraps real selectors and really does count. */
function specificity(sel) {
  let s = sel.replaceAll(/:global\(([^)]*)\)/g, '$1');
  s = s.replaceAll(/::[\w-]+/g, '');
  let a = 0;
  let b = 0;
  let c = 0;
  for (const _ of s.matchAll(/#[\w-]+/g)) a++;
  for (const _ of s.matchAll(/\.[\w-]+/g)) b++;
  for (const _ of s.matchAll(/\[[^\]]*\]/g)) b++;
  for (const _ of s.matchAll(/:(?!:)[\w-]+/g)) b++;
  for (const _ of s.matchAll(/(^|[\s>+~])([a-z][\w-]*)/gi)) c++;
  return [a, b, c];
}
const cmpSpec = (x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2];

const map = new Map(); // class -> prop -> entries[]
let order = 0;

ast.walkRules((rule) => {
  const atRules = [];
  let parent = rule.parent;
  while (parent && parent.type !== 'root') {
    if (parent.type === 'atrule') atRules.push(`@${parent.name} ${parent.params}`);
    parent = parent.parent;
  }
  const media = atRules.filter((a) => a.startsWith('@media')).join(' ');

  for (const sel of rule.selectors) {
    // Subject = last compound of the selector.
    const parts = sel.split(/\s+|>|\+|~/).filter(Boolean);
    const subject = parts[parts.length - 1] ?? '';
    const classes = [...subject.matchAll(/(?<!:global\()\.([\w-]+)/g)].map((m) => m[1]);
    if (!classes.length) continue;
    const spec = specificity(sel);

    for (const cls of classes) {
      // Context = the full selector with THIS class blanked out, so
      // `.x:hover`, `[data-v='detail'] .x` and `.x` land in different buckets.
      const contextKey = sel.replaceAll(new RegExp(`\\.${cls}(?![\\w-])`, 'g'), '&');
      rule.walkDecls((decl) => {
        if (!map.has(cls)) map.set(cls, new Map());
        const byProp = map.get(cls);
        if (!byProp.has(decl.prop)) byProp.set(decl.prop, []);
        byProp.get(decl.prop).push({
          value: decl.value.trim(),
          media,
          contextKey,
          spec,
          important: decl.important ?? false,
          line: decl.source?.start?.line,
          selector: sel.slice(0, 80),
          order: order++,
        });
      });
    }
  }
});

const RESET = /^(none|0|0px|normal|auto|unset|initial|transparent|revert)$/i;
const findings = [];

for (const [cls, byProp] of map) {
  for (const [prop, all] of byProp) {
    if (all.length < 2) continue;

    // 1. transition shorthand losing transform (the documented trap).
    const winner = [...all]
      .filter((e) => !e.media)
      .sort((x, y) => cmpSpec(x.spec, y.spec) || x.order - y.order)
      .pop();
    if (prop === 'transition' && winner) {
      const anyTransform = all.some((e) => /transform/.test(e.value));
      if (anyTransform && !/transform/.test(winner.value)) {
        findings.push({
          kind: 'transition shorthand drops transform',
          cls,
          prop,
          detail: `effective (line ${winner.line}) = "${winner.value}"`,
        });
      }
    }

    // Group by context+state; only compare like with like.
    const groups = new Map();
    for (const e of all) {
      if (!groups.has(e.contextKey)) groups.set(e.contextKey, []);
      groups.get(e.contextKey).push(e);
    }

    for (const [ctx, entries] of groups) {
      const plain = entries.filter((e) => !e.media);
      const scoped = entries.filter((e) => e.media);

      // 2. a reset landing after (and not below) a meaningful value.
      if (plain.length >= 2) {
        const last = plain[plain.length - 1];
        const killed = plain
          .slice(0, -1)
          .filter((e) => !RESET.test(e.value) && cmpSpec(last.spec, e.spec) >= 0 && !e.important);
        if (RESET.test(last.value) && killed.length) {
          findings.push({
            kind: 'reset overrides earlier value',
            cls,
            prop,
            detail: `${ctx} — line ${last.line} "${last.value}" kills ${killed
              .map((e) => `line ${e.line} "${e.value}"`)
              .join(', ')}`,
          });
        }
      }

      // 3. media-scoped value that a LATER, at-least-as-specific media-less
      //    block overrides — the responsive rule silently does nothing.
      for (const s of scoped) {
        const laterPlain = plain.find(
          (e) => e.order > s.order && cmpSpec(e.spec, s.spec) >= 0 && !s.important
        );
        if (laterPlain && laterPlain.value !== s.value) {
          findings.push({
            kind: 'media rule dead — later media-less rule wins',
            cls,
            prop,
            detail: `${s.media} line ${s.line} "${s.value}"  →  plain line ${laterPlain.line} "${laterPlain.value}"`,
          });
        }
      }
    }
  }
}

const seen = new Set();
const unique = findings.filter((f) => {
  const k = `${f.kind}|${f.cls}|${f.prop}|${f.detail}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

console.log(`${file}`);
console.log(`  classes: ${map.size}   findings: ${unique.length}\n`);
const byKind = new Map();
for (const f of unique) {
  if (!byKind.has(f.kind)) byKind.set(f.kind, []);
  byKind.get(f.kind).push(f);
}
for (const [kind, list] of byKind) {
  console.log(`── ${kind} (${list.length})`);
  for (const f of list) console.log(`   .${f.cls} { ${f.prop} }  ${f.detail}`);
  console.log('');
}
