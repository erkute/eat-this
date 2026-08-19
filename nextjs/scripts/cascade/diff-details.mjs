// Diff two MapDetails sweeps (joined-cell format). selftest-diff.mjs proves
// this can actually fail; run it after touching either file.

// Diff two MapDetails sweeps. Cells are joined value lists (U+0001 separator),
// so the property name for a differing index comes from the __props array the
// sweep stores alongside them.
import { readFileSync } from 'node:fs';

const SEP = '\u0001';
const load = (p) => {
  let v = JSON.parse(readFileSync(p, 'utf8'));
  if (typeof v === 'string') v = JSON.parse(v);
  return v;
};
const [aPath, bPath] = process.argv.slice(2);
const A = load(aPath);
const B = load(bPath);
// the sweep may or may not embed __props; fall back to the sidecar file
const props = [
  ...(A.__props ??
    JSON.parse(readFileSync(new URL('./props-details.json', import.meta.url), 'utf8'))),
  '@size',
];

let cells = 0;
const diffs = [];
for (const scen of Object.keys(A)) {
  if (scen === '__props') continue;
  for (const vp of Object.keys(A[scen])) {
    const sa = A[scen][vp].byState;
    const sb = B[scen]?.[vp]?.byState ?? {};
    for (const state of Object.keys(sa)) {
      for (const cls of Object.keys(sa[state])) {
        const va = sa[state][cls].split(SEP);
        const vb = (sb[state]?.[cls] ?? '').split(SEP);
        cells += va.length;
        for (let i = 0; i < va.length; i++) {
          if (va[i] === vb[i]) continue;
          diffs.push({ scen, vp, state, cls, prop: props[i] ?? `#${i}`, a: va[i], b: vb[i] });
        }
      }
    }
  }
}

console.log(`${aPath} -> ${bPath}`);
console.log(`  compared ${cells} cells, ${diffs.length} differ\n`);

const groups = new Map();
for (const d of diffs) {
  const k = `${d.cls}|${d.prop}|${d.a}|${d.b}`;
  if (!groups.has(k)) groups.set(k, { ...d, n: 0, vps: new Set(), scens: new Set() });
  const g = groups.get(k);
  g.n++;
  g.vps.add(d.vp);
  g.scens.add(d.scen);
}
const sorted = [...groups.values()].sort((x, y) => y.n - x.n);
for (const g of sorted.slice(0, 40)) {
  console.log(
    `.${g.cls} { ${g.prop} }  x${g.n}  [${[...g.scens].join(',')}]  vp=${[...g.vps].join(' ')}`
  );
  console.log(`    A: ${String(g.a).slice(0, 110)}`);
  console.log(`    B: ${String(g.b).slice(0, 110)}`);
}
if (sorted.length > 40) console.log(`... and ${sorted.length - 40} more groups`);
